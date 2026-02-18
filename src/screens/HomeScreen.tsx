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

                {/* Next Dose Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Sua Próxima Dose</Text>
                    </View>

                    {nextMed ? (
                        <Card style={styles.nextDoseCard}>
                            <View style={styles.doseInfo}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="medical" size={32} color={theme.colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.medName}>
                                        {nextMed.name} {nextMed.dosage}
                                    </Text>
                                    <View style={styles.timeBadge}>
                                        <Ionicons name="time-outline" size={16} color={theme.colors.text} style={{ opacity: 0.6 }} />
                                        <Text style={styles.doseTime}>
                                            {nextMed.instructions || 'Aguardando horário'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </Card>
                    ) : (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AddMedication')}
                            activeOpacity={0.7}
                        >
                            <Card style={styles.emptyCard}>
                                <Ionicons name="add-circle-outline" size={48} color={theme.colors.primary} style={{ marginBottom: 12, opacity: 0.5 }} />
                                <Text style={styles.emptyText}>Adicionar Medicamento</Text>
                                <Text style={styles.emptySubtext}>Nenhum registro encontrado ainda.</Text>
                            </Card>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Daily Agenda Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Agenda de Hoje 📅</Text>
                    {allMeds.length > 0 ? (
                        allMeds.map((med: any) => (
                            <Card key={med.id} style={styles.agendaCard}>
                                <View style={styles.agendaInfo}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.agendaMedName}>{med.name}</Text>
                                        <Text style={styles.agendaMedDosage}>{med.dosage}</Text>
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
                        <Text style={styles.noAgendaText}>Configure seus lembretes para ver sua agenda aqui.</Text>
                    )}
                </View>


                {/* Quick Action Button */}
                <View style={styles.actionsGrid}>
                    <Button
                        title="+ Anotar Sinais"
                        onPress={() => navigation.navigate('HealthLog')}
                        type="secondary"
                        style={styles.actionButton}
                    />
                    <Button
                        title="+ Novo Remédio"
                        onPress={() => navigation.navigate('AddMedication')}
                        type="secondary"
                        style={styles.actionButton}
                    />
                </View>

                {/* Emergency Section */}
                <TouchableOpacity
                    onPress={() => Alert.alert('Ajuda', 'Ligando para seu contato de emergência...')}
                    activeOpacity={0.9}
                    style={styles.emergencyWrapper}
                >
                    <View style={styles.emergencyCard}>
                        <Ionicons name="call" size={24} color="#FFF" />
                        <Text style={styles.emergencyText}>PEDIR AJUDA AGORA</Text>
                    </View>
                </TouchableOpacity>
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
    emptyCard: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#F9F9F9',
        borderStyle: 'dashed',
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 24,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginTop: 4,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
    },
    emergencyWrapper: {
        marginBottom: 40,
    },
    emergencyCard: {
        backgroundColor: theme.colors.alert,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 64,
        shadowColor: theme.colors.alert,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    emergencyText: {
        color: '#FFF',
        fontFamily: theme.fonts.bold,
        fontSize: 16,
        marginLeft: 10,
        letterSpacing: 1,
    }
});
