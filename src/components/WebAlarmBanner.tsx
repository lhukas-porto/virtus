import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FiringAlarm {
    id: string;
    reminderId: string;
    medId: string;
    medName: string;
    timeLabel: string;
    dosage?: string;
}

const CHECK_INTERVAL_MS = 30_000;

const audioCtxContainer = { ctx: null as AudioContext | null };

function playAlarmBeep(): () => void {
    try {
        const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return () => { };

        if (!audioCtxContainer.ctx || audioCtxContainer.ctx.state === 'closed') {
            audioCtxContainer.ctx = new AudioCtxClass();
        }
        const ctx = audioCtxContainer.ctx!;
        if (ctx.state === 'suspended') ctx.resume();

        let active = true;

        const beep = (freq: number, startSec: number, durSec: number) => {
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + startSec);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + startSec + 0.02);
            gain.gain.setValueAtTime(0.5, ctx.currentTime + startSec + durSec - 0.05);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startSec + durSec);
            osc.start(ctx.currentTime + startSec);
            osc.stop(ctx.currentTime + startSec + durSec);
        };

        const pattern = () => {
            if (!active) return;
            beep(880, 0.00, 0.15);
            beep(880, 0.25, 0.15);
            beep(1100, 0.55, 0.40);
        };

        pattern();
        const intervalId = setInterval(() => { if (active) pattern(); }, 1800);

        return () => {
            active = false;
            clearInterval(intervalId);
        };
    } catch (e) {
        console.warn('WebAlarmBanner: audio init failed', e);
        return () => { };
    }
}

