import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { scheduleMedicationReminder } from '../services/notifications';

const FREQUENCIES = [
    { label: 'Diário (24h)', value: 24, icon: 'sunny-outline' },
    { label: '12 em 12h', value: 12, icon: 'repeat-outline' },
    { label: '8 em 8h', value: 8, icon: 'timer-outline' },
    { label: '6 em 6h', value: 6, icon: 'hourglass-outline' },
    { label: '4 em 4h', value: 4, icon: 'alarm-outline' }
];

export const AlarmConfigScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { medicationId, medicationName } = route.params;

    const [loading, setLoading] = useState(false);
    const [selectedFreq, setSelectedFreq] = useState(24);

    // Initialize with current time
    const now = new Date();
    const initialTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const [startTime, setStartTime] = useState(initialTime);

    // Calcular horários previstos
    const projectedTimes = useMemo(() => {
        const times: string[] = [];
        const [hStr, mStr] = startTime.split(':');
        let startH = parseInt(hStr || '8', 10);
        let startM = parseInt(mStr || '0', 10);

        if (isNaN(startH)) startH = 8;
        if (isNaN(startM)) startM = 0;

        // Limita a 24h cycle para visualização (max steps = 24 / freq)
        const cycles = Math.floor(24 / selectedFreq);

        for (let i = 0; i < cycles; i++) {
            let nextH = (startH + (i * selectedFreq)) % 24;
            times.push(`${String(nextH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`);
        }
        return times.sort();
    }, [startTime, selectedFreq]);

    const handleTimeChange = (text: string) => {
        let cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length > 4) cleaned = cleaned.slice(0, 4);
        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
        }
        setStartTime(formatted);
    };

    const handleSaveAlarm = async () => {
        if (!startTime || startTime.length < 5) {
            Alert.alert('Ops', 'Informe um horário válido (HH:MM).');
            return;
        }

        setLoading(true);
        try {
            // 1. Salvar no Supabase
            const { data, error } = await supabase
                .from('medication_reminders')
                .insert([{
                    medication_id: medicationId,
                    reminder_time: startTime + ':00',
                    frequency_hours: selectedFreq
                }])
                .select()
                .single();

            if (error) throw error;

            // 2. Agendar notificações locais
            // Para cada horário calculado, agendar.
            // O serviço 'scheduleMedicationReminder' atualmente suporta apenas 1 horário diário.
            // Precisamos iterar.

            const promises = projectedTimes.map(time => {
                return scheduleMedicationReminder(medicationName, time, data.id, medicationId);
            });

            await Promise.all(promises);

            Alert.alert('Sucesso', 'Alarmes configurados!', [
                {
                    text: 'OK',
                    onPress: () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Main' }],
                        });
                    }
                }
            ]);

        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao salvar alarme.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Novo Alarme</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.label}>Medicamento</Text>
                <Text style={styles.medName}>{medicationName}</Text>

                <Text style={styles.sectionTitle}>1. Horário Inicial</Text>
                <View style={styles.timeInputContainer}>
                    <TextInput
                        style={styles.timeInput}
                        value={startTime}
                        onChangeText={handleTimeChange}
                        placeholder="08:00"
                        keyboardType="number-pad"
                        maxLength={5}
                    />
                    <Ionicons name="time-outline" size={24} color={theme.colors.text} style={{ opacity: 0.5 }} />
                </View>

                <Text style={styles.sectionTitle}>2. Frequência</Text>
                <View style={styles.freqGrid}>
                    {FREQUENCIES.map(freq => (
                        <TouchableOpacity
                            key={freq.value}
                            style={[
                                styles.freqCard,
                                selectedFreq === freq.value && styles.freqCardActive
                            ]}
                            onPress={() => setSelectedFreq(freq.value)}
                        >
                            <Ionicons
                                name={freq.icon as any}
                                size={28}
                                color={selectedFreq === freq.value ? '#FFF' : theme.colors.primary}
                            />
                            <Text style={[
                                styles.freqLabel,
                                selectedFreq === freq.value && styles.freqLabelActive
                            ]}>
                                {freq.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.previewContainer}>
                    <Text style={styles.previewTitle}>Resumo dos Horários:</Text>
                    <View style={styles.timesList}>
                        {projectedTimes.map((t, i) => (
                            <View key={i} style={styles.timeChip}>
                                <Ionicons name="alarm" size={14} color={theme.colors.primary} />
                                <Text style={styles.timeChipText}>{t}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Button
                    title="Confirmar Alarme"
                    onPress={handleSaveAlarm}
                    loading={loading}
                    style={{ marginTop: 20 }}
                />
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
    content: {
        padding: 24,
    },
    label: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.5,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    medName: {
        fontSize: 24,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 16,
        marginTop: 8,
    },
    timeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 32,
    },
    timeInput: {
        flex: 1,
        fontSize: 32,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        paddingVertical: 16,
    },
    freqGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
    },
    freqCard: {
        width: '48%',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        gap: 8,
    },
    freqCardActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    freqLabel: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        textAlign: 'center',
    },
    freqLabelActive: {
        color: '#FFF',
        fontFamily: theme.fonts.bold,
    },
    previewContainer: {
        backgroundColor: theme.colors.surface,
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
    },
    previewTitle: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 12,
        opacity: 0.7,
    },
    timesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    timeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.primary + '20',
    },
    timeChipText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
});
