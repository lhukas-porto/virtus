import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, DeviceEventEmitter, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Button } from '../components/Button';
import { syncNotifications } from '../services/notifications';
import { Swipeable } from 'react-native-gesture-handler';

export const HomeScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const [agendaItems, setAgendaItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [hiddenItems, setHiddenItems] = useState<string[]>([]);

    const fetchAgenda = async () => {
        if (!session?.user?.id) return;
        try {
            setLoading(true);

            // Get user info
            const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', session.user.id)
                .single();

            if (profile?.name) {
                setUserName(profile.name.split(' ')[0]);
            } else if (session?.user?.user_metadata?.name) {
                setUserName(session.user.user_metadata.name.split(' ')[0]);
            } else {
                setUserName('Usuário');
            }

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // 1. Fetch Reminders
            const { data: reminders, error: remError } = await supabase
                .from('medication_reminders')
                .select(`
                    *,
                    medications!inner (*)
                `)
                .eq('medications.profile_id', session.user.id);

            if (remError) throw remError;

            // 2. Fetch Today's Logs
            const { data: logs, error: logError } = await supabase
                .from('medication_logs')
                .select('*')
                .eq('status', 'taken')
                .gte('taken_at', todayStart.toISOString());

            if (logError) throw logError;

            // 3. Generate Daily Schedule
            const generatedItems: any[] = [];

            reminders?.forEach((rem: any) => {
                if (!rem.medications) return;

                // Check treatment duration
                if (rem.duration_days && rem.created_at) {
                    const start = new Date(rem.created_at);
                    const endTreat = new Date(start);
                    endTreat.setDate(endTreat.getDate() + rem.duration_days);
                    endTreat.setHours(23, 59, 59, 999);

                    if (todayStart > endTreat) return; // Treatment finished
                }

                const [h, m] = rem.reminder_time.slice(0, 5).split(':').map(Number);
                const endOfToday = new Date(todayStart);
                endOfToday.setHours(23, 59, 59, 999);

                // Start from reminder_time today
                let current = new Date(todayStart);
                current.setHours(h, m, 0, 0);

                const freq = rem.frequency_hours || 24;

                // Backtrack current until start of today
                while (current > todayStart) {
                    current = new Date(current.getTime() - freq * 60 * 60 * 1000);
                }
                // Advance to first valid slot today
                while (current < todayStart) {
                    current = new Date(current.getTime() + freq * 60 * 60 * 1000);
                }

                while (current <= endOfToday) {
                    const slotTime = new Date(current);

                    // CRITICAL: Only items from the SAME day as todayStart
                    if (slotTime.toDateString() !== todayStart.toDateString()) {
                        current = new Date(current.getTime() + freq * 60 * 60 * 1000);
                        continue;
                    }

                    const windowMs = (freq * 60 * 60 * 1000) / 2;

                    const matchedLog = logs?.find(l => {
                        if (l.reminder_id !== rem.id) return false;
                        const logTime = new Date(l.taken_at).getTime();
                        return Math.abs(logTime - slotTime.getTime()) < windowMs;
                    });

                    let finalLog = matchedLog;
                    if (!finalLog && freq >= 20) {
                        finalLog = logs?.find(l => l.reminder_id === rem.id);
                    }

                    generatedItems.push({
                        id: rem.id + '-' + slotTime.toISOString(),
                        reminderId: rem.id,
                        medication: rem.medications,
                        time: slotTime,
                        log: finalLog,
                        status: finalLog ? finalLog.status : 'pending',
                        original: rem
                    });

                    current = new Date(current.getTime() + freq * 60 * 60 * 1000);
                }
            });

            generatedItems.sort((a, b) => a.time.getTime() - b.time.getTime());
            setAgendaItems(generatedItems);

        } catch (error) {
            console.error('Error fetching agenda:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReload = () => {
        // Identifica quais itens da agenda atual estão marcados como ocultos
        const hiddenInAgenda = agendaItems.filter(item => hiddenItems.includes(item.id));

        // Pega apenas os 5 últimos (mais recentes no tempo) para mostrar de volta
        const toShowAgain = hiddenInAgenda.slice(-5).map(it => it.id);

        // Remove apenas esses 5 da lista de ocultos
        setHiddenItems(prev => prev.filter(id => !toShowAgain.includes(id)));

        fetchAgenda();
    };

    const showFutureSchedule = (item: any) => {
        const freq = item.original.frequency_hours || 24;
        const futureTimes: string[] = [];

        const now = new Date();
        const endOfTomorrow = new Date(now);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
        endOfTomorrow.setHours(23, 59, 59, 999);

        let current = new Date(item.time.getTime() + freq * 60 * 60 * 1000);

        while (current <= endOfTomorrow) {
            if (current > now) {
                const dayLabel = current.getDate() === now.getDate() ? 'Hoje' : 'Amanhã';
                futureTimes.push(`• ${dayLabel} às ${current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
            }
            current = new Date(current.getTime() + freq * 60 * 60 * 1000);
            if (futureTimes.length >= 8) break;
        }

        if (futureTimes.length === 0) {
            Alert.alert(
                item.medication.name,
                "Uso finalizado ou sem novas doses previstas para as próximas 24h."
            );
        } else {
            Alert.alert(
                `Próximas Doses: ${item.medication.name}`,
                `Confira seus próximos horários:\n\n${futureTimes.join('\n')}`,
                [{ text: 'OK', style: 'default' }]
            );
        }
    };

    const handleCheck = async (item: any) => {
        if (item.status === 'taken') return;

        try {
            const { error } = await supabase.from('medication_logs').insert([{
                reminder_id: item.reminderId,
                medication_id: item.medication.id,
                taken_at: new Date().toISOString(),
                status: 'taken'
            }]);

            if (error) throw error;
            fetchAgenda();
        } catch (e) {
            Alert.alert('Erro', 'Falha ao registrar.');
        }
    };

    const handleDeleteReminder = async (reminderId: string) => {
        Alert.alert('Cancelar Alarme', 'Deseja cancelar o alarme atual e todos os seguintes para este medicamento?', [
            { text: 'Não' },
            {
                text: 'Sim, Cancelar',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await supabase.from('medication_reminders').delete().eq('id', reminderId);
                    if (!error) {
                        await syncNotifications();
                        fetchAgenda();
                    }
                }
            }
        ]);
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchAgenda();
        }, [session, route?.params?.refreshTimestamp])
    );

    React.useEffect(() => {
        const sub = DeviceEventEmitter.addListener('event.refreshAgenda', fetchAgenda);
        const subTaken = DeviceEventEmitter.addListener('event.medicationTaken', fetchAgenda);
        return () => {
            sub.remove();
            subTaken.remove();
        };
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Olá,</Text>
                        <Text style={styles.userName}>{userName}!</Text>
                    </View>
                    <TouchableOpacity style={styles.profileChip} onPress={() => navigation.navigate('Profile')}>
                        {session?.user?.user_metadata?.avatar_url ? (
                            <Image
                                source={{ uri: session?.user?.user_metadata?.avatar_url }}
                                style={{ width: 42, height: 42, borderRadius: 21 }}
                            />
                        ) : (
                            <Ionicons name="person-circle" size={42} color={theme.colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { flex: 1 }]}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.sectionTitle}>Agenda de Hoje</Text>
                            <View style={styles.calendarIconWrapper}>
                                <View style={styles.calendarIconTop} />
                                <View style={styles.calendarIconBody}>
                                    <Text style={styles.calendarIconText}>{new Date().getDate()}</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={handleReload}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {agendaItems.filter(item => !hiddenItems.includes(item.id)).length > 0 ? (
                        agendaItems.map((item) => {
                            if (hiddenItems.includes(item.id)) return null;
                            const isTaken = item.status === 'taken';
                            const displayTime = isTaken && item.log ? new Date(item.log.taken_at) : item.time;

                            return (
                                <Swipeable
                                    key={item.id}
                                    enabled={isTaken}
                                    containerStyle={{ marginBottom: 12 }}
                                    renderRightActions={() => (
                                        <View style={styles.swipeDeleteAction}>
                                            <Ionicons name="eye-off-outline" size={24} color="#FFF" />
                                            <Text style={styles.swipeActionText}>Ocultar</Text>
                                        </View>
                                    )}
                                    overshootRight={false}
                                    onSwipeableOpen={(direction) => {
                                        if (direction === 'right') {
                                            setHiddenItems(prev => [...prev, item.id]);
                                        }
                                    }}
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={() => isTaken ? showFutureSchedule(item) : handleCheck(item)}
                                    >
                                        <Card style={styles.agendaCard}>
                                            <View style={styles.agendaInfo}>
                                                <View style={[styles.timeBox, isTaken && styles.timeBoxTaken]}>
                                                    <Text style={[styles.timeText, isTaken && { color: '#FFF' }]}>
                                                        {displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                </View>

                                                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                                                    <Text style={[styles.agendaMedName, isTaken && { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                                                        {item.medication.name}
                                                    </Text>
                                                    {item.original.dosage_quantity && (
                                                        <Text style={styles.agendaDosage}>
                                                            {item.original.dosage_quantity} {item.original.dosage_unit}
                                                            {item.original.duration_days ? ` por ${item.original.duration_days} dias` : ' (Uso contínuo)'}
                                                        </Text>
                                                    )}
                                                </View>

                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <TouchableOpacity
                                                        style={[styles.checkCircle, isTaken && styles.checkCircleActive]}
                                                        onPress={() => handleCheck(item)}
                                                        disabled={isTaken}
                                                    >
                                                        <Ionicons
                                                            name={isTaken ? "checkmark" : "ellipse-outline"}
                                                            size={24}
                                                            color={isTaken ? "#FFF" : theme.colors.primary}
                                                        />
                                                    </TouchableOpacity>

                                                    {!isTaken && (
                                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                                            <TouchableOpacity
                                                                style={styles.optionBtn}
                                                                onPress={() => navigation.navigate('AlarmConfig', {
                                                                    reminder: item.original,
                                                                    medicationId: item.medication.id,
                                                                    medicationName: item.medication.name,
                                                                    slotTime: item.time.toISOString()
                                                                })}
                                                            >
                                                                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                                                            </TouchableOpacity>

                                                            <TouchableOpacity
                                                                style={styles.optionBtn}
                                                                onPress={() => handleDeleteReminder(item.reminderId)}
                                                            >
                                                                <Ionicons name="trash-outline" size={20} color={theme.colors.alert} />
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </Card>
                                    </TouchableOpacity>
                                </Swipeable>
                            );
                        })
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={64} color={theme.colors.border} />
                            <Text style={styles.noAgendaText}>Nenhum alarme pendente.</Text>
                        </View>
                    )}
                </View>

                <Button
                    title="+ Novo Alarme"
                    onPress={() => navigation.navigate('SelectMedication')}
                    style={styles.mainAddButton}
                />

                <TouchableOpacity onPress={() => navigation.navigate('Reports')} style={styles.reportRow}>
                    <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.reportRowText}>Relatório PDF</Text>
                </TouchableOpacity>
            </ScrollView>
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
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
    },
    greeting: {
        fontSize: 20,
        color: theme.colors.text,
        opacity: 0.6,
        fontFamily: theme.fonts.body,
    },
    userName: {
        fontSize: 32,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
        marginTop: -4,
    },
    profileChip: {
        padding: 4,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
    },
    agendaCard: {
        padding: 12,
        borderRadius: 20,
        marginBottom: 4,
    },
    agendaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    timeBoxTaken: {
        backgroundColor: theme.colors.primary,
    },
    timeText: {
        fontSize: 16,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary
    },
    agendaMedName: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    agendaDosage: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.primary,
        opacity: 0.8,
        marginTop: 2,
    },
    checkCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: theme.colors.primary + '30',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    checkCircleActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    optionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    noAgendaText: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.4,
        textAlign: 'center',
        marginTop: 10,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    mainAddButton: {
        marginTop: 20,
        marginBottom: 16,
    },
    reportRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        gap: 8,
    },
    reportRowText: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
        fontSize: 14,
    },
    swipeDeleteAction: {
        backgroundColor: '#9E9E9E',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 24,
        height: '100%',
        borderRadius: 20,
        flex: 1,
    },
    swipeActionText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: theme.fonts.bold,
    },
    calendarIconWrapper: {
        width: 28,
        height: 32,
        backgroundColor: '#FFF',
        borderRadius: 6,
        marginLeft: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        elevation: 2,
    },
    calendarIconTop: {
        height: 10,
        backgroundColor: theme.colors.primary,
    },
    calendarIconBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF'
    },
    calendarIconText: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginTop: -2
    }
});
