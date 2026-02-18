import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, SafeAreaView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const HealthLogScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation();
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [loading, setLoading] = useState(false);

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
            navigation.goBack();
        } catch (error: any) {
            if (Platform.OS === 'web') window.alert('Erro ao salvar: ' + error.message);
            else Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Diário de Saúde</Text>
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

                    <Text style={styles.infoText}>
                        Seus dados são salvos de forma segura para acompanhamento médico. 🔒
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
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
    },
    header: {
        marginBottom: 32,
        marginTop: 10,
    },
    backButton: {
        marginBottom: 16,
        marginLeft: -10,
        padding: 10,
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
        padding: 32,
        backgroundColor: theme.colors.surface,
    },
    inputSection: {
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 20,
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
        fontSize: 48,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        textAlign: 'center',
        minWidth: 80,
    },
    unitLabel: {
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.4,
        textTransform: 'uppercase',
    },
    separator: {
        fontSize: 40,
        color: theme.colors.border,
        marginHorizontal: 15,
        fontFamily: theme.fonts.body,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        width: '100%',
        marginVertical: 32,
        opacity: 0.5,
    },
    heartRateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
    },
    midInput: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        minWidth: 50,
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
    infoText: {
        textAlign: 'center',
        fontSize: 14,
        color: theme.colors.text,
        opacity: 0.4,
        marginTop: 24,
        fontFamily: theme.fonts.body,
    }
});
