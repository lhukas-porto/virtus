import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Share, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { getMedicationHTML } from '../services/medicationReport';
import { supabase } from '../services/supabase';

export const ReportsScreen = ({ navigation }: any) => {
    const { profile, session } = useAuth();
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('week');
    const [customStart, setCustomStart] = useState(new Date());
    const [customEnd, setCustomEnd] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [convLoading, setConvLoading] = useState(false);
    const [convReport, setConvReport] = useState<string | null>(null);
    const [showConvModal, setShowConvModal] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            let start = new Date();
            let end = new Date();

            if (period === 'day') {
                start = new Date(); // Hoje 00:00 (ajustado no service)
                end = new Date();
            } else if (period === 'week') {
                start = new Date();
                start.setDate(start.getDate() - 7);
                end = new Date();
            } else if (period === 'month') {
                start = new Date();
                start.setMonth(start.getMonth() - 1);
                end = new Date();
            } else {
                start = customStart;
                end = customEnd;
            }

            const userName = profile?.name || session?.user?.user_metadata?.name || session?.user?.email || 'Usuário';
            const html = await getMedicationHTML(userName, start, end);

            navigation.navigate('ReportPreview', {
                html,
                title: 'Relatório de Medicamentos'
            });

        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha ao gerar relatório.');
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date, type?: 'start' | 'end') => {
        if (type === 'start') setShowStartPicker(false);
        if (type === 'end') setShowEndPicker(false);

        if (event.type === 'set' && selectedDate) {
            if (type === 'start') setCustomStart(selectedDate);
            if (type === 'end') setCustomEnd(selectedDate);
        }
    };

    const generateConversationalReport = async () => {
        if (!session?.user?.id) return;
        setConvLoading(true);
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const userName = profile?.name || session?.user?.user_metadata?.name || 'Paciente';
            const firstName = userName.split(' ')[0];

            // Fetch medication reminders
            const { data: reminders } = await supabase
                .from('medication_reminders')
                .select('*, medications(*)')
                .eq('medications.profile_id', session.user.id);

            // Fetch logs last 7 days
            const { data: logs } = await supabase
                .from('medication_logs')
                .select('*')
                .eq('status', 'taken')
                .gte('taken_at', sevenDaysAgo.toISOString());

            // Fetch vitals last 7 days
            const { data: vitals } = await supabase
                .from('health_measurements')
                .select('*')
                .eq('profile_id', session.user.id)
                .gte('measured_at', sevenDaysAgo.toISOString())
                .order('measured_at', { ascending: false });

            const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

            // Build medications list
            const medNames = [...new Set((reminders || []).map((r: any) => r.medications?.name).filter(Boolean))];
            const totalLogs = logs?.length || 0;

            // Vitals averages
            let vitalsText = 'Não há registros de sinais vitais nesta semana.';
            if (vitals && vitals.length > 0) {
                const avgSys = Math.round(vitals.reduce((a: number, v: any) => a + v.systolic, 0) / vitals.length);
                const avgDia = Math.round(vitals.reduce((a: number, v: any) => a + v.diastolic, 0) / vitals.length);
                const withHR = vitals.filter((v: any) => v.heart_rate);
                const avgHR = withHR.length ? Math.round(withHR.reduce((a: number, v: any) => a + v.heart_rate, 0) / withHR.length) : null;
                const avgMoods = vitals.filter((v: any) => v.mood);
                const avgMood = avgMoods.length ? (avgMoods.reduce((a: number, v: any) => a + v.mood, 0) / avgMoods.length).toFixed(1) : null;
                vitalsText = `Pressão média: ${avgSys}x${avgDia} mmHg${avgHR ? `. Batimentos médios: ${avgHR} bpm` : ''}.${avgMood ? ` Bem-estar médio: ${avgMood}/5` : ''}`;
            }

            const report = `Relatório Semanal de Saúde — ${firstName}
${'='.repeat(40)}
Data: ${today}
Paciente: ${userName}

Olá, Doutor(a)!

Segue o resumo da última semana de ${firstName}:

💊 MEDICAMENTOS EM USO:
${medNames.length > 0 ? medNames.map(m => `• ${m}`).join('\n') : '• Nenhum medicamento cadastrado'}

📊 DOSES REGISTRADAS (7 dias):
${totalLogs} dose(s) confirmada(s) pelo usuário no app.

🩺 SINAIS VITAIS (média da semana):
${vitalsText}

💬 Este relatório foi gerado automaticamente pelo app Vitus — Assistente de Saúde.`;

            setConvReport(report);
            setShowConvModal(true);
        } catch (e: any) {
            Alert.alert('Erro', 'Não foi possível gerar o resumo.');
        } finally {
            setConvLoading(false);
        }
    };

    const handleShareReport = async () => {
        if (!convReport) return;
        try {
            await Share.share({ message: convReport, title: 'Relatório Vitus' });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Relatórios</Text>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.sectionTitle}>Selecione o Período</Text>

                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterChip, period === 'day' && styles.filterChipActive]}
                        onPress={() => setPeriod('day')}
                    >
                        <Text style={[styles.filterText, period === 'day' && styles.filterTextActive]}>Hoje</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, period === 'week' && styles.filterChipActive]}
                        onPress={() => setPeriod('week')}
                    >
                        <Text style={[styles.filterText, period === 'week' && styles.filterTextActive]}>7 Dias</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, period === 'month' && styles.filterChipActive]}
                        onPress={() => setPeriod('month')}
                    >
                        <Text style={[styles.filterText, period === 'month' && styles.filterTextActive]}>1 Mês</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, period === 'custom' && styles.filterChipActive]}
                        onPress={() => setPeriod('custom')}
                    >
                        <Text style={[styles.filterText, period === 'custom' && styles.filterTextActive]}>Personalizado</Text>
                    </TouchableOpacity>
                </View>

                {period === 'custom' && (
                    <View style={styles.dateRow}>
                        <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                            <Text style={styles.dateLabel}>De:</Text>
                            <Text style={styles.dateValue}>{customStart.toLocaleDateString()}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                            <Text style={styles.dateLabel}>Até:</Text>
                            <Text style={styles.dateValue}>{customEnd.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {(showStartPicker || showEndPicker) && (
                    <DateTimePicker
                        value={showStartPicker ? customStart : customEnd}
                        mode="date"
                        display="default"
                        onChange={(e, d) => onDateChange(e, d, showStartPicker ? 'start' : 'end')}
                    />
                )}

                <View style={styles.card}>
                    <Ionicons name="document-text-outline" size={48} color={theme.colors.primary} style={{ marginBottom: 16 }} />
                    <Text style={styles.cardTitle}>Relatório PDF</Text>
                    <Text style={styles.cardDesc}>
                        Gera um arquivo PDF contendo o histórico de todos os medicamentos tomados no período selecionado.
                    </Text>

                    <Button
                        title={loading ? "Gerando..." : "Gerar PDF"}
                        onPress={handleGenerate}
                        style={{ marginTop: 20, width: '100%' }}
                        disabled={loading}
                    />
                </View>
                <View style={[styles.card, { marginTop: 16 }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.colors.primary} style={{ marginBottom: 16 }} />
                    <Text style={styles.cardTitle}>Resumo para o Médico</Text>
                    <Text style={styles.cardDesc}>
                        Gera um texto em linguagem natural com seus medicamentos, doses confirmadas, pressão arterial média e bem-estar da última semana.
                    </Text>

                    <Button
                        title={convLoading ? "Gerando..." : "Gerar Resumo"}
                        onPress={generateConversationalReport}
                        style={{ marginTop: 20, width: '100%' }}
                        disabled={convLoading}
                    />
                </View>

            </ScrollView>

            {/* Modal do Relatório Conversacional */}
            <Modal visible={showConvModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowConvModal(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Resumo para o Médico</Text>
                        <TouchableOpacity onPress={() => setShowConvModal(false)}>
                            <Ionicons name="close" size={28} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                        <Text style={styles.reportText}>{convReport}</Text>
                    </ScrollView>
                    <View style={{ padding: 24 }}>
                        <Button title="Compartilhar" onPress={handleShareReport} icon="share-outline" />
                    </View>
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
    },
    container: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        marginBottom: 12,
        color: theme.colors.text,
    },
    filterContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary + '20',
        borderColor: theme.colors.primary,
    },
    filterText: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
    },
    filterTextActive: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },
    dateButton: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    dateLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.heading,
        marginBottom: 8,
    },
    cardDesc: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFF',
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
    },
    reportText: {
        fontSize: 15,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        lineHeight: 24,
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
});
