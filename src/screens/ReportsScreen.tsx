import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { generateMedicationPDF } from '../services/medicationReport';

export const ReportsScreen = ({ navigation }: any) => {
    const { profile, session } = useAuth();
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('week');
    const [customStart, setCustomStart] = useState(new Date());
    const [customEnd, setCustomEnd] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [loading, setLoading] = useState(false);

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

            const userName = profile?.name || session?.user?.email || 'Usuário';
            await generateMedicationPDF(userName, start, end);

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

            </ScrollView>
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
    }
});
