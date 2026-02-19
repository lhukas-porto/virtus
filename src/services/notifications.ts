import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
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

export const syncNotifications = async () => {
    try {
        // 1. Limpar tudo
        await Notifications.cancelAllScheduledNotificationsAsync();

        // 2. Buscar do banco (precisa do supabase importado, mas vamos injetar ou importar aqui)
        // Como este arquivo é helper, vou importar supabase aqui.
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
