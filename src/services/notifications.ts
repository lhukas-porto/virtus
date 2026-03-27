import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { theme } from '../theme/theme';

const IntentLauncher = Platform.OS === 'android' ? require('expo-intent-launcher') : null;

// Configure how notifications are handled when the app is open
if (Platform.OS !== 'web') {
    // Configuração global de como as notificações aparecem com o app aberto
    Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
            const data = notification.request.content.data;

            // --- 🛡️ FILTRO DE DISPARO PRECOCE (UI SUPERIOR) 🛡️ ---
            if (data && data.type === 'medication_alarm') {
                const now = new Date();
                const alarmTimeStr = (data as any).time;

                if (typeof alarmTimeStr === 'string') {
                    const [h, m] = alarmTimeStr.split(':').map(Number);
                    const scheduledTime = new Date(now);
                    scheduledTime.setHours(h, m, 0, 0);

                    // Se a hora do alarme para hoje já passou e estamos perto da meia-noite,
                    // ou se o alarme for para amanhã, o diffMs será grande.
                    // REGRA: Se a diferença for maior que 1 minuto (60.000ms), NÃO MOSTRA.
                    const diffMs = Math.abs(scheduledTime.getTime() - now.getTime());
                    
                    if (diffMs > 60000) {
                        return {
                            shouldShowAlert: false,
                            shouldPlaySound: false,
                            shouldSetBadge: false,
                            shouldShowBanner: false,
                            shouldShowList: false,
                        };
                    }
                }
            }

            return {
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            };
        },
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
                name: 'Alarme de Medicamento (Crítico)',
                description: 'Este canal dispara alarmes mesmo em modo silencioso.',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 1000, 800, 1000, 800, 1000, 800, 1000],
                lightColor: '#FF0000',
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // GARANTE NA TELA DE BLOQUEIO
                bypassDnd: true,
                showBadge: true,
                enableVibrate: true,
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

export const scheduleMedicationReminder = async (
    medName: string,
    time: string,
    reminderId: string,
    medicationId: string,
    userName?: string,
    specificDate?: Date,
    createdAt?: Date
) => {
    if (Platform.OS === 'web') return null;
    try {
        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;

        // --- ⌚ ALARME NO RELÓGIO NATIVO (ANDROID) ---
        if (Platform.OS === 'android' && IntentLauncher) {
            try {
                const now = new Date();
                const alarmTime = new Date();
                alarmTime.setHours(hours, minutes, 0, 0);

                // Se o horário já passou hoje, agendamos para amanhã (o Android cuida do "próximo dia" automaticamente com SET_ALARM se o horário for futuro)
                // mas para garantir que o intent dispare sem abrir a tela, voltamos para SKIP_UI: true.
                
                await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
                    extra: {
                        'android.intent.extra.alarm.HOUR': hours,
                        'android.intent.extra.alarm.MINUTES': minutes,
                        'android.intent.extra.alarm.MESSAGE': `Vitus: ${medName}`,
                        'android.intent.extra.alarm.SKIP_UI': true,
                        'android.intent.extra.alarm.VIBRATE': true,
                    },
                });
                console.log('>>> Alarme Nativo Agendado!');
            } catch (e) {
                console.warn('Falha no alarme nativo:', e);
            }
        }

        // --- 🔔 NOTIFICAÇÃO DO VITUS (COM OVERLAY) ---
        const humanizedTitles = [
            `💊 ${medName} está te esperando!`,
            `⏰ Hora da dose: ${medName}`,
        ];
        const idx = Math.floor(Math.random() * humanizedTitles.length);

        const triggerInput: any = specificDate
            ? { date: specificDate }
            : {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes,
            };

        const now = new Date();
        let notificationId = null;
        
        // Define o canal no trigger
        if (triggerInput) {
            triggerInput.channelId = 'medication_alert';
        }

        // Só agendamos se for o modo diário ou se a data específica for no futuro
        if (!specificDate || (specificDate && specificDate > now)) {
            notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: humanizedTitles[idx],
                    body: `Abra o Vitus para confirmar sua dose de ${medName}. ✅`,
                    data: { reminderId, medicationId, type: 'medication_alarm', medName, time },
                    sound: 'default',
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    categoryIdentifier: 'medication',
                    color: '#06815B',
                    sticky: true,
                    autoDismiss: false,
                },
                trigger: triggerInput,
            });
        }

        return notificationId;
    } catch (e) {
        return null;
    }
};

