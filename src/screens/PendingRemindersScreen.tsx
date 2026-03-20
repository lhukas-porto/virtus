import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/Card';

export const PendingRemindersScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [reminders, setReminders] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchPending = async (date: Date) => {
        if (!session?.user?.id) return;
        setLoading(true);
        try {
            const dateStart = new Date(date);
            dateStart.setHours(0, 0, 0, 0);
            const dateEnd = new Date(date);
            dateEnd.setHours(23, 59, 59, 999);

            // 1. Fetch Reminders
            const { data: remData } = await supabase
                .from('medication_reminders')
                .select('*, medications(*)')
                .eq('medications.profile_id', session.user.id);

            // 2. Fetch Logs for that date to filter out taken
            const { data: logData } = await supabase
                .from('medication_logs')
                .select('*')
                .gte('taken_at', dateStart.toISOString())
                .lte('taken_at', dateEnd.toISOString());

            const pendingItems: any[] = [];

            remData?.forEach(rem => {
                const [h, m] = rem.reminder_time.split(':').map(Number);
                const freq = rem.frequency_hours || 24;
                const createdAt = new Date(rem.created_at);

                // Start calculation from the date the reminder was created
                let current = new Date(createdAt);
                current.setHours(h, m, 0, 0);

                // Advance current until it reaches or passes the selected date start
                while (current < dateStart) {
                    current = new Date(current.getTime() + freq * 3600000);
                }

                // Collect only valid slots within the 24h window of the selected date
                while (current <= dateEnd) {
                    const slotTime = new Date(current);

                    // Extra guard: only show if slot is truly >= creation time (not just creation date)
                    if (slotTime < createdAt) {
                        current = new Date(current.getTime() + freq * 3600000);
                        continue;
                    }

                    // Check if treatment duration is exceeded
                    if (rem.duration_days) {
                        const endTreat = new Date(createdAt);
                        endTreat.setDate(endTreat.getDate() + rem.duration_days);
                        endTreat.setHours(23, 59, 59, 999);
                        if (slotTime > endTreat) {
                            current = new Date(current.getTime() + freq * 3600000);
                            continue;
                        }
                    }

                    // Check if already taken in logs
                    const isTaken = logData?.some(l => {
                        if (l.reminder_id !== rem.id) return false;
                        const lTime = new Date(l.taken_at).getTime();
                        return Math.abs(lTime - slotTime.getTime()) < (freq * 3600000) / 2;
                    });

                    if (!isTaken) {
                        pendingItems.push({
                            id: `${rem.id}-${slotTime.getTime()}`,
                            medication: rem.medications,
                            time: slotTime,
                            original: rem
                        });
                    }
                    current = new Date(current.getTime() + freq * 3600000);
                }
            });

            pendingItems.sort((a, b) => a.time.getTime() - b.time.getTime());
            setReminders(pendingItems);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchPending(selectedDate);
    }, [selectedDate]);

    const changeDate = (days: number) => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + days);
        setSelectedDate(next);
    };

    const handleDelete = async (item: any) => {
        Alert.alert(
            "Gerenciar Alarme",
            `Deseja pular apenas esta dose de ${item.medication.name} ou cancelar toda a série futura?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Pular esta dose",
                    onPress: async () => {
                        const { error } = await supabase.from('medication_logs').insert([{
                            reminder_id: item.original.id,
                            medication_id: item.medication.id,
                            taken_at: item.time.toISOString(),
                            status: 'skipped'
                        }]);
                        if (!error) fetchPending(selectedDate);
                    }
                },
                {
                    text: "Parar tratamento (Todos)",
                    style: "destructive",
                    onPress: async () => {
                        // Desvincula logs e deleta o reminder
                        await supabase.from('medication_logs').update({ reminder_id: null }).eq('reminder_id', item.original.id);
                        const { error } = await supabase.from('medication_reminders').delete().eq('id', item.original.id);
                        if (!error) {
                            const { syncNotifications } = require('../services/notifications');
                            await syncNotifications();
                            fetchPending(selectedDate);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Próximas Doses</Text>
            </View>

            <View style={styles.datePicker}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                    <Text style={styles.dateText}>
                        {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </Text>
                    {selectedDate.toDateString() === new Date().toDateString() && (
                        <Text style={styles.todayLabel}>Hoje</Text>
                    )}
                </View>
                <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateBtn}>
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {reminders.length > 0 ? (
                        reminders.map(item => (
                            <Card key={item.id} style={styles.itemCard}>
                                <View style={styles.timeBadge}>
                                    <Text style={styles.timeText}>
                                        {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                <View style={styles.info}>
                                    <Text style={styles.medName}>{item.medication.name}</Text>
                                    <Text style={styles.dosage}>
                                        {item.original.dosage_quantity} {item.original.dosage_unit}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.trashBtn}>
                                    <Ionicons name="trash-outline" size={24} color={theme.colors.alert} />
                                </TouchableOpacity>
                            </Card>
                        ))
                    ) : (
                        <View style={styles.empty}>
                            <Ionicons name="checkmark-done-circle-outline" size={80} color={theme.colors.primary} />
                            <Text style={styles.emptyTitle}>Nenhuma dose pendente</Text>
                            <Text style={styles.emptySubtitle}>Tudo certo para este dia!</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backButton: { marginRight: 16 },
    title: { fontSize: 20, fontFamily: theme.fonts.heading, color: theme.colors.text },
    datePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF' },
    dateBtn: { padding: 10 },
    dateDisplay: { alignItems: 'center' },
    dateText: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.text },
    todayLabel: { fontSize: 12, color: theme.colors.primary, fontFamily: theme.fonts.bold, textTransform: 'uppercase' },
    list: { padding: 20 },
    itemCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 },
    timeBadge: { backgroundColor: theme.colors.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 16 },
    timeText: { fontSize: 16, fontFamily: theme.fonts.bold, color: theme.colors.primary },
    info: { flex: 1 },
    medName: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.text },
    dosage: { fontSize: 14, fontFamily: theme.fonts.body, color: theme.colors.text, opacity: 0.6 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', marginTop: 100, opacity: 0.5 },
    emptyTitle: { fontSize: 20, fontFamily: theme.fonts.bold, marginTop: 16 },
    emptySubtitle: { fontSize: 16, fontFamily: theme.fonts.body },
    trashBtn: { padding: 8, marginLeft: 8 },
});
