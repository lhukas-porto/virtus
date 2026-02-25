import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Vibration, Dimensions, Alert, Image, DeviceEventEmitter, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../services/supabase';
import { scheduleSnooze } from '../services/notifications';
import { useAuth } from '../context/AuthContext';
import { Audio } from 'expo-av';

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
                setAlarmData(data);
                startAlarms();
            }
        });

        const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
            const data = response.notification.request.content.data;
            const actionId = response.actionIdentifier;

            if (data && data.type === 'medication_alarm') {
                setAlarmData(data);
                startAlarms();

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
        // Start Vibration
        Vibration.vibrate([0, 1000, 500, 1000], true);

        // For "Default System Sound", on Android we rely on the Notification Channel already configured.
        // However, the USER wants a "continuous" alarm experience like a clock.
        // We'll keep the overlay sound but if they want the *native* alarm tone, they'd need a local file.
        // I will use a more "alarm-like" beep and ensure it plays.
        try {
            if (sound) await sound.unloadAsync();
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: 'https://www.soundjay.com/buttons/beep-01a.mp3' },
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
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

    const performSnooze = (data: any, minutes: number) => {
        if (data) {
            scheduleSnooze(data.medName, minutes, data);
        }
        setAlarmData(null);
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
});
