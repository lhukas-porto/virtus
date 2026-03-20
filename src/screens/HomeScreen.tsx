import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, DeviceEventEmitter, Alert, Platform, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Button } from '../components/Button';
import { syncNotifications, registerPushToken } from '../services/notifications';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';

export const HomeScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const [agendaItems, setAgendaItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [hiddenItems, setHiddenItems] = useState<string[]>([]);
    const [supervisedPatients, setSupervisedPatients] = useState<any[]>([]);
    const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);

    const fetchAgenda = async (showLoading = false) => {
        if (!session?.user?.id) return;
        try {
            if (showLoading || agendaItems.length === 0) setLoading(true);

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

                    // Ignora horários que já passaram ANTES do remédio ser cadastrado
                    if (slotTime < new Date(rem.created_at)) {
                        current = new Date(current.getTime() + freq * 60 * 60 * 1000);
                        continue;
                    }

                    // VERIFICAÇÃO RÍGIDA: Apenas se o slot for EXATAMENTE hoje
                    if (slotTime.getDate() === todayStart.getDate() &&
                        slotTime.getMonth() === todayStart.getMonth() &&
                        slotTime.getFullYear() === todayStart.getFullYear()) {

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
                    }

                    current = new Date(current.getTime() + freq * 60 * 60 * 1000);
                }
            });

            generatedItems.sort((a, b) => a.time.getTime() - b.time.getTime());
            setAgendaItems(generatedItems);

            // Fetch supervised patients if seeing own agenda
            if (!viewingPatientId) {
                const { data: shares } = await supabase
                    .from('caregivers')
                    .select('patient_id, profiles!caregivers_patient_id_fkey(*)')
                    .eq('caregiver_email', session.user.email?.toLowerCase())
                    .eq('status', 'active');

                if (shares) {
                    setSupervisedPatients(shares.map((s: any) => s.profiles).filter(Boolean));
                }
            }

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

        const title = `Próximas Doses: ${item.medication.name}`;
        const message = futureTimes.length === 0
            ? "Uso finalizado ou sem novas doses previstas para as próximas 24h."
            : `Confira seus próximos horários:\n\n${futureTimes.join('\n')}`;

        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
        }
    };

    const checkScale = useSharedValue(1);
    const [celebrationItem, setCelebrationItem] = useState<string | null>(null);
    const [timeModal, setTimeModal] = useState<{ item: any; hour: string; minute: string } | null>(null);

    const confirmMedicationTaken = async (item: any, takenAt: Date) => {
        try {
            setCelebrationItem(item.id);
            checkScale.value = withSequence(
                withSpring(1.5),
                withSpring(1)
            );

            const { error } = await supabase.from('medication_logs').insert([{
                reminder_id: item.reminderId,
                medication_id: item.medication.id,
                taken_at: takenAt.toISOString(),
                status: 'taken'
            }]);

            if (error) throw error;

            setTimeout(() => {
                setCelebrationItem(null);
                fetchAgenda();
            }, 600);

        } catch (e) {
            setCelebrationItem(null);
            if (Platform.OS === 'web') window.alert('Falha ao registrar.');
            else Alert.alert('Erro', 'Falha ao registrar.');
        }
    };

    const handleCheck = async (item: any) => {
        if (item.status === 'taken') return;

        const now = new Date();
        const defaultHour = String(now.getHours()).padStart(2, '0');
        const defaultMinute = String(now.getMinutes()).padStart(2, '0');

        if (Platform.OS === 'web') {
            const input = window.prompt(
                `${item.medication.name}\n\nQue horas você tomou o remédio?\n(formato HH:MM)`,
                `${defaultHour}:${defaultMinute}`
            );
            if (input === null) return; // cancelled

            const parts = input.trim().split(':');
            const h = parseInt(parts[0] || defaultHour);
            const m = parseInt(parts[1] || defaultMinute);

            if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
                window.alert('Horário inválido. Use o formato HH:MM.');
                return;
            }

            const takenAt = new Date();
            takenAt.setHours(h, m, 0, 0);
            await confirmMedicationTaken(item, takenAt);
        } else {
            setTimeModal({ item, hour: defaultHour, minute: defaultMinute });
        }
    };

    const handleDeleteReminder = async (reminderId: string) => {
        const title = 'Cancelar Alarme';
        const message = 'O alarme será cancelado, mas os registros de doses já tomadas continuarão no seu relatório.';

        const performDelete = async () => {
            // 1. Desvincular os logs já registrados (preserva o histórico)
            await supabase
                .from('medication_logs')
                .update({ reminder_id: null })
                .eq('reminder_id', reminderId);

            // 2. Agora sim, deletar o reminder (sem perder os logs)
            const { error } = await supabase.from('medication_reminders').delete().eq('id', reminderId);
            if (!error) {
                await syncNotifications();
                fetchAgenda();
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`${title}\n\n${message}`)) {
                await performDelete();
            }
        } else {
            Alert.alert(title, message, [
                { text: 'Não' },
                {
                    text: 'Sim, Cancelar',
                    style: 'destructive',
                    onPress: performDelete
                }
            ]);
        }
    };

    const fetchAgendaForPatient = async (patientId: string) => {
        setLoading(true);
        setViewingPatientId(patientId);
        try {
            // Get patient profile for the name
            const { data: pProfile } = await supabase.from('profiles').select('name').eq('id', patientId).single();
            if (pProfile) setUserName(pProfile.name.split(' ')[0]);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { data: reminders } = await supabase
                .from('medication_reminders')
                .select(`*, medications!inner (*)`)
                .eq('medications.profile_id', patientId);

            const { data: logs } = await supabase
                .from('medication_logs')
                .select('*')
                .gte('taken_at', todayStart.toISOString());

            const generatedItems: any[] = [];
            reminders?.forEach((rem: any) => {
                const [h, m] = rem.reminder_time.slice(0, 5).split(':').map(Number);
                const endOfToday = new Date(todayStart);
                endOfToday.setHours(23, 59, 59, 999);
                let current = new Date(todayStart);
                current.setHours(h, m, 0, 0);
                const freq = rem.frequency_hours || 24;
                while (current < todayStart) current.setHours(current.getHours() + freq);
                while (current <= endOfToday) {
                    const slotTime = new Date(current);

                    // Ignora horários que já passaram ANTES do remédio ser cadastrado
                    if (slotTime < new Date(rem.created_at)) {
                        current = new Date(current.getTime() + freq * 3600000);
                        continue;
                    }

                    const matchedLog = logs?.find(l => {
                        if (l.reminder_id !== rem.id) return false;
                        const logTime = new Date(l.taken_at).getTime();
                        return Math.abs(logTime - slotTime.getTime()) < (freq * 3600000) / 2;
                    });

                    generatedItems.push({
                        id: rem.id + '-' + slotTime.toISOString(),
                        reminderId: rem.id,
                        medication: rem.medications,
                        time: slotTime,
                        log: matchedLog,
                        status: matchedLog ? matchedLog.status : 'pending',
                        original: rem
                    });
                    current = new Date(current.getTime() + freq * 3600000);
                }
            });
            generatedItems.sort((a, b) => a.time.getTime() - b.time.getTime());
            setAgendaItems(generatedItems);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            if (viewingPatientId) {
                fetchAgendaForPatient(viewingPatientId);
            } else {
                fetchAgenda(agendaItems.length === 0);
            }

            if (session?.user?.id) {
                registerPushToken(session.user.id);
            }

            // Check for Android Overlay Permission Reminder
            const checkOverlayPermission = async () => {
                if (Platform.OS !== 'android') return;

                const hasReminded = await AsyncStorage.getItem('vitus_overlay_reminder');
                if (!hasReminded) {
                    Alert.alert(
                        "Configuração Importante 🚨",
                        "Para que o alarme toque mesmo com a tela bloqueada, você precisa autorizar uma configuração manual:\n\n" +
                        "1. Vá em Configurações > Apps > Vitus\n" +
                        "2. Procure por 'Aparecer sobre outros aplicativos'\n" +
                        "3. Marque como PERMITIDO\n\n" +
                        "Também verifique em 'Notificações' se a categoria 'Alarme Crítico' está com pop-up ativo.",
                        [
                            { text: "Entendido", onPress: () => AsyncStorage.setItem('vitus_overlay_reminder', 'true') },
                            { text: "Lembrar depois" }
                        ]
                    );
                }
            };
            checkOverlayPermission();

        }, [session, route?.params?.refreshTimestamp, viewingPatientId])
    );

    React.useEffect(() => {
        const sub = DeviceEventEmitter.addListener('event.refreshAgenda', fetchAgenda);
        const subTaken = DeviceEventEmitter.addListener('event.medicationTaken', fetchAgenda);
        return () => {
            sub.remove();
            subTaken.remove();
        };
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const quotes = [
        "Hoje é um bom dia para se cuidar. 🌿",
        "Sua saúde é o seu maior tesouro. 💎",
        "Pequenos hábitos, grandes vitórias! ✨",
        "Respire fundo e aproveite seu dia. 🌬️",
        "Cuidar de si mesmo é um ato de amor. ❤️"
    ];

    const quoteToday = quotes[new Date().getDate() % quotes.length];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()},</Text>
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

                {/* Seção Cuidando de (Share) */}
                {supervisedPatients.length > 0 && (
                    <View style={styles.supervisedSection}>
                        <Text style={styles.supervisedTitle}>Monitorando:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.supervisedScroll}>
                            <TouchableOpacity
                                style={[styles.patientChip, !viewingPatientId && styles.patientChipActive]}
                                onPress={() => setViewingPatientId(null)}
                            >
                                <Text style={[styles.patientChipText, !viewingPatientId && styles.patientChipTextActive]}>Minha Agenda</Text>
                            </TouchableOpacity>
                            {supervisedPatients.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[styles.patientChip, viewingPatientId === p.id && styles.patientChipActive]}
                                    onPress={() => fetchAgendaForPatient(p.id)}
                                >
                                    <Text style={[styles.patientChipText, viewingPatientId === p.id && styles.patientChipTextActive]}>{p.name.split(' ')[0]}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {viewingPatientId && (
                    <View style={styles.patientIndicator}>
                        <Ionicons name="eye-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.patientIndicatorText}>Você está visualizando a agenda de outra pessoa.</Text>
                    </View>
                )}

                {/* Card de Inspiração */}
                <Card style={styles.quoteCard}>
                    <Ionicons name="leaf-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                    <Text style={styles.quoteText}>{quoteToday}</Text>
                </Card>

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

                                            <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'flex-start', marginTop: 2 }}>
                                                <TouchableOpacity
                                                    style={[styles.checkCircle, isTaken && styles.checkCircleActive]}
                                                    onPress={() => handleCheck(item)}
                                                    disabled={isTaken}
                                                >
                                                    <Animated.View style={celebrationItem === item.id ? { transform: [{ scale: checkScale }] } : {}}>
                                                        <Ionicons
                                                            name={isTaken ? "checkmark" : "ellipse-outline"}
                                                            size={22}
                                                            color={isTaken ? "#FFF" : theme.colors.primary}
                                                        />
                                                    </Animated.View>
                                                </TouchableOpacity>

                                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                                    <TouchableOpacity
                                                        style={styles.optionBtn}
                                                        onPress={() => navigation.navigate('AlarmConfig', {
                                                            reminder: item.original,
                                                            medicationId: item.medication.id,
                                                            medicationName: item.medication.name,
                                                            slotTime: item.time.toISOString()
                                                        })}
                                                    >
                                                        <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={styles.optionBtn}
                                                        onPress={() => handleDeleteReminder(item.reminderId)}
                                                    >
                                                        <Ionicons name="trash-outline" size={18} color={theme.colors.alert} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </Card>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="leaf" size={64} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.noAgendaText}>Tudo em ordem!</Text>
                            <Text style={styles.emptySubtext}>
                                Você já cuidou de tudo por hoje. Aproveite o descanso! 🌿
                            </Text>
                        </View>
                    )}
                </View>

                <Button
                    title="+ Novo Alarme"
                    onPress={() => navigation.navigate('SelectMedication')}
                    style={styles.mainAddButton}
                />

                <TouchableOpacity onPress={() => navigation.navigate('PendingReminders')} style={styles.reportRow}>
                    <Ionicons name="list-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.reportRowText}>Próximas Doses / Ver Calendário</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Reports')}
                    style={[styles.reportRow, { marginTop: -20 }]}
                >
                    <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.reportRowText}>Relatórios de Medicamentos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('HealthLog')}
                    style={[styles.reportRow, { marginTop: -20 }]}
                >
                    <Ionicons name="pulse-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.reportRowText}>Diário de Sintomas & Sinais Vitais</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('AdherenceDashboard')}
                    style={[styles.reportRow, { marginTop: -20, marginBottom: 60 }]}
                >
                    <Ionicons name="stats-chart-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.reportRowText}>Meu Painel de Adesão</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Modal: Que horas você tomou o remédio? */}
            <Modal
                visible={!!timeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setTimeModal(null)}
            >
                <View style={styles.timeModalOverlay}>
                    <View style={styles.timeModalCard}>
                        <Text style={styles.timeModalTitle}>
                            💊 {timeModal?.item?.medication?.name}
                        </Text>
                        <Text style={styles.timeModalSubtitle}>
                            Que horas você tomou de fato?
                        </Text>

                        <View style={styles.timeModalRow}>
                            <View style={styles.timeModalInputGroup}>
                                <TextInput
                                    style={styles.timeModalInput}
                                    value={timeModal?.hour ?? ''}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '').slice(0, 2);
                                        setTimeModal(prev => prev ? { ...prev, hour: clean } : null);
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    selectTextOnFocus
                                />
                                <Text style={styles.timeModalInputLabel}>Horas</Text>
                            </View>
                            <Text style={styles.timeModalSep}>:</Text>
                            <View style={styles.timeModalInputGroup}>
                                <TextInput
                                    style={styles.timeModalInput}
                                    value={timeModal?.minute ?? ''}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '').slice(0, 2);
                                        setTimeModal(prev => prev ? { ...prev, minute: clean } : null);
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    selectTextOnFocus
                                />
                                <Text style={styles.timeModalInputLabel}>Minutos</Text>
                            </View>
                        </View>

                        <View style={styles.timeModalActions}>
                            <TouchableOpacity
                                style={styles.timeModalCancelBtn}
                                onPress={() => setTimeModal(null)}
                            >
                                <Text style={styles.timeModalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.timeModalConfirmBtn}
                                onPress={() => {
                                    if (!timeModal) return;
                                    const h = parseInt(timeModal.hour);
                                    const m = parseInt(timeModal.minute);
                                    if (isNaN(h) || isNaN(m) || h > 23 || m > 59) {
                                        Alert.alert('Ops!', 'Horário inválido. Use de 00:00 a 23:59.');
                                        return;
                                    }
                                    const takenAt = new Date();
                                    takenAt.setHours(h, m, 0, 0);
                                    const currentItem = timeModal.item;
                                    setTimeModal(null);
                                    confirmMedicationTaken(currentItem, takenAt);
                                }}
                            >
                                <Text style={styles.timeModalConfirmText}>Confirmar ✓</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        paddingBottom: Platform.OS === 'web' ? 120 : 40,
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
        opacity: 0.8, // Increased for accessibility
        fontFamily: theme.fonts.body,
    },
    userName: {
        fontSize: 32,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
        marginTop: -4,
    },
    quoteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(6, 129, 91, 0.1)', // More visible
    },
    quoteText: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.primary,
        fontStyle: 'italic',
        fontWeight: '500', // Better contrast
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
        backgroundColor: theme.colors.primary + '15', // a bit darker
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
        fontFamily: theme.fonts.semiBold, // Bolder
        color: theme.colors.primary,
        opacity: 0.9, // Higher contrast
        marginTop: 2,
    },
    checkCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2,
        borderColor: theme.colors.primary + '40',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    checkCircleActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    optionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    noAgendaText: {
        fontSize: 22,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        textAlign: 'center',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.7,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 20,
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        paddingBottom: 20,
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
    },
    supervisedSection: {
        marginBottom: 24,
    },
    supervisedTitle: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.5,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    supervisedScroll: {
        flexDirection: 'row',
    },
    patientChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F0F0F0',
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    patientChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    patientChipText: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    patientChipTextActive: {
        color: '#FFF',
    },
    patientIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary + '10',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    patientIndicatorText: {
        fontSize: 13,
        fontFamily: theme.fonts.body,
        color: theme.colors.primary,
        marginLeft: 8,
    },
    // Time modal styles
    timeModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    timeModalCard: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 28,
        paddingBottom: 40,
    },
    timeModalTitle: {
        fontSize: 19,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 6,
    },
    timeModalSubtitle: {
        fontSize: 15,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.55,
        marginBottom: 24,
    },
    timeModalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8,
    },
    timeModalInputGroup: {
        alignItems: 'center',
    },
    timeModalInput: {
        fontSize: 48,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        textAlign: 'center',
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.primary + '50',
        minWidth: 84,
        paddingVertical: 4,
    },
    timeModalInputLabel: {
        fontSize: 11,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.4,
        textTransform: 'uppercase',
        marginTop: 6,
    },
    timeModalSep: {
        fontSize: 40,
        color: theme.colors.border,
        fontFamily: theme.fonts.heading,
        marginBottom: 20,
    },
    timeModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 28,
    },
    timeModalCancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    timeModalCancelText: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.6,
        fontSize: 15,
    },
    timeModalConfirmBtn: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
    },
    timeModalConfirmText: {
        fontFamily: theme.fonts.bold,
        color: '#FFF',
        fontSize: 15,
    },
});

