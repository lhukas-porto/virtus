import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, SafeAreaView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { generateHealthReport } from '../services/reports';

export const HealthLogScreen = () => {
    const { session, profile } = useAuth();
    const navigation = useNavigation<any>();
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const userName = profile?.name || session?.user?.user_metadata?.name || 'Vitus';

    const fetchHistory = async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('health_measurements')
                .select('*')
                .eq('profile_id', session.user.id)
                .order('measured_at', { ascending: false });

            if (data) setHistory(data);
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao buscar histórico:', e);
        } finally {
            setFetching(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchHistory();
        }, [session])
    );

    const handleSave = async () => {
        if (!systolic || !diastolic) {
            if (Platform.OS === 'web') window.alert('Por favor, preencha a pressão arterial.');
            else Alert.alert('Ops!', 'Por favor, preencha a pressão arterial.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('health_measurements').insert([
                {
                    profile_id: session?.user?.id,
                    systolic: parseInt(systolic),
                    diastolic: parseInt(diastolic),
                    heart_rate: heartRate ? parseInt(heartRate) : null,
                },
            ]);

            if (error) throw error;

            if (Platform.OS === 'web') window.alert('Medição salva com sucesso! 🌿');
            else Alert.alert('Sucesso!', 'Sua medição foi registrada.');

            setSystolic('');
            setDiastolic('');
            setHeartRate('');
            fetchHistory();
        } catch (error: any) {
            if (Platform.OS === 'web') window.alert('Erro ao salvar: ' + error.message);
            else Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };



    return (
        <View style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                enabled={Platform.OS !== 'web'}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    showsVerticalScrollIndicator={false}
                    style={Platform.OS === 'web' ? { flex: 1, overflowY: 'auto' } as any : { flex: 1 }}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Minha Saúde 🩺</Text>
                        <Text style={styles.subtitle}>Como estão seus sinais hoje?</Text>
                    </View>

                    <Card style={styles.mainCard}>
                        <View style={styles.inputSection}>
                            <Text style={styles.sectionLabel}>Pressão Arterial</Text>
                            <View style={styles.pressureRow}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.largeInput}
                                        value={systolic}
                                        onChangeText={setSystolic}
                                        placeholder="120"
                                        keyboardType="numeric"
                                        maxLength={3}
                                    />
                                    <Text style={styles.unitLabel}>Sistólica</Text>
                                </View>
                                <Text style={styles.separator}>/</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.largeInput}
                                        value={diastolic}
                                        onChangeText={setDiastolic}
                                        placeholder="80"
                                        keyboardType="numeric"
                                        maxLength={3}
                                    />
                                    <Text style={styles.unitLabel}>Diastólica</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputSection}>
                            <Text style={styles.sectionLabel}>Batimentos (BPM)</Text>
                            <View style={styles.heartRateContainer}>
                                <Ionicons name="heart" size={24} color={theme.colors.alert} style={{ marginRight: 12 }} />
                                <TextInput
                                    style={styles.midInput}
                                    value={heartRate}
                                    onChangeText={setHeartRate}
                                    placeholder="75"
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.unitInline}>bpm</Text>
                            </View>
                        </View>
                    </Card>

                    <Button
                        title={loading ? "Salvando..." : "Registrar Agora"}
                        onPress={handleSave}
                        style={styles.saveButton}
                    />

                    <TouchableOpacity onPress={() => navigation.navigate('HealthReports')} style={styles.reportRow}>
                        <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.reportRowText}>Relatório PDF</Text>
                    </TouchableOpacity>

                    {/* History Section */}
                    <View style={styles.historySection}>
                        <Text style={styles.historyTitle}>Últimos Registros</Text>
                        {fetching ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : history.length > 0 ? (
                            history.map((item) => (
                                <View key={item.id} style={styles.historyItem}>
                                    <View style={styles.historyDateBox}>
                                        <Text style={styles.historyDay}>{new Date(item.measured_at).getDate()}</Text>
                                        <Text style={styles.historyMonth}>
                                            {new Date(item.measured_at).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.historyContent}>
                                        <Text style={styles.historyPA}>{item.systolic}/{item.diastolic} mmHg</Text>
                                        <Text style={styles.historySub}>
                                            <Ionicons name="heart-outline" size={14} /> {item.heart_rate || '--'} bpm • {new Date(item.measured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyHistory}>Ainda não há registros de saúde.</Text>
                        )}
                    </View>

                    <Text style={styles.infoText}>
                        Seus dados são salvos de forma segura para acompanhamento médico. 🔒
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        padding: 24,
        paddingBottom: Platform.OS === 'web' ? 120 : 40,
    },
    header: {
        marginBottom: 32,
        marginTop: 10,
    },
    title: {
        fontSize: 32,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
    },
    subtitle: {
        fontSize: 18,
        color: theme.colors.text,
        opacity: 0.6,
        fontFamily: theme.fonts.body,
        marginTop: 4,
    },
    mainCard: {
        padding: 20,
        backgroundColor: theme.colors.surface,
        marginBottom: 14,
    },
    inputSection: {
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 15,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 16,
    },
    pressureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputWrapper: {
        alignItems: 'center',
    },
    largeInput: {
        fontSize: 40,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        textAlign: 'center',
        minWidth: 68,
    },
    unitLabel: {
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.4,
        textTransform: 'uppercase',
    },
    separator: {
        fontSize: 34,
        color: theme.colors.border,
        marginHorizontal: 12,
        fontFamily: theme.fonts.body,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        width: '100%',
        marginVertical: 20,
        opacity: 0.5,
    },
    heartRateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
    },
    midInput: {
        fontSize: 20,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        minWidth: 42,
        textAlign: 'center',
    },
    unitInline: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginLeft: 8,
    },
    saveButton: {
        marginTop: 12,
    },
    reportRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 12,
        gap: 8,
    },
    reportRowText: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
        fontSize: 14,
    },
    historySection: {
        marginTop: 32,
        marginBottom: 20,
    },
    historyTitle: {
        fontSize: 22,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        marginBottom: 16,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    historyDateBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    historyDay: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    },
    historyMonth: {
        fontSize: 10,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        marginTop: -2,
    },
    historyContent: {
        flex: 1,
    },
    historyPA: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    historySub: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginTop: 2,
    },
    emptyHistory: {
        textAlign: 'center',
        color: theme.colors.text,
        opacity: 0.4,
        fontFamily: theme.fonts.body,
        marginTop: 20,
    },
    infoText: {
        textAlign: 'center',
        fontSize: 14,
        color: theme.colors.text,
        opacity: 0.4,
        marginTop: 24,
        marginBottom: 40,
        fontFamily: theme.fonts.body,
    }
});