const WebAlarmModal = () => {
    const [queue, setQueue] = useState<FiringAlarm[]>([]);
    const [visible, setVisible] = useState(false);

    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const stopSoundRef = useRef<(() => void) | null>(null);
    const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const resume = () => {
            if (audioCtxContainer.ctx?.state === 'suspended') {
                audioCtxContainer.ctx.resume();
            }
        };
        window.addEventListener('click', resume, { once: true });
        return () => window.removeEventListener('click', resume);
    }, []);

    const firedKey = (reminderId: string, h: number, m: number, dateStr: string) =>
        `vitus_v2_alarm_${reminderId}_${h}_${m}_${dateStr}`;

    const checkAlarms = useCallback(async () => {
        try {
            const { data: reminders, error } = await supabase
                .from('medication_reminders')
                .select(`id, medication_id, reminder_time, frequency_hours, dosage_quantity, dosage_unit, medications ( name )`);

            if (error || !reminders) return;

            const now = new Date();
            const nowH = now.getHours();
            const nowM = now.getMinutes();
            const dateStr = now.toISOString().split('T')[0];
            const firing: FiringAlarm[] = [];

            for (const rem of reminders) {
                const parts = rem.reminder_time.slice(0, 5).split(':').map(Number);
                const bH = parts[0];
                const bM = parts[1];
                const freq = rem.frequency_hours || 24;
                const cycles = Math.floor(24 / freq);
                const medName = (rem.medications as any)?.name || 'Medicamento';
                const dosage = rem.dosage_quantity
                    ? `${rem.dosage_quantity} ${rem.dosage_unit || 'comprimido(s)'}`
                    : undefined;

                for (let i = 0; i < cycles; i++) {
                    const slotH = (bH + i * freq) % 24;
                    if (slotH === nowH && bM === nowM) {
                        const key = firedKey(rem.id, slotH, bM, dateStr);
                        if (!sessionStorage.getItem(key)) {
                            sessionStorage.setItem(key, '1');
                            firing.push({
                                id: key,
                                reminderId: rem.id,
                                medId: rem.medication_id,
                                medName,
                                timeLabel: `${String(slotH).padStart(2, '0')}:${String(bM).padStart(2, '0')}`,
                                dosage,
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

    useEffect(() => {
        if (queue.length > 0 && !visible) {
            setVisible(true);
            scaleAnim.setValue(0.85);
            opacityAnim.setValue(0);

            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();

            pulseLoop.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            );
            pulseLoop.current.start();

            stopSoundRef.current = playAlarmBeep();
        }
    }, [queue.length, visible]);

    const dismissCurrent = useCallback(() => {
        if (stopSoundRef.current) stopSoundRef.current();
        if (pulseLoop.current) pulseLoop.current.stop();

        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 0.85, duration: 250, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => {
            setVisible(false);
            setQueue(prev => prev.slice(1));
        });
    }, [scaleAnim, opacityAnim]);

    const handleTaken = async (alarm: FiringAlarm) => {
        dismissCurrent();
        try {
            await supabase.from('medication_logs').insert([{
                reminder_id: alarm.reminderId,
                medication_id: alarm.medId,
                taken_at: new Date().toISOString(),
                status: 'taken'
            }]);
            import('react-native').then(rn => {
                rn.DeviceEventEmitter.emit('event.refreshAgenda');
            });
        } catch (err) {
            console.warn('WebAlarmBanner: failed to mark as taken', err);
        }
    };

    useEffect(() => {
        const initial = setTimeout(checkAlarms, 2000);
        timerRef.current = setInterval(checkAlarms, CHECK_INTERVAL_MS);

        return () => {
            clearTimeout(initial);
            if (timerRef.current) clearInterval(timerRef.current);
            if (stopSoundRef.current) stopSoundRef.current();
        };
    }, [checkAlarms]);

    if (!visible || queue.length === 0) return null;

    const current = queue[0];

    return (
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
            <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>

                <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
                    <Ionicons name="alarm" size={56} color="#fff" />
                </Animated.View>

                <Text style={styles.alarmLabel}>ALARME DE MEDICAMENTO</Text>
                <Text style={styles.medName}>{current.medName}</Text>

                {current.dosage && (
                    <View style={styles.dosagePill}>
                        <Ionicons name="medical" size={14} color={theme.colors.primary} />
                        <Text style={styles.dosageText}>{current.dosage}</Text>
                    </View>
                )}

                <Text style={styles.timeLarge}>{current.timeLabel}</Text>

                {queue.length > 1 && (
                    <Text style={styles.moreLabel}>
                        +{queue.length - 1} alarme(s) aguardando
                    </Text>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.btnTaken}
                        onPress={() => handleTaken(current)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                        <Text style={styles.btnTakenText}>JÁ TOMEI ✅</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.btnSnooze}
                        onPress={dismissCurrent}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="alarm-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.btnSnoozeText}>DISPENSAR</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Animated.View>
    );
};

// ---------------------------------------------------------------------------
// Public export — renders nothing on native (guard is OUTSIDE the component
// with hooks, avoiding the React Rules of Hooks violation)
// ---------------------------------------------------------------------------
export const WebAlarmBanner = () => {
    // Platform guard at the OUTER wrapper — inner component always mounts with
    // all hooks called unconditionally.
    if (Platform.OS !== 'web') return null;
    return <WebAlarmModal />;
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
    overlay: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 99999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: 28,
        paddingHorizontal: 32,
        paddingVertical: 40,
        alignItems: 'center',
        width: '90%',
        maxWidth: 420,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 30,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
    },
    alarmLabel: {
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        letterSpacing: 2,
        opacity: 0.7,
        marginBottom: 8,
    },
    medName: {
        fontSize: 28,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    dosagePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary + '18',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginBottom: 16,
    },
    dosageText: {
        fontSize: 15,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    },
    timeLarge: {
        fontSize: 52,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        letterSpacing: 3,
        marginBottom: 8,
    },
    moreLabel: {
        fontSize: 13,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginBottom: 8,
    },
    actions: {
        width: '100%',
        gap: 12,
        marginTop: 24,
    },
    btnTaken: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: theme.colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
    },
    btnTakenText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        letterSpacing: 1,
    },
    btnSnooze: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderRadius: 16,
        paddingVertical: 14,
    },
    btnSnoozeText: {
        color: theme.colors.primary,
        fontSize: 15,
        fontFamily: theme.fonts.bold,
        letterSpacing: 1,
    },
});
