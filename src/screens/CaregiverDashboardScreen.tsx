import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/Card';
import { LinearGradient } from 'expo-linear-gradient';

export const CaregiverDashboardScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [patients, setPatients] = useState<any[]>([]);
    const [fadeAnim] = useState(new Animated.Value(0));

    const fetchData = useCallback(async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        try {
            // 1. Buscar pacientes vinculados
            // Nota: Usamos o e-mail também caso o link por ID ainda n?o tenha sido processado por completo
            const { data: connections, error: connError } = await supabase
                .from('caregivers')
                .select(`
                    id,
                    patient_id,
                    status,
                    profiles:patient_id (
                        id,
                        name,
                        email
                    )
                `)
                .or(`caregiver_id.eq.${session.user.id},caregiver_email.eq.${session.user.email?.toLowerCase()}`)
                .eq('status', 'active');

            if (connError) throw connError;

            if (connections) {
                const patientsWithStatus = await Promise.all(connections.map(async (conn: any) => {
                    const patient = conn.profiles;
                    if (!patient) return null;

                    // 2. Buscar ades?o de hoje do paciente
                    const today = new Date().toISOString().split('T')[0];
                    const { data: logs } = await supabase
                        .from('medication_logs')
                        .select('status, medication_id')
                        .eq('medication_id.user_id', patient.id) // Requer RLS configurado
                        .gte('taken_at', `${today}T00:00:00`)
                        .lte('taken_at', `${today}T23:59:59`);
                    
                    const { data: reminders } = await supabase
                        .from('medication_reminders')
                        .select('id')
                        .eq('medication_id.user_id', patient.id);

                    // 3. Buscar ?ltima medi??o de sa?de
                    const { data: health } = await supabase
                        .from('health_logs')
                        .select('*')
                        .eq('user_id', patient.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    const takenCount = logs?.filter(l => l.status === 'taken').length || 0;
                    const totalReminders = reminders?.length || 0;
                    
                    return {
                        ...patient,
                        connection_id: conn.id,
                        adherence: totalReminders > 0 ? (takenCount / totalReminders) : 1,
                        lastHealth: health,
                        takenCount,
                        totalReminders
                    };
                }));

                setPatients(patientsWithStatus.filter(p => p !== null));
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
            }
        } catch (e) {
            console.error('Erro ao buscar dados do cuidador:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session, fadeAnim]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getAdherenceColor = (val: number) => {
        if (val >= 1) return '#10B981';
        if (val > 0.5) return '#F59E0B';
        return '#EF4444';
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#FFF', '#F9FAFB']} style={StyleSheet.absoluteFill} />
            
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSubtitle}>Monitoramento</Text>
                    <Text style={styles.title}>Vitus Share</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('Caregiver')} 
                    style={styles.settingsButton}
                >
                    <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <View style={styles.statusBanner}>
                    <Text style={styles.bannerText}>
                        {patients.length > 0 
                            ? `Você está acompanhando ${patients.length} ${patients.length === 1 ? 'pessoa' : 'pessoas'}.`
                            : 'Nenhum paciente vinculado no momento.'}
                    </Text>
                </View>

                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
                ) : patients.length > 0 ? (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {patients.map(p => (
                            <Card key={p.id} style={styles.patientCard}>
                                <View style={styles.patientHeader}>
                                    <View style={styles.patientAvatar}>
                                        <Text style={styles.avatarText}>{p.name?.[0]?.toUpperCase() || 'P'}</Text>
                                    </View>
                                    <View style={styles.patientMainInfo}>
                                        <Text style={styles.patientName}>{p.name || 'Paciente'}</Text>
                                        <Text style={styles.patientEmail}>{p.email}</Text>
                                    </View>
                                    <View style={[styles.adherenceBadge, { backgroundColor: getAdherenceColor(p.adherence) + '20' }]}>
                                        <Text style={[styles.adherenceText, { color: getAdherenceColor(p.adherence) }]}>
                                            {Math.round(p.adherence * 100)}% Ades?o
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Ionicons name="medical-outline" size={18} color="#6B7280" />
                                        <Text style={styles.statValue}>{p.takenCount}/{p.totalReminders}</Text>
                                        <Text style={styles.statLabel}>Rem?dios hoje</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Ionicons name="heart-outline" size={18} color="#6B7280" />
                                        <Text style={styles.statValue}>
                                            {p.lastHealth ? `${p.lastHealth.systolic}/${p.lastHealth.diastolic}` : '--/--'}
                                        </Text>
                                        <Text style={styles.statLabel}>?ltima Press?o</Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={styles.detailsButton}
                                    onPress={() => navigation.navigate('AdherenceDashboard', { userId: p.id, userName: p.name })}
                                >
                                    <Text style={styles.detailsButtonText}>Ver Relatório Completo</Text>
                                    <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </Card>
                        ))}
                    </Animated.View>
                ) : (
                    <View style={styles.empty}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="heart-half-outline" size={64} color="#D1D5DB" />
                        </View>
                        <Text style={styles.emptyTitle}>Gestão de Cuidado</Text>
                        <Text style={styles.emptyDescription}>
                            Quando alguém convidar você para ser cuidador, os pacientes aparecerão aqui.
                        </Text>
                        <TouchableOpacity 
                            style={styles.addCta}
                            onPress={() => navigation.navigate('Caregiver')}
                        >
                            <Text style={styles.addCtaText}>Gerenciar meus vínculos</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 24, 
        paddingTop: 16, 
        paddingBottom: 24 
    },
    headerSubtitle: { fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 26, fontFamily: theme.fonts.bold, color: theme.colors.text, marginTop: -2 },
    settingsButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
    content: { padding: 24 },
    statusBanner: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, marginBottom: 24, alignItems: 'center' },
    bannerText: { fontSize: 14, fontFamily: theme.fonts.body, color: '#6B7280' },
    patientCard: { padding: 20, marginBottom: 20, borderRadius: 24 },
    patientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    patientAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    avatarText: { fontSize: 22, fontFamily: theme.fonts.bold, color: '#4F46E5' },
    patientMainInfo: { flex: 1 },
    patientName: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.text },
    patientEmail: { fontSize: 13, fontFamily: theme.fonts.body, color: '#9CA3AF' },
    adherenceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    adherenceText: { fontSize: 12, fontFamily: theme.fonts.bold },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 16, fontFamily: theme.fonts.bold, color: theme.colors.text, marginTop: 4 },
    statLabel: { fontSize: 11, fontFamily: theme.fonts.body, color: '#9CA3AF', textTransform: 'uppercase' },
    detailsButton: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 14, 
        backgroundColor: '#F0FDF4', 
        borderRadius: 16 
    },
    detailsButtonText: { fontSize: 14, fontFamily: theme.fonts.bold, color: theme.colors.primary, marginRight: 8 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { marginBottom: 20, opacity: 0.5 },
    emptyTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: theme.colors.text, marginBottom: 8 },
    emptyDescription: { textAlign: 'center', fontSize: 15, fontFamily: theme.fonts.body, color: '#9CA3AF', lineHeight: 22, maxWidth: '80%', marginBottom: 30 },
    addCta: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20 },
    addCtaText: { color: '#FFF', fontSize: 16, fontFamily: theme.fonts.bold }
});
