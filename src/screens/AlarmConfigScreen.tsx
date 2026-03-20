import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, DeviceEventEmitter, Platform, Alert } from 'react-native';
import { showAlert } from '../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { scheduleMedicationReminder, syncNotifications } from '../services/notifications';

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
    const { medicationId, medicationName, reminder, slotTime } = route.params;
    const isEditing = !!reminder;

    const [loading, setLoading] = useState(false);
    const [selectedFreq, setSelectedFreq] = useState(reminder?.frequency_hours || 24);

    // Initialize with slotTime (if editing specific instance), reminder time, or current time
    const getInitialTime = () => {
        if (slotTime) {
            const d = new Date(slotTime);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
        if (reminder) {
            return reminder.reminder_time.slice(0, 5);
        }
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const [startTime, setStartTime] = useState(getInitialTime());
    const [dosageQuantity, setDosageQuantity] = useState(reminder?.dosage_quantity?.toString() || '');
    const [dosageUnit, setDosageUnit] = useState(reminder?.dosage_unit || 'comprimido(s)');
    const [durationDays, setDurationDays] = useState(reminder?.duration_days?.toString() || '');

    // Calcular horários previstos
    const projectedTimes = useMemo(() => {
        const times: string[] = [];
        const [hStr, mStr] = startTime.split(':');
        let startH = parseInt(hStr || '8', 10);
        let startM = parseInt(mStr || '0', 10);

        if (isNaN(startH)) startH = 8;
        if (isNaN(startM)) startM = 0;

        // Limita a 24h cycle para visualização (max steps = 24 / freq)
        const freq = selectedFreq > 0 ? selectedFreq : 24;
        const cycles = Math.floor(24 / freq);

        for (let i = 0; i < cycles; i++) {
            let nextH = (startH + (i * freq)) % 24;
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

    const handleSave = async () => {
        const [h, m] = startTime.split(':').map(Number);
        const now = new Date();
        const alarmTime = new Date();
        alarmTime.setHours(h, m, 0, 0);

        if (alarmTime < now && !isEditing) {
            Alert.alert(
                "Horário já passou",
                "Você definiu um horário que já passou hoje. O que deseja fazer?",
                [
                    { text: "Corrigir Horário", style: "cancel" },
                    {
                        text: "Marcar como já tomado hoje",
                        onPress: async () => {
                            await performSave(true);
                        }
                    },
                    {
                        text: "Apenas agendar próximos",
                        onPress: async () => {
                            await performSave(false);
                        }
                    }
                ]
            );
        } else {
            await performSave(false);
        }
    };

    const performSave = async (alreadyTakenToday: boolean) => {
        setLoading(true);
        try {
            let savedReminderId = '';

            if (isEditing) {
                // UPDATE
                const { data, error } = await supabase
                    .from('medication_reminders')
                    .update({
                        reminder_time: startTime + ':00',
                        frequency_hours: selectedFreq,
                        dosage_quantity: dosageQuantity ? parseFloat(dosageQuantity) : null,
                        dosage_unit: dosageUnit,
                        duration_days: durationDays ? parseInt(durationDays, 10) : null
                    })
                    .eq('id', reminder.reminderId || reminder.id)
                    .select();

                if (error) throw error;

                if (!data || data.length === 0) {
                    showAlert('Erro', 'Registro original não encontrado. A atualização falhou.');
                    return;
                }
                savedReminderId = data[0].id;
            } else {
                // INSERT
                const { data, error } = await supabase
                    .from('medication_reminders')
                    .insert([{
                        medication_id: medicationId,
                        reminder_time: startTime + ':00',
                        frequency_hours: selectedFreq,
                        dosage_quantity: dosageQuantity ? parseFloat(dosageQuantity) : null,
                        dosage_unit: dosageUnit,
                        duration_days: durationDays ? parseInt(durationDays, 10) : null
                    }])
                    .select();

                if (error) throw error;
                savedReminderId = data?.[0]?.id;

                // Log as taken today if requested
                if (alreadyTakenToday && savedReminderId) {
                    await supabase.from('medication_logs').insert([{
                        reminder_id: savedReminderId,
                        medication_id: medicationId,
                        taken_at: new Date().toISOString(),
                        status: 'taken'
                    }]);
                }
            }

            // Sync all notifications (safe approach)
            await syncNotifications();

            showAlert('Sucesso', 'Alarme salvo!', [
                {
                    text: 'OK',
                    onPress: () => {
                        DeviceEventEmitter.emit('event.refreshAgenda');
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Main', params: { refreshTimestamp: Date.now() } }],
                        });
                    }
                }
            ]);

        } catch (error: any) {
            console.error(error);
            showAlert('Erro', 'Falha ao salvar alarme.');
        } finally {
            setLoading(false);
        }
    };

    const performSaveOnlyFuture = async () => {
        if (!slotTime) return handleSave();

        setLoading(true);
        try {
            // 1. Delete original reminder series
            await supabase.from('medication_reminders').delete().eq('id', reminder.id);

            // 2. Create new reminder series starting from the NEW slotTime
            const { error } = await supabase
                .from('medication_reminders')
                .insert([{
                    medication_id: medicationId,
                    reminder_time: startTime + ':00',
                    frequency_hours: selectedFreq,
                    dosage_quantity: dosageQuantity ? parseFloat(dosageQuantity) : null,
                    dosage_unit: dosageUnit,
                    duration_days: durationDays ? parseInt(durationDays, 10) : null
                }]);

            if (error) throw error;

            await syncNotifications();

            showAlert('Sucesso', 'Horários atualizados daqui para frente!', [
                {
                    text: 'OK',
                    onPress: () => {
                        DeviceEventEmitter.emit('event.refreshAgenda');
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Main', params: { refreshTimestamp: Date.now() } }],
                        });
                    }
                }
            ]);
        } catch (error) {
            console.error(error);
            showAlert('Erro', 'Falha ao atualizar horários.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAlarm = async () => {
        if (!startTime || startTime.length < 5) {
            showAlert('Ops', 'Informe um horário válido (HH:MM).');
            return;
        }

        const [h, m] = startTime.split(':').map(Number);
        const now = new Date();
        const alarmTime = new Date();
        alarmTime.setHours(h, m, 0, 0);

        if (alarmTime < now && !isEditing) {
            Alert.alert(
                'Horário no Passado ⏰',
                'Você escolheu um horário que já passou hoje. Como deseja prosseguir?',
                [
                    {
                        text: 'Corrigir para Agora',
                        onPress: () => {
                            const newNow = new Date();
                            setStartTime(`${String(newNow.getHours()).padStart(2, '0')}:${String(newNow.getMinutes()).padStart(2, '0')}`);
                        }
                    },
                    {
                        text: 'Marcar como Já Tomado',
                        onPress: () => performSave(true)
                    },
                    {
                        text: 'Ignorar Dose de Hoje',
                        onPress: () => performSave(false)
                    },
                    { text: 'Cancelar', style: 'cancel' }
                ]
            );
            return;
        }

        if (selectedFreq <= 0) {
            showAlert('Ops', 'Informe uma frequência maior que zero.');
            return;
        }

        if (isEditing) {
            if (Platform.OS === 'web') {
                performSaveOnlyFuture();
            } else {
                showAlert(
                    'Editar Alarme',
                    'Deseja aplicar esta nova hora para este evento e todos os próximos horários da série?',
                    [
                        { text: 'Sim, aplicar para todos', onPress: performSaveOnlyFuture },
                        { text: 'Apenas salvar como padrão', onPress: () => performSave(false) },
                        { text: 'Cancelar', style: 'cancel' }
                    ]
                );
            }
        } else {
            handleSave();
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

                <Text style={styles.sectionTitle}>2. Frequência (em horas)</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="repeat-outline" size={24} color={theme.colors.primary} style={{ marginRight: 12, opacity: 0.5 }} />
                    <TextInput
                        style={styles.input}
                        value={selectedFreq.toString()}
                        onChangeText={(val) => {
                            const num = parseInt(val, 10);
                            setSelectedFreq(isNaN(num) ? 0 : num);
                        }}
                        placeholder="Ex: 8"
                        keyboardType="numeric"
                    />
                    <Text style={{ fontFamily: theme.fonts.bold, opacity: 0.5, marginLeft: 8 }}>horas</Text>
                </View>

                <Text style={styles.sectionTitle}>3. Dosagem</Text>
                <View style={styles.row}>
                    <View style={[styles.inputContainer, { flex: 1 }]}>
                        <TextInput
                            style={styles.input}
                            value={dosageQuantity}
                            onChangeText={setDosageQuantity}
                            placeholder="Qtd (ex: 1)"
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.unitToggleContainer}>
                        <TouchableOpacity
                            style={[styles.unitBtn, dosageUnit === 'gota(s)' && styles.unitBtnActive]}
                            onPress={() => setDosageUnit('gota(s)')}
                        >
                            <Text style={[styles.unitBtnText, dosageUnit === 'gota(s)' && styles.unitBtnTextActive]}>Gota(s)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.unitBtn, dosageUnit === 'comprimido(s)' && styles.unitBtnActive]}
                            onPress={() => setDosageUnit('comprimido(s)')}
                        >
                            <Text style={[styles.unitBtnText, dosageUnit === 'comprimido(s)' && styles.unitBtnTextActive]}>Comprimido(s)</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>4. Duração do Tratamento</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={durationDays}
                        onChangeText={setDurationDays}
                        placeholder="Ex: 7 dias (vazio para contínuo)"
                        keyboardType="numeric"
                    />
                    <Text style={{ fontFamily: theme.fonts.bold, opacity: 0.5 }}>Dias</Text>
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
        elevation: 4,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    freqLabel: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        textAlign: 'center',
    },
    freqLabelActive: {
        color: '#FFF',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        paddingVertical: 14,
    },
    unitToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F0F0F0',
        borderRadius: 12,
        padding: 4,
        height: 54,
        marginTop: 0,
    },
    unitBtn: {
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRadius: 10,
    },
    unitBtnActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    unitBtnText: {
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.5,
    },
    unitBtnTextActive: {
        opacity: 1,
        color: theme.colors.primary,
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
