import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, SafeAreaView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { generateHealthReport, exportHealthCSV } from '../services/reports';

export const HealthLogScreen = () => {
    const { session, profile } = useAuth();
    const navigation = useNavigation();
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const userName = profile?.name || session?.user?.user_metadata?.name || 'Vitus';

    const fetchHistory = async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('health_measurements')
                .select('*')
                .eq('profile_id', session.user.id)
                .order('measured_at', { ascending: false })
                .limit(10);

            if (data) setHistory(data);
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao buscar histórico:', e);
        } finally {
            setFetching(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchHistory();
        }, [session])
    );

    const handleSave = async () => {
        if (!systolic || !diastolic) {
            if (Platform.OS === 'web') window.alert('Por favor, preencha a pressão arterial.');
            else Alert.alert('Ops!', 'Por favor, preencha a pressão arterial.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('health_measurements').insert([
                {
                    profile_id: session?.user?.id,
                    systolic: parseInt(systolic),
                    diastolic: parseInt(diastolic),
                    heart_rate: heartRate ? parseInt(heartRate) : null,
                },
            ]);

            if (error) throw error;

            if (Platform.OS === 'web') window.alert('Medição salva com sucesso! 🌿');
            else Alert.alert('Sucesso!', 'Sua medição foi registrada.');

            setSystolic('');
            setDiastolic('');
            setHeartRate('');
            fetchHistory();
        } catch (error: any) {
            if (Platform.OS === 'web') window.alert('Erro ao salvar: ' + error.message);
            else Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (history.length === 0) {
            Alert.alert('Sem dados', 'Você precisa de pelo menos um registro para gerar o relatório.');
            return;
        }
        try {
            await generateHealthReport(userName, history);
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível gerar o PDF.');
        }
    };

    const handleExportCSV = async () => {
        if (history.length === 0) {
            Alert.alert('Sem dados', 'Você precisa de pelo menos um registro para exportar.');
            return;
        }
        try {
            await exportHealthCSV(history);
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível exportar os dados.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Minha Saúde 🩺</Text>
                        <Text style={styles.subtitle}>Como estão seus sinais hoje?</Text>
                    </View>

                    <Card style={styles.mainCard}>
                        <View style={styles.inputSection}>
                            <Text style={styles.sectionLabel}>Pressão Arterial</Text>
                            <View style={styles.pressureRow}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.largeInput}
                                        value={systolic}
                                        onChangeText={setSystolic}
                                        placeholder="120"
                                        keyboardType="numeric"
                                        maxLength={3}
                                    />
                                    <Text style={styles.unitLabel}>Sistólica</Text>
                                </View>
                                <Text style={styles.separator}>/</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.largeInput}
                                        value={diastolic}
                                        onChangeText={setDiastolic}
                                        placeholder="80"
                                        keyboardType="numeric"
                                        maxLength={3}
                                    />
                                    <Text style={styles.unitLabel}>Diastólica</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputSection}>
                            <Text style={styles.sectionLabel}>Batimentos (BPM)</Text>
                            <View style={styles.heartRateContainer}>
                                <Ionicons name="heart" size={24} color={theme.colors.alert} style={{ marginRight: 12 }} />
                                <TextInput
                                    style={styles.midInput}
                                    value={heartRate}
                                    onChangeText={setHeartRate}
                                    placeholder="75"
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.unitInline}>bpm</Text>
                            </View>
                        </View>
                    </Card>

                    <Button
                        title={loading ? "Salvando..." : "Registrar Agora"}
                        onPress={handleSave}
                        style={styles.saveButton}
                    />

                    {/* Report Actions */}
                    <View style={styles.reportActions}>
                        <TouchableOpacity
                            style={styles.reportRow}
                            onPress={handleGenerateReport}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
                            <Text style={styles.reportLink}>Relatório PDF</Text>
                        </TouchableOpacity>

                        <View style={styles.actionDivider} />

                        <TouchableOpacity
                            style={styles.reportRow}
                            onPress={handleExportCSV}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="grid-outline" size={22} color={theme.colors.primary} />
                            <Text style={styles.reportLink}>Exportar Excel</Text>
                        </TouchableOpacity>
                    </View>

                    {/* History Section */}
                    <View style={styles.historySection}>
                        <Text style={styles.historyTitle}>Últimos Registros</Text>
                        {fetching ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : history.length > 0 ? (
                            history.map((item) => (
                                <View key={item.id} style={styles.historyItem}>
                                    <View style={styles.historyDateBox}>
                                        <Text style={styles.historyDay}>{new Date(item.measured_at).getDate()}</Text>
                                        <Text style={styles.historyMonth}>
                                            {new Date(item.measured_at).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.historyContent}>
                                        <Text style={styles.historyPA}>{item.systolic}/{item.diastolic} mmHg</Text>
                                        <Text style={styles.historySub}>
                                            <Ionicons name="heart-outline" size={14} /> {item.heart_rate || '--'} bpm • {new Date(item.measured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyHistory}>Ainda não há registros de saúde.</Text>
                        )}
                    </View>

                    <Text style={styles.infoText}>
                        Seus dados são salvos de forma segura para acompanhamento médico. 🔒
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        padding: 24,
    },
    header: {
        marginBottom: 32,
        marginTop: 10,
    },
    title: {
        fontSize: 32,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
    },
    subtitle: {
        fontSize: 18,
        color: theme.colors.text,
        opacity: 0.6,
        fontFamily: theme.fonts.body,
        marginTop: 4,
    },
    mainCard: {
        padding: 24,
        backgroundColor: theme.colors.surface,
        marginBottom: 16,
    },
    inputSection: {
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 20,
    },
    pressureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputWrapper: {
        alignItems: 'center',
    },
    largeInput: {
        fontSize: 48,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        textAlign: 'center',
        minWidth: 80,
    },
    unitLabel: {
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.4,
        textTransform: 'uppercase',
    },
    separator: {
        fontSize: 40,
        color: theme.colors.border,
        marginHorizontal: 15,
        fontFamily: theme.fonts.body,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        width: '100%',
        marginVertical: 24,
        opacity: 0.5,
    },
    heartRateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
    },
    midInput: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        minWidth: 50,
        textAlign: 'center',
    },
    unitInline: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginLeft: 8,
    },
    saveButton: {
        marginTop: 12,
    },
    reportActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F7F0',
        borderRadius: 16,
        paddingVertical: 8,
        marginTop: 24,
        marginBottom: 12,
    },
    actionDivider: {
        width: 1,
        height: 20,
        backgroundColor: theme.colors.primary,
        opacity: 0.2,
        marginHorizontal: 15,
    },
    reportRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
    },
    reportLink: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
        fontSize: 15,
    },
    historySection: {
        marginTop: 32,
        marginBottom: 20,
    },
    historyTitle: {
        fontSize: 22,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        marginBottom: 16,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    historyDateBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    historyDay: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    },
    historyMonth: {
        fontSize: 10,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        marginTop: -2,
    },
    historyContent: {
        flex: 1,
    },
    historyPA: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    historySub: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginTop: 2,
    },
    emptyHistory: {
        textAlign: 'center',
        color: theme.colors.text,
        opacity: 0.4,
        fontFamily: theme.fonts.body,
        marginTop: 20,
    },
    infoText: {
        textAlign: 'center',
        fontSize: 14,
        color: theme.colors.text,
        opacity: 0.4,
        marginTop: 24,
        marginBottom: 40,
        fontFamily: theme.fonts.body,
    }
});
