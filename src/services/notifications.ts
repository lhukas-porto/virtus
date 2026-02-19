import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const initializeNotifications = async () => {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medication_alert', {
            name: 'Alarme de Medicamento',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250, 1000, 500, 1000, 500],
            lightColor: '#FF231F7C',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
        });
    }

    // Register Action Buttons
    await Notifications.setNotificationCategoryAsync('medication', [
        {
            identifier: 'take',
            buttonTitle: 'JÁ TOMEI ✅',
            options: {
                opensAppToForeground: true,
            },
        },
        {
            identifier: 'snooze',
            buttonTitle: 'ADIAR 10 MIN ⏰',
            options: {
                opensAppToForeground: true,
            },
        },
    ]);
};

export const requestNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus === 'granted') {
        initializeNotifications();
    }
    return finalStatus === 'granted';
};

export const scheduleMedicationReminder = async (medName: string, time: string, reminderId: string, medicationId: string) => {
    const [hours, minutes] = time.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
            title: `💊 TOMAR AGORA: ${medName.toUpperCase()}`,
            body: `Está na hora do seu remédio! Toque para confirmar.`,
            data: { reminderId, medicationId, type: 'medication_alarm', medName },
            sound: true,
            vibrate: [0, 250, 250, 250, 1000, 500, 1000, 500], // Vibração insistente
            color: '#E53935', // Vermelho
            priority: Notifications.AndroidNotificationPriority.MAX,
            categoryIdentifier: 'medication',
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
            channelId: 'medication_alert', // Usa o canal de alta prioridade
        },
    });

    return notificationId;
};

export const scheduleSnooze = async (medName: string, minutes: number, data: any) => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: `⏰ LEMBRETE ADIADO: ${medName}`,
            body: `Passaram-se ${minutes} minutos. Tome seu remédio!`,
            data: data,
            sound: true,
            vibrate: [0, 250, 250, 250, 1000, 500, 1000, 500],
            color: '#FF9800', // Laranja
            priority: Notifications.AndroidNotificationPriority.MAX,
            categoryIdentifier: 'medication',
        },
        trigger: {
            seconds: minutes * 60,
            channelId: 'medication_alert',
        },
    });
};

export const cancelNotification = async (id: string) => {
    await Notifications.cancelScheduledNotificationAsync(id);
};
