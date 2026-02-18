import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, Platform } from 'react-native';
import { theme } from '../theme/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export const HomeScreen = () => {
    const { session, profile } = useAuth();
    const navigation = useNavigation<any>();
    const [nextMed, setNextMed] = React.useState<any>(null);
    const [allMeds, setAllMeds] = React.useState<any[]>([]);
    const [checkedMeds, setCheckedMeds] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);

    const userName = profile?.name || session?.user?.user_metadata?.name || 'Vitus';

    const fetchData = async () => {
        if (!session?.user?.id) return;

        try {
            setLoading(true);

            // 1. Get All Medications for Agenda
            const { data: meds } = await supabase
                .from('medications')
                .select('*')
                .order('created_at', { ascending: true });

            if (meds) {
                setAllMeds(meds);
                // Set the first one as nextMed for simplicity in this demo
                setNextMed(meds[0] || null);
            }

            // 2. Get Today's Logs to check off meds
            const today = new Date().toISOString().split('T')[0];
            const { data: logs } = await supabase
                .from('medication_logs')
                .select('medication_id')
                .eq('profile_id', session.user.id)
                .gte('logged_at', today);

            if (logs) {
                setCheckedMeds(logs.map(l => l.medication_id));
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsTaken = async (medId: string) => {
        if (checkedMeds.includes(medId)) return;

        try {
            const { error } = await supabase.from('medication_logs').insert([
                {
                    profile_id: session?.user?.id,
                    medication_id: medId,
                    status: 'taken'
                }
            ]);

            if (error) throw error;

            setCheckedMeds(prev => [...prev, medId]);

            if (Platform.OS === 'web') window.alert('Parabéns! Mais uma vitória para sua saúde. 🌿');
            else Alert.alert('Vitória!', 'Remédio registrado com sucesso.');

        } catch (e: any) {
            Alert.alert('Erro', 'Não foi possível registrar a dose.');
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
        }, [session])
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Olá,</Text>
                        <Text style={styles.userName}>{userName}! 🌿</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileChip}
                        onPress={() => navigation.navigate('Perfil')}
                    >
                        <Ionicons name="person-circle" size={40} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Daily Agenda Section */}
                <View style={[styles.section, { flex: 1 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Agenda de Hoje 📅</Text>
                        <TouchableOpacity onPress={fetchData}>
                            <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {allMeds.length > 0 ? (
                        allMeds.map((med: any) => (
                            <Card key={med.id} style={styles.agendaCard}>
                                <View style={styles.agendaInfo}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.agendaMedName}>{med.name}</Text>
                                        <Text style={styles.agendaMedDosage}>
                                            {med.dosage} • {med.instructions?.split(' - ')[1] || 'Horário não definido'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.checkCircle,
                                            checkedMeds.includes(med.id) && styles.checkCircleActive
                                        ]}
                                        onPress={() => handleMarkAsTaken(med.id)}
                                    >
                                        <Ionicons
                                            name={checkedMeds.includes(med.id) ? "checkmark" : "add"}
                                            size={24}
                                            color={checkedMeds.includes(med.id) ? "#FFF" : theme.colors.primary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={64} color={theme.colors.border} />
                            <Text style={styles.noAgendaText}>Tudo limpo por aqui!{'\n'}Adicione um remédio para começar.</Text>
                        </View>
                    )}
                </View>

                {/* Single Clean Add Button */}
                <Button
                    title="+ Adicionar Novo Alarme"
                    onPress={() => navigation.navigate('Scanner')}
                    style={styles.mainAddButton}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        padding: 24,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
    },
    greeting: {
        fontSize: 20,
        color: theme.colors.text,
        opacity: 0.6,
        fontFamily: theme.fonts.body,
    },
    userName: {
        fontSize: 32,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
        marginTop: -4,
    },
    profileChip: {
        padding: 4,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
    },
    nextDoseCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    doseInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F0F7F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    medName: {
        fontSize: 19,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    doseTime: {
        fontSize: 15,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.6,
        marginLeft: 4,
    },
    agendaCard: {
        marginBottom: 12,
        padding: 16,
    },
    agendaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    agendaMedName: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    agendaMedDosage: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
    },
    checkCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkCircleActive: {
        backgroundColor: theme.colors.primary,
    },
    noAgendaText: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.4,
        textAlign: 'center',
        marginTop: 10,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    mainAddButton: {
        marginTop: 20,
        marginBottom: 40,
    }
});
