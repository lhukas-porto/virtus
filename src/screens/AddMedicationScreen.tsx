import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking, Modal, StatusBar } from 'react-native';
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
import { identifyMedicineByGTIN } from '../services/medicineIdentification';

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

    const medInfo = route.params?.medInfo || null;
    const editMedication = route.params?.editMedication || null;
    const initialBarcode = editMedication?.barcode || route.params?.barcode || (medInfo?.gtin || '');

    // Se for edição, tenta separar a descrição do alarme para não sobrescrever
    // Formato esperado: "Descrição - Alarme..."
    const existingInstructions = editMedication?.instructions || '';
    const instructionParts = existingInstructions.split(' - ');
    const initialDescription = editMedication ? (instructionParts[0] === 'Cadastrado no Vitus' ? '' : instructionParts[0]) : (medInfo?.description || '');
    // Se houver mais partes, é o alarme. Guardamos para preservar se for o caso.
    const alarmSuffix = instructionParts.length > 1 ? ' - ' + instructionParts.slice(1).join(' - ') : '';

    const [name, setName] = useState(editMedication?.name || medInfo?.name || '');
    const [dosage, setDosage] = useState(editMedication?.dosage || '');
    const [instructions, setInstructions] = useState(initialDescription);
    const [loading, setLoading] = useState(false);

    // EAN Search State
    const [ean, setEan] = useState(initialBarcode);
    const [loadingEan, setLoadingEan] = useState(false);

    const initialImage = editMedication?.image_url || (medInfo?.image && medInfo.image.startsWith('http') ? medInfo.image : null);
    const [image, setImage] = useState<string | null>(initialImage);

    const [brand, setBrand] = useState(editMedication?.brand || medInfo?.brand || '');

    const [showImageModal, setShowImageModal] = useState(false);

    const [myMedications, setMyMedications] = useState<any[]>([]);
    const [showMedSelector, setShowMedSelector] = useState(false);

    useEffect(() => {
        fetchMyMedications();
    }, []);

    const fetchMyMedications = async () => {
        if (!session?.user?.id) return;
        try {
            const { data } = await supabase
                .from('medications')
                .select('*')
                .eq('profile_id', session.user.id)
                .order('name', { ascending: true });
            if (data) setMyMedications(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectExistingMed = (med: any) => {
        Alert.alert(
            'Medicamento Selecionado',
            `Deseja configurar um alarme para ${med.name}?`,
            [
                {
                    text: 'Sim, Configurar Alarme',
                    onPress: () => {
                        setShowMedSelector(false);
                        navigation.navigate('AlarmConfig', { medicationId: med.id, medicationName: med.name });
                    }
                },
                { text: 'Cancelar', style: 'cancel' }
            ]
        );
    };



    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Epa!', 'Precisamos de acesso às suas fotos para adicionar uma imagem.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.85,
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
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.85,
        });
        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSaveMedication = async () => {
        if (!name) {
            Alert.alert('Ops!', 'O nome do medicamento é obrigatório.');
            return;
        }
        setLoading(true);

        // Check duplicate EAN
        if (initialBarcode && !editMedication) {
            const { data: existing } = await supabase
                .from('medications')
                .select('id, name')
                .eq('barcode', initialBarcode)
                .eq('profile_id', session?.user?.id)
                .maybeSingle();

            if (existing) {
                setLoading(false);
                Alert.alert(
                    'Duplicidade Detectada',
                    `O medicamento "${existing.name}" já está cadastrado com este código de barras.`,
                    [
                        { text: 'Editar o Existente', onPress: () => navigation.replace('AddMedication', { editMedication: existing }) },
                        { text: 'Cancelar', style: 'cancel' }
                    ]
                );
                return;
            }
        }

        try {
            // Se edição, preserva a descrição original (sem mexer em alarme antigo se existir no banco, 
            // mas aqui não estamos mais concatenando alarme novo).
            // Como removemos a lógica de alarme daqui, instructions é apenas a descrição.

            // Se o usuário editou instructions, salvamos o novo valor.
            // Se existia um suffix de alarme antigo e o usuário editou o texto todo, o suffix pode ter sido apagado visualmente?
            // Na inicialização do state 'instructions', nós removemos o suffix.
            // Se salvarmos agora, vamos perder o suffix antigo se não o recolocarmos?
            // O usuário pediu para TIRAR a função de definir alarme.
            // Mas se eu editar um remédio que TINHA alarme, e salvar sem o suffix, o alarme quebra?
            // O alarme depende da string instructions? Sim, o parse é feito lá.
            // Se eu remover o suffix, o 'MedicationDetailScreen' vai mostrar "Sem alarme configurado".

            // Decisão: Manter o suffix ANTIGO se ele existia, para não quebrar alarmes existentes ao editar dados básicos.
            const finalInstructions = editMedication ? (instructions + alarmSuffix) : instructions;

            const medData = {
                profile_id: session?.user?.id,
                name,
                dosage,
                brand,
                barcode: initialBarcode,
                instructions: finalInstructions || 'Cadastrado no Vitus',
                image_url: image,
            };

            if (editMedication) {
                // UPDATE
                const { error } = await supabase
                    .from('medications')
                    .update(medData)
                    .eq('id', editMedication.id);

                if (error) throw error;
                Alert.alert('Atualizado!', 'Medicamento atualizado com sucesso.');
            } else {
                // INSERT
                const { error } = await supabase.from('medications').insert([medData]);
                if (error) throw error;
                Alert.alert('Sucesso!', 'Medicamento cadastrado na sua farmácia.');
            }

            navigation.goBack();

        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchEAN = async () => {
        if (!ean || ean.length < 8) return;
        setLoadingEan(true);
        try {
            const result = await identifyMedicineByGTIN(ean);
            if (result) {
                if (result.name) setName(result.name);
                if (result.brand) setBrand(result.brand);
                if (result.description) setInstructions(result.description);
                if (result.image) setImage(result.image);
                if (result.dosage) setDosage(result.dosage || '');
                Alert.alert('Sucesso', 'Medicamento encontrado no catálogo!');
            } else {
                Alert.alert('Não encontrado', 'Não encontramos este código no nosso catálogo.');
            }
        } catch (e) {
            Alert.alert('Erro', 'Falha ao buscar código EAN.');
        } finally {
            setLoadingEan(false);
        }
    };



    return (
        <>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.backButton}
                            >
                                <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.title}>
                                {editMedication ? 'Editar Medicamento' : 'Novo Medicamento'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {editMedication ? 'Altere os dados abaixo.' : 'Preencha os dados do medicamento.'}
                            </Text>
                        </View>

                        {/* ETAPA 1: DADOS DO MEDICAMENTO */}
                        {/* FORMULÁRIO */}
                        <>
                            {/* Card de Descoberta (apenas se veio do Scanner) */}
                            {medInfo && (
                                <Card style={styles.discoveryCard}>
                                    <View style={styles.discoveryImageContainer}>
                                        {medInfo.image ? (
                                            <Image
                                                source={{ uri: medInfo.image }}
                                                style={styles.discoveryImage}
                                                onError={() => setImage(null)}
                                            />
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
                                        {!medInfo.image && (
                                            <View style={styles.noImageHint}>
                                                <Ionicons name="camera-outline" size={14} color={theme.colors.accent} />
                                                <Text style={styles.noImageHintText}>
                                                    Sem foto online — adicione uma abaixo ↓
                                                </Text>
                                            </View>
                                        )}
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
                                {/* Nome */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Medicamento</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Nome do remédio"
                                    />
                                </View>

                                {/* Laboratório */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Laboratório / Marca</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={brand}
                                        onChangeText={setBrand}
                                        placeholder="Ex: Medley, EMS, Sanofi..."
                                    />
                                </View>

                                {/* EAN Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Código de barras (EAN)</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TextInput
                                            style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                                            value={ean}
                                            onChangeText={setEan}
                                            placeholder="Digite ou scaneie o EAN"
                                            keyboardType="numeric"
                                            onBlur={() => { if (ean && ean.length > 7) handleSearchEAN(); }}
                                        />
                                        <TouchableOpacity
                                            style={{
                                                height: 50,
                                                backgroundColor: theme.colors.primary,
                                                paddingHorizontal: 16,
                                                borderTopRightRadius: 12,
                                                borderBottomRightRadius: 12,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}
                                            onPress={handleSearchEAN}
                                            disabled={loadingEan}
                                        >
                                            {loadingEan ? (
                                                <ActivityIndicator color="#FFF" size="small" />
                                            ) : (
                                                <Ionicons name="search" size={20} color="#FFF" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Dosagem */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Dosagem</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={dosage}
                                        onChangeText={setDosage}
                                        placeholder="Ex: 1 comprimido, 50mg..."
                                    />
                                </View>

                                {/* Resumo / Indicação */}
                                <View style={styles.inputGroup}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                        <Text style={[styles.label, { marginBottom: 0 }]}>Resumo / Indicação</Text>
                                        {instructions ? (
                                            <View style={styles.autoBadge}>
                                                <Ionicons name="sparkles" size={10} color={theme.colors.primary} />
                                                <Text style={styles.autoText}>Auto</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={instructions}
                                        onChangeText={setInstructions}
                                        placeholder="Para que serve este remédio? Ex: Analgésico e antitérmico, usado para dores e febre..."
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />
                                </View>

                                {/* Foto */}
                                <View style={styles.inputGroup}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={[styles.label, { marginBottom: 0 }]}>Foto do Medicamento</Text>
                                        {!image && (
                                            <View style={styles.warningBadge}>
                                                <Text style={styles.warningText}>Recomendado</Text>
                                            </View>
                                        )}
                                    </View>

                                    {image ? (
                                        <View>
                                            <View style={styles.imagePreviewContainer}>
                                                <Image
                                                    source={{ uri: image }}
                                                    style={styles.imagePreview}
                                                    onError={() => setImage(null)}
                                                />
                                            </View>
                                            <View style={styles.photoActionBar}>
                                                <TouchableOpacity
                                                    style={styles.photoActionBtn}
                                                    onPress={() => setShowImageModal(true)}
                                                >
                                                    <Ionicons name="expand-outline" size={18} color={theme.colors.primary} />
                                                    <Text style={styles.photoActionText}>Ampliar</Text>
                                                </TouchableOpacity>
                                                <View style={styles.photoActionDivider} />
                                                <TouchableOpacity
                                                    style={styles.photoActionBtn}
                                                    onPress={takePhoto}
                                                >
                                                    <Ionicons name="camera-outline" size={18} color={theme.colors.primary} />
                                                    <Text style={styles.photoActionText}>Substituir</Text>
                                                </TouchableOpacity>
                                                <View style={styles.photoActionDivider} />
                                                <TouchableOpacity
                                                    style={styles.photoActionBtn}
                                                    onPress={() => setImage(null)}
                                                >
                                                    <Ionicons name="trash-outline" size={18} color={theme.colors.alert} />
                                                    <Text style={[styles.photoActionText, { color: theme.colors.alert }]}>Apagar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.photoActions}>
                                            <TouchableOpacity style={[styles.photoBtn, { backgroundColor: theme.colors.primary, flex: 2 }]} onPress={takePhoto}>
                                                <Ionicons name="camera" size={24} color="#FFF" />
                                                <Text style={[styles.photoBtnText, { color: '#FFF' }]}>Tirar Foto</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                                                <Ionicons name="image" size={24} color={theme.colors.primary} />
                                                <Text style={styles.photoBtnText}>Galeria</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </Card>

                            <Button
                                title={editMedication ? "Salvar Alterações" : "Salvar Medicamento"}
                                onPress={handleSaveMedication}
                                loading={loading}
                            />
                        </>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Modal de visualização em tela cheia */}
            <Modal
                visible={showImageModal}
                transparent={false}
                animationType="fade"
                onRequestClose={() => setShowImageModal(false)}
                statusBarTranslucent
            >
                <View style={styles.modalContainer}>
                    <StatusBar hidden />
                    <ScrollView
                        contentContainerStyle={styles.modalScrollContent}
                        maximumZoomScale={4}
                        minimumZoomScale={1}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        centerContent
                    >
                        <Image
                            source={{ uri: image || '' }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.modalCloseBtn}
                        onPress={() => setShowImageModal(false)}
                    >
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
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
    textArea: {
        minHeight: 90,
        paddingTop: 14,
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
    photoActionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        overflow: 'hidden',
    },
    photoActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    photoActionText: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    },
    photoActionDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#EFEFEF',
    },
    warningBadge: {
        backgroundColor: theme.colors.accent + '20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    warningText: {
        color: theme.colors.accent,
        fontSize: 10,
        fontFamily: theme.fonts.bold,
        textTransform: 'uppercase',
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
    },
    successBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    successTitle: {
        fontSize: 24,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        marginTop: 8,
    },
    successText: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.7,
        textAlign: 'center',
        marginTop: 4,
    },
    skipButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: -10,
        marginBottom: 30,
    },
    skipButtonText: {
        color: theme.colors.text,
        fontFamily: theme.fonts.bold,
        opacity: 0.5,
        fontSize: 14,
    },
    autoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: theme.colors.primary + '15',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    autoText: {
        color: theme.colors.primary,
        fontSize: 10,
        fontFamily: theme.fonts.bold,
    },
    noImageHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 8,
        backgroundColor: theme.colors.accent + '15',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    noImageHintText: {
        fontSize: 12,
        fontFamily: theme.fonts.body,
        color: theme.colors.accent,
        flex: 1,
    },
    // Modal de foto em tela cheia
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScrollContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        padding: 8,
    },
});
