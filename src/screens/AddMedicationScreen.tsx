import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, SafeAreaView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleMedicationReminder, requestNotificationPermissions } from '../services/notifications';

const FREQUENCIES = [
    { label: 'Diário', value: '24' },
    { label: '12 em 12h', value: '12' },
    { label: '8 em 8h', value: '8' },
    { label: '4 em 4h', value: '4' },
];

export const AddMedicationScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    // Initial med info from scanner
    const medInfo = route.params?.medInfo || null;
    const initialBarcode = route.params?.barcode || (medInfo?.gtin || '');

    const [name, setName] = useState(medInfo?.name || '');
    const [dosage, setDosage] = useState('');
    const [instructions, setInstructions] = useState(medInfo?.description || '');
    const [reminderTime, setReminderTime] = useState('08:00');
    const [frequency, setFrequency] = useState('24'); // Default daily
    const [loading, setLoading] = useState(false);

    // For selecting from Armenian (My Cupboard)
    const [myMedications, setMyMedications] = useState<any[]>([]);
    const [showMedSelector, setShowMedSelector] = useState(false);
    const [fetchingMeds, setFetchingMeds] = useState(false);

    useEffect(() => {
        fetchMyMedications();
    }, []);

    const fetchMyMedications = async () => {
        if (!session?.user?.id) return;
        setFetchingMeds(true);
        try {
            const { data, error } = await supabase
                .from('medications')
                .select('*')
                .eq('profile_id', session.user.id)
                .order('name', { ascending: true });

            if (data) setMyMedications(data);
        } catch (e) {
            console.error(e);
        } finally {
            setFetchingMeds(false);
        }
    };

    const handleSelectExistingMed = (med: any) => {
        setName(med.name);
        setDosage(med.dosage || '');
        setInstructions(med.instructions || '');
        setShowMedSelector(false);
    };

    const handleSave = async () => {
        if (!name) {
            if (Platform.OS === 'web') window.alert('O nome do medicamento é obrigatório.');
            else Alert.alert('Ops!', 'O nome do medicamento é obrigatório.');
            return;
        }

        setLoading(true);
        try {
            const hasPermission = await requestNotificationPermissions();

            // Frequency text for instructions
            const freqLabel = FREQUENCIES.find(f => f.value === frequency)?.label;

            const { data, error } = await supabase.from('medications').insert([
                {
                    profile_id: session?.user?.id,
                    name,
                    dosage,
                    barcode: initialBarcode,
                    instructions: `${instructions}${instructions ? ' - ' : ''}${freqLabel} das ${reminderTime}`,
                },
            ]).select();

            if (error) throw error;

            if (hasPermission && data && data[0]) {
                await scheduleMedicationReminder(name, reminderTime, data[0].id);
            }

            if (Platform.OS === 'web') window.alert('Agenda e Alarme configurados! 🌿');
            else Alert.alert('Sucesso!', 'Agenda e Alarme configurados! 🌿');
            navigation.navigate('Main', { screen: 'Alarmes' });
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
                        <Text style={styles.title}>Configurar Alarme</Text>
                        <Text style={styles.subtitle}>Defina o horário e a frequência.</Text>
                    </View>

                    {!medInfo && myMedications.length > 0 && (
                        <TouchableOpacity
                            style={styles.selectorToggle}
                            onPress={() => setShowMedSelector(!showMedSelector)}
                        >
                            <Ionicons name="apps-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.selectorToggleText}>
                                {showMedSelector ? 'Ocultar Meus Remédios' : 'Escolher do meu Armário'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {showMedSelector && (
                        <Card style={styles.medPickerCard}>
                            <Text style={styles.pickerTitle}>Meus Medicamentos</Text>
                            {myMedications.map(med => (
                                <TouchableOpacity
                                    key={med.id}
                                    style={styles.pickerItem}
                                    onPress={() => handleSelectExistingMed(med)}
                                >
                                    <Text style={styles.pickerItemText}>{med.name}</Text>
                                    <Ionicons name="chevron-forward" size={18} color={theme.colors.border} />
                                </TouchableOpacity>
                            ))}
                        </Card>
                    )}

                    {medInfo?.image && (
                        <Card style={styles.imageCard}>
                            <Image source={{ uri: medInfo.image }} style={styles.medImage} />
                            {medInfo.brand && <Text style={styles.brandTag}>{medInfo.brand}</Text>}
                        </Card>
                    )}

                    <Card style={styles.mainCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Medicamento</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Nome do remédio"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Dosagem</Text>
                            <TextInput
                                style={styles.input}
                                value={dosage}
                                onChangeText={setDosage}
                                placeholder="Ex: 1 comprimido, 50mg..."
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                                <Text style={styles.label}>Horário Inicial</Text>
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
                            <Text style={styles.label}>Frequência</Text>
                            <View style={styles.freqContainer}>
                                {FREQUENCIES.map((f) => (
                                    <TouchableOpacity
                                        key={f.value}
                                        onPress={() => setFrequency(f.value)}
                                        style={[
                                            styles.freqChip,
                                            frequency === f.value && styles.freqChipActive
                                        ]}
                                    >
                                        <Text style={[
                                            styles.freqChipText,
                                            frequency === f.value && styles.freqChipTextActive
                                        ]}>
                                            {f.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {medInfo?.bulaUrl && (
                            <TouchableOpacity
                                style={styles.bulaLink}
                                onPress={() => Alert.alert('Bula', 'Deseja abrir a bula oficial no navegador?', [
                                    { text: 'Não' },
                                    { text: 'Sim', onPress: () => { /* open link */ } }
                                ])}
                            >
                                <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                                <Text style={styles.bulaText}>Ver Bula Digital</Text>
                            </TouchableOpacity>
                        )}
                    </Card>

                    <Button
                        title={loading ? "Salvando..." : "Salvar Alarme"}
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
        marginBottom: 24,
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
    selectorToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: theme.colors.primary + '10',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.primary + '30',
    },
    selectorToggleText: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
        marginLeft: 8,
    },
    medPickerCard: {
        marginBottom: 24,
        padding: 16,
    },
    pickerTitle: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.5,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    pickerItemText: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
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
    freqContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    freqChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFF',
    },
    freqChipActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    freqChipText: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.6,
    },
    freqChipTextActive: {
        color: theme.colors.primary,
        opacity: 1,
    },
    saveButton: {
        marginTop: 12,
        marginBottom: 40,
    },
    imageCard: {
        padding: 0,
        overflow: 'hidden',
        height: 180,
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