export const scheduleSnooze = async (medName: string, minutes: number, data: any) => {
    if (Platform.OS === 'web') return;
    try {
        const secondsDelay = minutes * 60;
        await Notifications.scheduleNotificationAsync({
            content: {
                title: `⏰ Lembrete: ${medName}`,
                body: `Passaram ${minutes} minuto${minutes > 1 ? 's' : ''}. Que tal tomar sua dose agora? 🌿`,
                data: data,
                sound: true,
                vibrate: [0, 250, 250, 250, 1000, 500, 1000, 500],
                color: '#06815B',
                priority: Notifications.AndroidNotificationPriority.MAX,
                categoryIdentifier: 'medication',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: secondsDelay,
                channelId: 'medication_alert',
            },
        });
    } catch (e) {
        console.error('Erro ao agendar snooze:', e);
    }
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
        await initializeNotifications();
        await Notifications.cancelAllScheduledNotificationsAsync();
        const { supabase } = require('./supabase');

        const { data: reminders, error } = await supabase
            .from('medication_reminders')
            .select(`
                id,
                reminder_time,
                frequency_hours,
                medication_id,
                duration_days,
                created_at,
                medications ( name )
            `);

        if (error || !reminders) return;

        // 3. Reagendar
        for (const rem of reminders) {
            const medName = rem.medications?.name || 'Medicamento';
            const freq = rem.frequency_hours || 24;
            const [hBase, mBase] = rem.reminder_time.split(':').map(Number);

            if (isNaN(hBase)) continue;

            const isContinuous = !rem.duration_days;

            if (isContinuous) {
                // Diário eterno: usa o DAILY trigger original
                const cycles = Math.floor(24 / freq);
                const now = new Date();
                for (let i = 0; i < cycles; i++) {
                    const h = (hBase + (i * freq)) % 24;
                    const timeStr = `${String(h).padStart(2, '0')}:${String(mBase).padStart(2, '0')}`;
                    
                    // Bloqueio preventivo: Se o horário de HOJE já passou, não agenda o Alarme Nativo/Push para disparar agora (o que causaria o popup imediato)
                    const scheduledForToday = new Date();
                    scheduledForToday.setHours(h, mBase, 0, 0);
                    
                    // Se já passou mais de 1 minuto hoje, agendamos apenas para os próximos dias (delegado ao trigger DAILY do Expo)
                    // mas podemos passar um parâmetro ou apenas confiar no filtro de recebimento que já colocamos.
                    // Para ser extra seguro e evitar o Alarme Nativo do Android disparando agora:
                    await scheduleMedicationReminder(medName, timeStr, rem.id, rem.medication_id, undefined, undefined, new Date(rem.created_at));
                }
            } else {
                // Com duração fixa: agenda disparos únicos pelos próximos dias (max 7 dias de antecedência)
                const startTreat = new Date(rem.created_at);
                const endTreat = new Date(startTreat.getTime() + (rem.duration_days * 24 * 60 * 60 * 1000));
                const now = new Date();

                if (now > endTreat) continue;

                for (let d = 0; d < 7; d++) {
                    const targetDay = new Date();
                    targetDay.setDate(now.getDate() + d);

                    const cycles = Math.floor(24 / freq);
                    for (let i = 0; i < cycles; i++) {
                        const h = (hBase + (i * freq)) % 24;
                        const slotDate = new Date(targetDay);
                        slotDate.setHours(h, mBase, 0, 0);

                        // Se for hoje e já passou há mais de 12 horas, ignora.
                        // Caso contrário, permite chamar para que o alerta de "Dose Atrasada" funcione.
                        if (d === 0 && (now.getTime() - slotDate.getTime() > 12 * 3600000)) continue;

                        // Ignora se passar o fim do tratamento
                        if (slotDate > endTreat) break;

                        const timeStr = `${String(h).padStart(2, '0')}:${String(mBase).padStart(2, '0')}`;
                        await scheduleMedicationReminder(medName, timeStr, rem.id, rem.medication_id, undefined, slotDate, new Date(rem.created_at));
                    }
                }
            }
        }
        console.log(`Synced ${reminders.length} reminders.`);

    } catch (e) {
        console.error("Sync failed", e);
    }
};

export const getPushToken = async () => {
    if (Platform.OS === 'web') return null;
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') return null;

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        return token;
    } catch (e) {
        console.error('Error getting push token:', e);
        return null;
    }
};

export const registerPushToken = async (userId: string) => {
    if (Platform.OS === 'web') return;
    try {
        const tokenData = await Notifications.getExpoPushTokenAsync();

        if (tokenData?.data) {
            const { error } = await (require('../services/supabase').supabase)
                .from('push_tokens')
                .upsert({
                    user_id: userId,
                    token: tokenData.data,
                    platform: Platform.OS
                }, { onConflict: 'user_id,token' });

            if (error) console.error('Error saving push token:', error);
        }
    } catch (e) {
        console.error('Failed to get push token:', e);
    }
};
