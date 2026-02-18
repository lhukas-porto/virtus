import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';

export default function AddHealthLog() {
    const { user } = useAuth();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);

    useEffect(() => {
        if (id) {
            loadHealthLog(id);
        }
    }, [id]);

    const loadHealthLog = async (logId: string) => {
        try {
            setFetching(true);
            const { data, error } = await supabase
                .from('health_logs')
                .select('*')
                .eq('id', logId)
                .single();

            if (error) throw error;
            if (data) {
                setSystolic(data.systolic.toString());
                setDiastolic(data.diastolic.toString());
                setHeartRate(data.heart_rate ? data.heart_rate.toString() : '');
                if (data.time) setTime(data.time);
            }
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível carregar os dados do registro.');
        } finally {
            setFetching(false);
        }
    };

    const handleTimeChange = (text: string) => {
        let cleaned = text.replace(/\D/g, '');
        if (cleaned.length > 4) cleaned = cleaned.slice(0, 4);
        let masked = cleaned;
        if (cleaned.length > 2) {
            masked = `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
        }
        setTime(masked);
    };

    const handleSave = async () => {
        if (!systolic || !diastolic) {
            Alert.alert('Erro', 'Por favor, insira a pressão arterial (Sistólica e Diastólica).');
            return;
        }

        setLoading(true);
        try {
            const logData = {
                user_id: user?.id,
                systolic: parseInt(systolic),
                diastolic: parseInt(diastolic),
                heart_rate: heartRate ? parseInt(heartRate) : null,
                time: time || null,
            };

            let error;
            if (id) {
                const { error: updateError } = await supabase
                    .from('health_logs')
                    .update(logData)
                    .eq('id', id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('health_logs')
                    .insert([logData]);
                error = insertError;
            }

            if (error) throw error;

            Alert.alert('Sucesso', `Registro de saúde ${id ? 'atualizado' : 'salvo'}!`, [
                { text: 'OK', onPress: () => router.replace('/') }
            ]);
        } catch (error: any) {
            Alert.alert('Erro ao salvar', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ title: id ? 'Editar Registro' : 'Registrar Sinais Vitais', headerShown: true }} />

            {fetching ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 16, color: theme.colors.gray600 }}>Carregando dados...</Text>
                </View>
            ) : (
                <View style={styles.content}>
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <Ionicons name="heart" size={24} color={theme.colors.accent} />
                            <Text style={styles.cardTitle}>Pressão arterial</Text>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Sistólica (Máx)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ex: 120"
                                    value={systolic}
                                    onChangeText={setSystolic}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ width: 20, alignItems: 'center', justifyContent: 'center', top: 15 }}>
                                <Text style={{ fontSize: 24, color: theme.colors.gray400 }}>/</Text>
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Diastólica (Mín)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ex: 80"
                                    value={diastolic}
                                    onChangeText={setDiastolic}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <Text style={styles.helperText}>Exemplo: 120 / 80 mmHg (conhecido como 12 por 8)</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.header}>
                            <Ionicons name="pulse" size={24} color={theme.colors.primary} />
                            <Text style={styles.cardTitle}>Frequência cardíaca</Text>
                        </View>

                        <Text style={styles.label}>Batimentos por Minuto (BPM)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="ex: 70"
                            value={heartRate}
                            onChangeText={setHeartRate}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.card}>
                        <View style={styles.header}>
                            <Ionicons name="time" size={24} color={theme.colors.gray600} />
                            <Text style={styles.cardTitle}>Horário da medição</Text>
                        </View>

                        <Text style={styles.label}>Hora (HH:mm)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="ex: 08:00"
                            value={time}
                            onChangeText={handleTimeChange}
                            keyboardType="numeric"
                            maxLength={5}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>{id ? 'Salvar Alterações' : 'Salvar Registro'}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelLink} onPress={() => router.replace('/')}>
                        <Text style={styles.cancelText}>Cancelar e Voltar</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        ...theme.components.shadow,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginLeft: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputGroup: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        color: theme.colors.gray600,
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.colors.gray100,
        borderRadius: 12,
        padding: 16,
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
        textAlign: 'center',
    },
    helperText: {
        fontSize: 12,
        color: theme.colors.gray400,
        marginTop: 12,
        textAlign: 'center',
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
        ...theme.components.shadow,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelLink: {
        marginTop: 20,
        alignItems: 'center',
    },
    cancelText: {
        color: theme.colors.accent,
        fontSize: 16,
    },
});
