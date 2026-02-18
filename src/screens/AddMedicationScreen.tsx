import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { scheduleMedicationReminder, requestNotificationPermissions } from '../services/notifications';
import * as ImagePicker from 'expo-image-picker';

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

    // Se não veio do scanner (pesquisa ok), é manual
    const isManual = !medInfo;

    const [name, setName] = useState(medInfo?.name || '');
    const [dosage, setDosage] = useState('');
    const [instructions, setInstructions] = useState(medInfo?.description || '');
    const [reminderTime, setReminderTime] = useState('08:00');
    const [frequency, setFrequency] = useState('24'); // Default daily
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(medInfo?.image || null);

    const handleTimeChange = (text: string) => {
        // Remove anything not digit
        let cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length > 4) cleaned = cleaned.slice(0, 4);

        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
        }
        setReminderTime(formatted);
    };

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

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Epa!', 'Precisamos de acesso às suas fotos para adicionar uma imagem.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Epa!', 'Precisamos de acesso à câmera para tirar a foto.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name) {
            const msg = 'O nome do medicamento é obrigatório.';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Ops!', msg);
            return;
        }

        setLoading(true);
        try {
            const hasPermission = await requestNotificationPermissions();
            const freqLabel = FREQUENCIES.find(f => f.value === frequency)?.label;

            // Se for manual, não montamos instruções de alarme
            const finalInstructions = isManual
                ? (instructions || 'Cadastrado manualmente')
                : `${instructions}${instructions ? ' - ' : ''}${freqLabel} das ${reminderTime}`;

            const { data, error } = await supabase.from('medications').insert([
                {
                    profile_id: session?.user?.id,
                    name,
                    dosage,
                    barcode: initialBarcode,
                    instructions: finalInstructions,
                    image_url: image, // Salvando a URI local ou da internet
                },
            ]).select();

            if (error) throw error;

            // Só agenda lembrete se não for manual (fluxo da Lupa Mágica)
            if (!isManual && hasPermission && data && data[0]) {
                await scheduleMedicationReminder(name, reminderTime, data[0].id);
            }

            const successMsg = isManual ? 'Medicamento salvo com sucesso! 🌿' : 'Agenda e Alarme configurados! 🌿';
            if (Platform.OS === 'web') window.alert(successMsg);
            else Alert.alert('Sucesso!', successMsg);

            navigation.navigate('Main', { screen: 'Farmacia' });
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
                        <Text style={styles.title}>{isManual ? 'Cadastro Manual' : 'Configurar Alarme'}</Text>
                        <Text style={styles.subtitle}>
                            {isManual ? 'Preencha as informações básicas.' : 'Defina o horário e a frequência.'}
                        </Text>
                    </View>

                    {/* Card de Descoberta (apenas se veio do Scanner) */}
                    {!isManual && medInfo && (
                        <Card style={styles.discoveryCard}>
                            <View style={styles.discoveryImageContainer}>
                                {medInfo.image ? (
                                    <Image source={{ uri: medInfo.image }} style={styles.discoveryImage} />
                                ) : (
                                    <View style={styles.discoveryImagePlaceholder}>
                                        <Ionicons name="medical" size={40} color={theme.colors.primary} />
                                    </View>
                                )}
                                {medInfo.brand && (
                                    <View style={styles.brandBadge}>
                                        <Text style={styles.brandText}>{medInfo.brand}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.discoveryContent}>
                                <Text style={styles.discoveryLabel}>Identificamos para você:</Text>
                                <Text style={styles.discoveryName}>{medInfo.name}</Text>
                            </View>
                        </Card>
                    )}

                    {!medInfo && myMedications.length > 0 && (
                        <TouchableOpacity
                            style={styles.selectorToggle}
                            onPress={() => setShowMedSelector(!showMedSelector)}
                        >
                            <Ionicons name="apps-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.selectorToggleText}>
                                {showMedSelector ? 'Ocultar Meus Remédios' : 'Escolher dos meus Medicamentos'}
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

                    <Card style={styles.mainCard}>
                        {/* Campo Nome */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Medicamento</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Nome do remédio"
                            />
                        </View>

                        {/* Campo EAN (Código de Barras) */}
                        {initialBarcode ? (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Código de barras (EAN)</Text>
                                <View style={[styles.input, { backgroundColor: '#F0F4F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                                    <Text style={{ fontFamily: theme.fonts.body, color: theme.colors.text }}>{initialBarcode}</Text>
                                    <Ionicons name="barcode-outline" size={20} color={theme.colors.primary} />
                                </View>
                            </View>
                        ) : null}

                        {/* Campo Dosagem */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Dosagem</Text>
                            <TextInput
                                style={styles.input}
                                value={dosage}
                                onChangeText={setDosage}
                                placeholder="Ex: 1 comprimido, 50mg..."
                            />
                        </View>

                        {/* Campos de Foto (Manual) ou Foto identificada */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Foto do Medicamento</Text>
                            {image ? (
                                <View style={styles.imagePreviewContainer}>
                                    <Image source={{ uri: image }} style={styles.imagePreview} />
                                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImage(null)}>
                                        <Ionicons name="close-circle" size={24} color={theme.colors.alert} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.photoActions}>
                                    <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                                        <Ionicons name="camera" size={24} color={theme.colors.primary} />
                                        <Text style={styles.photoBtnText}>Tirar Foto</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                                        <Ionicons name="image" size={24} color={theme.colors.primary} />
                                        <Text style={styles.photoBtnText}>Galeria</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Campos extras apenas para o fluxo NÃO manual (Lupa Mágica) */}
                        {!isManual && (
                            <>
                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                                        <Text style={styles.label}>Horário Inicial</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={reminderTime}
                                            onChangeText={handleTimeChange}
                                            placeholder="08:00"
                                            keyboardType="number-pad"
                                            maxLength={5}
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
                                        onPress={() => {
                                            const msg = 'Deseja abrir a bula oficial no navegador?';
                                            if (Platform.OS === 'web') {
                                                if (window.confirm(msg)) Linking.openURL(medInfo.bulaUrl);
                                            } else {
                                                Alert.alert('Bula', msg, [
                                                    { text: 'Não' },
                                                    { text: 'Sim', onPress: () => Linking.openURL(medInfo.bulaUrl) }
                                                ]);
                                            }
                                        }}
                                    >
                                        <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                                        <Text style={styles.bulaText}>Ver Bula Digital</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </Card>

                    <Button
                        title={loading ? "Salvando..." : isManual ? "Cadastrar Medicamento" : "Salvar Alarme"}
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
    discoveryCard: {
        padding: 0,
        overflow: 'hidden',
        marginBottom: 24,
        backgroundColor: '#FFF',
    },
    discoveryImageContainer: {
        width: '100%',
        height: 180,
        backgroundColor: '#F9F9F9',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    discoveryImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    discoveryImagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    brandText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        textTransform: 'uppercase',
    },
    discoveryContent: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    discoveryLabel: {
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.4,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    discoveryName: {
        fontSize: 22,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
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
    photoActions: {
        flexDirection: 'row',
        gap: 12,
    },
    photoBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary + '10',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.primary + '20',
        gap: 8,
    },
    photoBtnText: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
        fontSize: 14,
    },
    imagePreviewContainer: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F0F0F0',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FFF',
        borderRadius: 12,
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
