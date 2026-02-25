import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';

interface FiringAlarm {
    id: string; // reminderId + slot key
    medName: string;
    timeLabel: string;
}

const CHECK_INTERVAL_MS = 30_000; // check every 30 seconds

/**
 * WebAlarmBanner — only rendered on web.
 * Polls medication_reminders every 30 s and shows a banner when a slot fires.
 * Fired slots are recorded in sessionStorage to avoid re-firing within the same session.
 */
export const WebAlarmBanner = () => {
    if (Platform.OS !== 'web') return null;

    const [queue, setQueue] = useState<FiringAlarm[]>([]);
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const firedKey = (reminderId: string, slotHour: number) =>
        `vitus_alarm_fired_${reminderId}_${slotHour}`;

    const checkAlarms = useCallback(async () => {
        try {
            const { data: reminders, error } = await supabase
                .from('medication_reminders')
                .select(`
                    id,
                    reminder_time,
                    frequency_hours,
                    medications ( name )
                `);

            if (error || !reminders) return;

            const now = new Date();
            const nowH = now.getHours();
            const nowM = now.getMinutes();
            const firing: FiringAlarm[] = [];

            for (const rem of reminders) {
                const [bH, bM] = rem.reminder_time.slice(0, 5).split(':').map(Number);
                const freq = rem.frequency_hours || 24;
                const cycles = Math.floor(24 / freq);
                const medName = (rem.medications as any)?.name || 'Medicamento';

                for (let i = 0; i < cycles; i++) {
                    const slotH = (bH + i * freq) % 24;
                    const slotM = bM;

                    // Fire if within the same minute
                    if (slotH === nowH && slotM === nowM) {
                        const key = firedKey(rem.id, slotH);
                        if (!sessionStorage.getItem(key)) {
                            sessionStorage.setItem(key, '1');
                            firing.push({
                                id: key,
                                medName,
                                timeLabel: `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`,
                            });
                        }
                    }
                }
            }

            if (firing.length > 0) {
                setQueue(prev => [...prev, ...firing]);
            }
        } catch (e) {
            console.warn('WebAlarmBanner: check failed', e);
        }
    }, []);

    // Show banner animation when queue gets an item
    useEffect(() => {
        if (queue.length > 0) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 60,
                friction: 9,
            }).start();
        }
    }, [queue.length]);

    const dismissCurrent = () => {
        Animated.timing(slideAnim, {
            toValue: -200,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setQueue(prev => prev.slice(1));
            if (queue.length > 1) {
                // Slide in the next one
                slideAnim.setValue(-200);
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 60,
                    friction: 9,
                }).start();
            }
        });
    };

    useEffect(() => {
        // Initial check shortly after mount
        const initial = setTimeout(checkAlarms, 2000);
        timerRef.current = setInterval(checkAlarms, CHECK_INTERVAL_MS);
        return () => {
            clearTimeout(initial);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [checkAlarms]);

    if (queue.length === 0) return null;

    const current = queue[0];

    return (
        <Animated.View
            style={[
                styles.banner,
                { transform: [{ translateY: slideAnim }] }
            ]}
        >
            <View style={styles.iconWrap}>
                <Ionicons name="alarm" size={32} color="#fff" />
            </View>
            <View style={styles.textWrap}>
                <Text style={styles.title}>⏰ Hora do Remédio!</Text>
                <Text style={styles.body}>
                    <Text style={styles.medName}>{current.medName}</Text>
                    {'  •  '}{current.timeLabel}
                </Text>
                {queue.length > 1 && (
                    <Text style={styles.more}>+{queue.length - 1} alarme(s) pendente(s)</Text>
                )}
            </View>
            <TouchableOpacity onPress={dismissCurrent} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="checkmark-circle" size={36} color="#fff" />
                <Text style={styles.closeLabel}>OK</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    banner: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 20,
        gap: 14,
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textWrap: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontFamily: theme.fonts.bold,
    },
    body: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontFamily: theme.fonts.body,
        marginTop: 2,
    },
    medName: {
        fontFamily: theme.fonts.bold,
        color: '#fff',
    },
    more: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontFamily: theme.fonts.body,
        marginTop: 4,
    },
    closeBtn: {
        alignItems: 'center',
        paddingLeft: 8,
    },
    closeLabel: {
        color: '#fff',
        fontSize: 11,
        fontFamily: theme.fonts.bold,
        marginTop: 2,
    },
});
