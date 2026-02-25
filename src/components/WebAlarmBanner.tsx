import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';

interface FiringAlarm {
    id: string;
    medName: string;
    timeLabel: string;
    dosage?: string;
}

const CHECK_INTERVAL_MS = 30_000; // check every 30 s

// ---------------------------------------------------------------------------
// Web Audio API — alarm beep (no external file needed)
// ---------------------------------------------------------------------------
function createAlarmSound(): { start: () => void; stop: () => void } | null {
    if (typeof window === 'undefined' || !window.AudioContext) return null;

    let ctx: AudioContext | null = null;
    let oscillator: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let running = false;

    const beep = (freq: number, durationMs: number) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.6, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + durationMs / 1000);
    };

    const playPattern = () => {
        if (!ctx || !running) return;
        beep(880, 200);
        setTimeout(() => { if (running) beep(880, 200); }, 280);
        setTimeout(() => { if (running) beep(1100, 400); }, 600);
    };

    return {
        start: () => {
            try {
                ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                running = true;
                playPattern();
                intervalId = setInterval(playPattern, 1800);
            } catch (e) {
                console.warn('WebAlarmBanner: audio failed', e);
            }
        },
        stop: () => {
            running = false;
            if (intervalId) { clearInterval(intervalId); intervalId = null; }
            if (ctx) { ctx.close(); ctx = null; }
        },
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const WebAlarmBanner = () => {
    if (Platform.OS !== 'web') return null;

    const [queue, setQueue] = useState<FiringAlarm[]>([]);
    const [visible, setVisible] = useState(false);

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const soundRef = useRef<ReturnType<typeof createAlarmSound>>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ---------- Key helpers ----------
    const firedKey = (reminderId: string, slotH: number) =>
        `vitus_alarm_fired_${reminderId}_${slotH}`;

    // ---------- Poll alarms ----------
    const checkAlarms = useCallback(async () => {
        try {
            const { data: reminders, error } = await supabase
                .from('medication_reminders')
                .select(`id, reminder_time, frequency_hours, dosage_quantity, dosage_unit, medications ( name )`);

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
                const dosage = rem.dosage_quantity
                    ? `${rem.dosage_quantity} ${rem.dosage_unit || 'comprimido(s)'}`
                    : undefined;

                for (let i = 0; i < cycles; i++) {
                    const slotH = (bH + i * freq) % 24;
                    if (slotH === nowH && bM === nowM) {
                        const key = firedKey(rem.id, slotH);
                        if (!sessionStorage.getItem(key)) {
                            sessionStorage.setItem(key, '1');
                            firing.push({
                                id: key,
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

    // ---------- Show modal when queue gets items ----------
    useEffect(() => {
        if (queue.length > 0 && !visible) {
            setVisible(true);
            // Animate in
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
            // Start pulse loop
            startPulse();
            // Start sound
            soundRef.current = createAlarmSound();
            soundRef.current?.start();
        }
    }, [queue.length]);

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            ])
        ).start();
    };

    // ---------- Dismiss ----------
    const dismiss = () => {
        soundRef.current?.stop();
        pulseAnim.stopAnimation();

        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 0.8, useNativeDriver: true, tension: 60, friction: 8 }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => {
            setVisible(false);
            setQueue(prev => {
                const next = prev.slice(1);
                if (next.length > 0) {
                    // Show next alarm after short pause
                    setTimeout(() => {
                        setQueue(next); // trigger re-render → useEffect fires again
                        scaleAnim.setValue(0.8);
                        opacityAnim.setValue(0);
                    }, 400);
                    return [];
                }
                return [];
            });
        });
    };

    // ---------- Poll setup ----------
    useEffect(() => {
        const initial = setTimeout(checkAlarms, 3000);
        timerRef.current = setInterval(checkAlarms, CHECK_INTERVAL_MS);
        return () => {
            clearTimeout(initial);
            if (timerRef.current) clearInterval(timerRef.current);
            soundRef.current?.stop();
        };
    }, [checkAlarms]);

    if (!visible || queue.length === 0) return null;

    const current = queue[0];

    return (
        // Full-screen overlay
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
            {/* Modal card */}
            <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>

                {/* Pulsing alarm icon */}
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
                    <Text style={styles.moreLabel}>+{queue.length - 1} alarme(s) aguardando</Text>
                )}

                {/* Action buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.btnTaken} onPress={dismiss} activeOpacity={0.8}>
                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                        <Text style={styles.btnTakenText}>JÁ TOMEI ✅</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.btnSnooze} onPress={dismiss} activeOpacity={0.8}>
                        <Ionicons name="alarm-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.btnSnoozeText}>DISPENSAR</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'fixed' as any,
        top: 0, left: 0, right: 0, bottom: 0,
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
        backgroundColor: theme.colors.primary + '15',
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
        fontSize: 48,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        letterSpacing: 2,
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
