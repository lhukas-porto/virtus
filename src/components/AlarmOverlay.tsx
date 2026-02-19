import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Vibration, Dimensions, Alert, Image, DeviceEventEmitter } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../services/supabase';
import { scheduleSnooze } from '../services/notifications';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export const AlarmOverlay = () => {
    const { session } = useAuth();
    const avatar_url = session?.user?.user_metadata?.avatar_url;
    const [alarmData, setAlarmData] = useState<any>(null);

    useEffect(() => {
        // Foreground Listener
        const subscription = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data;
            if (data && data.type === 'medication_alarm') {
                setAlarmData(data);
                startVibration();
            }
        });

        // Background Listeners (user tapped or action clicked)
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
            const data = response.notification.request.content.data;
            const actionId = response.actionIdentifier;

            if (data && data.type === 'medication_alarm') {
                if (actionId === 'take') {
                    // Action: Already taken
                    await handleTakeAction(data);
                } else if (actionId === 'snooze') {
                    // Action: Snooze
                    setAlarmData(data);
                    setTimeout(() => handleSnoozeStart(data), 500);
                } else {
                    // Default open
                    setAlarmData(data);
                    Vibration.vibrate([0, 500], true);
                }
            }
        });

        return () => {
            subscription.remove();
            responseSubscription.remove();
            stopVibration();
        };
    }, []);

    const startVibration = () => {
        Vibration.vibrate([0, 1000, 1000], true);
    };

    const stopVibration = () => {
        Vibration.cancel();
    };

    const handleTake = () => {
        if (alarmData) handleTakeAction(alarmData);
    };

    const handleTakeAction = async (data: any) => {
        stopVibration();

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
                    // Success
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
        stopVibration();
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
        fontSize: 28,
        fontFamily: theme.fonts.heading,
        color: theme.colors.alert,
        marginTop: 16,
        textAlign: 'center',
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
