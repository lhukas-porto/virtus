import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Configure how notifications are handled when the app is open
if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export const initializeNotifications = async () => {
    if (Platform.OS === 'web') return;

    // Configure audio to play even in silent mode
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            interruptionModeIOS: 1,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: 1,
            playThroughEarpieceAndroid: false,
        });

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('medication_alert', {
                name: 'Alarme de Medicamento',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 500, 200, 500, 200, 500],
                lightColor: '#E53935',
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                bypassDnd: true,
                audioAttributes: {
                    usage: Notifications.AndroidAudioUsage.ALARM,
                    contentType: Notifications.AndroidAudioContentType.SONIFICATION,
                }
            });
        }

        // Register Action Buttons
        await Notifications.setNotificationCategoryAsync('medication', [
            {
                identifier: 'take',
                buttonTitle: 'JÁ TOMEI ✅',
                options: { opensAppToForeground: true },
            },
            {
                identifier: 'snooze',
                buttonTitle: 'ADIAR 10 MIN ⏰',
                options: { opensAppToForeground: true },
            },
        ]);
    } catch (e) {
        console.warn('Notifications initialization skipped or failed:', e);
    }
};

export const requestNotificationPermissions = async () => {
    if (Platform.OS === 'web') return false;
    try {
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
    } catch (e) {
        return false;
    }
};

export const scheduleMedicationReminder = async (medName: string, time: string, reminderId: string, medicationId: string) => {
    if (Platform.OS === 'web') return null;
    try {
        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: `💊 HORA DO SEU REMÉDIO: ${medName.toUpperCase()}`,
                body: `Toque para abrir o Vitus e confirmar sua dose.`,
                data: { reminderId, medicationId, type: 'medication_alarm', medName },
                sound: true,
                vibrate: [0, 500, 200, 500, 200, 500],
                color: '#E53935',
                priority: Notifications.AndroidNotificationPriority.MAX,
                categoryIdentifier: 'medication',
                sticky: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes,
                channelId: 'medication_alert',
            },
        });
        return notificationId;
    } catch (e) {
        return null;
    }
};

export const scheduleSnooze = async (medName: string, minutes: number, data: any) => {
    if (Platform.OS === 'web') return;
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: `⏰ LEMBRETE ADIADO: ${medName}`,
                body: `Passaram-se ${minutes} minutos. Tome seu remédio!`,
                data: data,
                sound: true,
                vibrate: [0, 250, 250, 250, 1000, 500, 1000, 500],
                color: '#FF9800',
                priority: Notifications.AndroidNotificationPriority.MAX,
                categoryIdentifier: 'medication',
            },
            trigger: {
                seconds: minutes * 60,
                channelId: 'medication_alert',
            },
        });
    } catch (e) { }
};

export const cancelNotification = async (id: string) => {
    if (Platform.OS === 'web') return;
    try {
        await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) { }
};

export const syncNotifications = async () => {
    if (Platform.OS === 'web') return;
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        const { supabase } = require('./supabase');

        const { data: reminders, error } = await supabase
            .from('medication_reminders')
            .select(`
                id,
                reminder_time,
                frequency_hours,
                medication_id,
                medications ( name )
            `);

        if (error || !reminders) return;

        // 3. Reagendar
        for (const rem of reminders) {
            const medName = rem.medications?.name || 'Medicamento';
            const freq = rem.frequency_hours || 24;
            const [hBase, mBase] = rem.reminder_time.split(':').map(Number);

            if (isNaN(hBase)) continue;

            const cycles = Math.floor(24 / freq);

            for (let i = 0; i < cycles; i++) {
                const h = (hBase + (i * freq)) % 24;
                const timeStr = `${String(h).padStart(2, '0')}:${String(mBase).padStart(2, '0')}`;

                // Reutiliza a função schedule
                await scheduleMedicationReminder(medName, timeStr, rem.id, rem.medication_id);
            }
        }
        console.log(`Synced ${reminders.length} reminders.`);

    } catch (e) {
        console.error("Sync failed", e);
    }
};
