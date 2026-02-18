import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, SafeAreaView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleMedicationReminder, requestNotificationPermissions } from '../services/notifications';

export const AddMedicationScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    // Get med info from scanner if available
    const medInfo = route.params?.medInfo || null;
    const initialBarcode = route.params?.barcode || (medInfo?.gtin || '');

    const [name, setName] = useState(medInfo?.name || '');
    const [dosage, setDosage] = useState('');
    const [instructions, setInstructions] = useState(medInfo?.description || '');
    const [reminderTime, setReminderTime] = useState('08:00');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name) {
            if (Platform.OS === 'web') window.alert('O nome do medicamento é obrigatório.');
            else Alert.alert('Ops!', 'O nome do medicamento é obrigatório.');
            return;
        }

        setLoading(true);
        try {
            // 1. Request Notification Permissions
            const hasPermission = await requestNotificationPermissions();

            // 2. Save to Database
            const { data, error } = await supabase.from('medications').insert([
                {
                    profile_id: session?.user?.id,
                    name,
                    dosage,
                    barcode: initialBarcode,
                    // Combine both pieces of info into instructions
                    instructions: `${instructions}${instructions ? ' - ' : ''}Alarme às ${reminderTime}`,
                },
            ]).select();

            if (error) throw error;

            // 3. Schedule Local Notification
            if (hasPermission && data && data[0]) {
                await scheduleMedicationReminder(name, reminderTime, data[0].id);
            }

            if (Platform.OS === 'web') window.alert('Medicamento e Alarme configurados! 🌿');
            else Alert.alert('Sucesso!', 'Medicamento e Alarme configurados! 🌿');
            navigation.navigate('Main', { screen: 'Home' });
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
                        <Text style={styles.title}>Novo Remédio</Text>
                        <Text style={styles.subtitle}>Vamos registrar para não esquecer.</Text>
                    </View>

                    {medInfo?.image && (
                        <Card style={styles.imageCard}>
                            <Image source={{ uri: medInfo.image }} style={styles.medImage} />
                            {medInfo.brand && <Text style={styles.brandTag}>{medInfo.brand}</Text>}
                        </Card>
                    )}

                    <Card style={styles.mainCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nome do Medicamento</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Ex: Losartana"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Dosagem</Text>
                            <TextInput
                                style={styles.input}
                                value={dosage}
                                onChangeText={setDosage}
                                placeholder="Ex: 50mg"
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                                <Text style={styles.label}>Horário do Alarme</Text>
                                <TextInput
                                    style={styles.input}
                                    value={reminderTime}
                                    onChangeText={setReminderTime}
                                    placeholder="08:00"
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>
                            <View style={{ justifyContent: 'center', paddingTop: 20 }}>
                                <Ionicons name="time" size={32} color={theme.colors.primary} />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Observações (Opcional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={instructions}
                                onChangeText={setInstructions}
                                placeholder="Ex: Tomar após o café da manhã"
                                multiline
                            />
                        </View>

                        {initialBarcode ? (
                            <View style={styles.barcodeInfo}>
                                <Ionicons name="barcode-outline" size={20} color={theme.colors.primary} />
                                <Text style={styles.barcodeText}>
                                    {medInfo ? 'Informações Automáticas' : 'Código detectado!'}
                                </Text>
                            </View>
                        ) : null}

                        {medInfo?.bulaUrl && (
                            <TouchableOpacity
                                style={styles.bulaLink}
                                onPress={() => Alert.alert('Bula', 'Deseja abrir a bula oficial no navegador?', [
                                    { text: 'Não' },
                                    { text: 'Sim', onPress: () => { /* link would open here */ } }
                                ])}
                            >
                                <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                                <Text style={styles.bulaText}>Ver Bula Digital</Text>
                            </TouchableOpacity>
                        )}
                    </Card>

                    <Button
                        title={loading ? "Configurando..." : "Salvar e Ativar Alarme"}
                        onPress={handleSave}
                        style={styles.saveButton}
                    />
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
        padding: 24,
        backgroundColor: theme.colors.surface,
    },
    inputGroup: {
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 8,
        opacity: 0.8,
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderRadius: theme.roundness,
        padding: 16,
        fontSize: 18,
        fontFamily: theme.fonts.body,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    barcodeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F7F0',
        padding: 12,
        borderRadius: 12,
        marginTop: -8,
        marginBottom: 16,
    },
    barcodeText: {
        fontSize: 14,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.primary,
        marginLeft: 8,
    },
    saveButton: {
        marginTop: 12,
    },
    imageCard: {
        padding: 0,
        overflow: 'hidden',
        height: 200,
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
    },
    medImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    brandTag: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: theme.colors.primary,
        color: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontFamily: theme.fonts.bold,
    },
    bulaLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        padding: 8,
    },
    bulaText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        textDecorationLine: 'underline',
        marginLeft: 8,
    }
});
