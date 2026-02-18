import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function scheduleMedicationReminder(
    name: string,
    dosage: string,
    time: string,
    frequency: string
) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de permissão para enviar os alarmes dos remédios!');
            return;
        }
    }

    const [hourStr, minuteStr] = time.split(':');
    const startHour = parseInt(hourStr, 10);
    const startMinute = parseInt(minuteStr, 10);

    const triggers: { hour: number; minute: number }[] = [];

    switch (frequency) {
        case 'daily':
            triggers.push({ hour: startHour, minute: startMinute });
            break;
        case '12h':
            triggers.push({ hour: startHour, minute: startMinute });
            triggers.push({ hour: (startHour + 12) % 24, minute: startMinute });
            break;
        case '8h':
            for (let i = 0; i < 3; i++) {
                triggers.push({ hour: (startHour + i * 8) % 24, minute: startMinute });
            }
            break;
        case '6h':
            for (let i = 0; i < 4; i++) {
                triggers.push({ hour: (startHour + i * 6) % 24, minute: startMinute });
            }
            break;
        default:
            triggers.push({ hour: startHour, minute: startMinute });
    }

    for (const trigger of triggers) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: `Hora do remédio: ${name}`,
                body: `Dose: ${dosage}`,
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: trigger.hour,
                minute: trigger.minute,
            },
        });
    }

    console.log(`[Notifications] Agendados ${triggers.length} lembretes para ${name}`);
}