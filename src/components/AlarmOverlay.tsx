import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Vibration, Dimensions, Alert, Image, DeviceEventEmitter, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../services/supabase';
import { scheduleSnooze } from '../services/notifications';
import { useAuth } from '../context/AuthContext';
import { Audio } from 'expo-av';
import { notifyCaregivers } from '../services/caregiverAlerts';

const { width } = Dimensions.get('window');

export const AlarmOverlay = () => {
    const { session } = useAuth();
    const avatar_url = session?.user?.user_metadata?.avatar_url;
    const [alarmData, setAlarmData] = useState<any>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    const [userName, setUserName] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            if (session?.user?.id) {
                const { data } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', session.user.id)
                    .single();
                if (data?.name) {
                    setUserName(data.name.split(' ')[0]);
                } else if (session?.user?.user_metadata?.name) {
                    setUserName(session.user.user_metadata.name.split(' ')[0]);
                }
            }
        };
        fetchUserData();
    }, [session]);

    useEffect(() => {
        if (Platform.OS === 'web') return; // expo-notifications/expo-av not supported on web

        // Configure audio to play even in silent mode
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
            playThroughEarpieceAndroid: false,
        });

        const subscription = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data;
            if (data && data.type === 'medication_alarm') {
                // --- 🛡️ TRAVA DE SEGURANÇA RÍGIDA 🛡️ ---
                // Evita disparos imediatos (no agendamento) ou passados (sincronização)
                const now = new Date();
                const alarmTimeStr = (data as any).time;
                const [h, m] = typeof alarmTimeStr === 'string' ? alarmTimeStr.split(':').map(Number) : [now.getHours(), now.getMinutes()];
                const scheduledTime = new Date(now);
                scheduledTime.setHours(h, m, 0, 0);

                // Diferença absoluta (Passado ou Futuro) maior que 1 minuto = Ignorar
                const diffMs = Math.abs(scheduledTime.getTime() - now.getTime());
                if (diffMs > 60000) {
                    console.log(`--- [ALARME BLOQUEADO] Diferença de ${Math.round(diffMs / 1000)}s - Não é a hora exata. ---`);
                    return;
                }

                setAlarmData(data);
                startAlarms(); // Reativado para tocar assim que recebe a push
                
                // Inicia timer para avisar cuidador se não houver resposta em 10 minutos
                const timer = setTimeout(() => {
                    if (data.medName) {
                        notifyCaregivers(userName || 'Paciente', String(data.medName), String((data as any).time || 'agora'));
                    }
                }, 10 * 60 * 1000);

                return () => clearTimeout(timer);
            }
        });

        const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
            const data = response.notification.request.content.data;
            const actionId = response.actionIdentifier;

            if (data && data.type === 'medication_alarm') {
                setAlarmData(data);
                startAlarms(); // Garante que toca quando abre pela notificação

                if (actionId === 'take') {
                    await handleTakeAction(data);
                } else if (actionId === 'snooze') {
                    setTimeout(() => handleSnoozeStart(data), 500);
                }
            }
        });

        return () => {
            subscription.remove();
            responseSubscription.remove();
            stopAlarms();
        };
    }, []);

    const startAlarms = async () => {
        // Start persistent Vibration
        Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);

        try {
            // Unload if exists
            if (sound) {
                try { await sound.unloadAsync(); } catch (e) { }
            }

            // Load and play a persistent alarm-like beep
            // Note: In a production app, we should use a local asset for zero-latency.
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: 'https://www.soundjay.com/buttons/beep-01a.mp3' },
                {
                    shouldPlay: true,
                    isLooping: true,
                    volume: 1.0,
                    androidImplementation: 'MediaPlayer' // More robust for background
                }
            );
            await newSound.setVolumeAsync(1.0);
            setSound(newSound);
        } catch (error) {
            console.log('Error playing sound', error);
        }
    };

    const stopAlarms = async () => {
        Vibration.cancel();
        if (sound) {
            try {
                await sound.stopAsync();
                await sound.unloadAsync();
            } catch (e) { }
            setSound(null);
        }
    };

    const handleTake = () => {
        if (alarmData) handleTakeAction(alarmData);
    };

    const handleTakeAction = async (data: any) => {
        stopAlarms();

        const { reminderId, medicationId } = data;

        try {
            if (reminderId && medicationId) {
                // 1. Verificar se já não foi registrado nos últimos 30 minutos (evita duplicidade do loop)
                const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
                const { data: existingLog } = await supabase
                    .from('medication_logs')
                    .select('id')
                    .eq('reminder_id', reminderId)
                    .eq('medication_id', medicationId)
                    .gte('taken_at', thirtyMinsAgo)
                    .limit(1);

                if (existingLog && existingLog.length > 0) {
                    console.log('Dose já registrada recentemente. Ignorado.');
                } else {
                    const { error } = await supabase.from('medication_logs').insert({
                        reminder_id: reminderId,
                        medication_id: medicationId,
                        taken_at: new Date().toISOString(),
                        status: 'taken'
                    });

                    if (error) {
                        Alert.alert("Erro", "Não foi possível salvar o registro online.");
                    } else {
                        DeviceEventEmitter.emit('event.medicationTaken');
                    }
                }

                // Limpa a bandeja de notificações para evitar cliques fantasmas
                try {
                    await Notifications.dismissAllNotificationsAsync();
                } catch (e) { }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setAlarmData(null);
        }
    };

    const handleSnoozeStart = (data: any = alarmData) => {
        stopAlarms();
        if (!data) return;

        Alert.alert(
            'Lembrar depois',
            'Em quanto tempo?',
            [
                { text: '5 min', onPress: () => performSnooze(data, 5) },
                { text: '10 min', onPress: () => performSnooze(data, 10) },
                { text: '15 min', onPress: () => performSnooze(data, 15) },
                { text: '30 min', onPress: () => performSnooze(data, 30) },
                {
                    text: 'Cancelar',
                    style: 'cancel',
                    onPress: () => {
                        setAlarmData(null);
                    }
                }
            ]
        );
    };

    const performSnooze = async (data: any, minutes: number) => {
        if (data) {
            await scheduleSnooze(data.medName, minutes, data);
        }
        setAlarmData(null);
        try {
            await Notifications.dismissAllNotificationsAsync();
        } catch (e) { }
    };

    if (!alarmData) return null;

    return (
        <Modal visible={true} transparent={true} animationType="slide" onRequestClose={() => { }}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        {avatar_url ? (
                            <Image
                                source={{ uri: avatar_url }}
                                style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: theme.colors.primary }}
                            />
                        ) : (
                            <Ionicons name="notifications-circle" size={80} color={theme.colors.alert} />
                        )}
                        <Text style={styles.userName}>
                            Olá, {userName || 'você'}!
                        </Text>
                        <Text style={styles.title}>HORA DO REMÉDIO</Text>
                    </View>

                    <Text style={styles.medName}>
                        {alarmData.medName || 'Medicamento'}
                    </Text>

                    <Text style={styles.subtitle}>
                        Não esqueça de tomar sua dose agora!
                    </Text>

                    <TouchableOpacity style={styles.confirmButton} onPress={handleTake}>
                        <Text style={styles.confirmText}> JÁ TOMEI! </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.snoozeButton} onPress={() => handleSnoozeStart(alarmData)}>
                        <Text style={styles.snoozeText}>Lembrar depois</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.alertCaregiverButton}
                        onPress={() => {
                            notifyCaregivers(userName || 'Paciente', alarmData.medName, alarmData.time || 'agora');
                            Alert.alert("Aviso Enviado", "Seus cuidadores foram notificados.");
                        }}
                    >
                        <Ionicons name="warning-outline" size={16} color={theme.colors.alert} style={{ marginRight: 6 }} />
                        <Text style={styles.alertCaregiverText}>Alertar Cuidador Agora</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontFamily: theme.fonts.bold,
        color: theme.colors.alert,
        marginTop: 4,
        textAlign: 'center',
    },
    userName: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginTop: 16,
        opacity: 0.6,
    },
    medName: {
        fontSize: 32,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 18,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.7,
        textAlign: 'center',
        marginBottom: 40,
    },
    confirmButton: {
        backgroundColor: theme.colors.primary,
        width: '100%',
        paddingVertical: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 4,
    },
    confirmText: {
        fontSize: 22,
        fontFamily: theme.fonts.bold,
        color: '#FFF',
    },
    snoozeButton: {
        paddingVertical: 16,
    },
    snoozeText: {
        fontSize: 18,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.6,
        textDecorationLine: 'underline',
    },
    alertCaregiverButton: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    alertCaregiverText: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.alert,
    }
});
