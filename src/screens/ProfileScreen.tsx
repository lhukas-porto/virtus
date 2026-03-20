import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Image, TextInput, ActivityIndicator, Linking } from 'react-native';
import { showAlert } from '../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen = () => {
    const { session, profile } = useAuth();
    const navigation = useNavigation<any>();

    const [name, setName] = useState(profile?.name || session?.user?.user_metadata?.name || '');
    const [cpf, setCpf] = useState(session?.user?.user_metadata?.cpf || '');
    const [phone, setPhone] = useState(session?.user?.user_metadata?.phone || '');
    const [emergencyContact, setEmergencyContact] = useState(session?.user?.user_metadata?.emergency_contact_name || '');
    const [emergencyPhone, setEmergencyPhone] = useState(session?.user?.user_metadata?.emergency_contact_phone || '');
    const [avatar, setAvatar] = useState(session?.user?.user_metadata?.avatar_url || null);

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session?.user?.user_metadata) {
            const meta = session.user.user_metadata;
            if (!isEditing) {
                setName(meta.name || '');
                setCpf(meta.cpf || '');
                setPhone(meta.phone || '');
                setEmergencyContact(meta.emergency_contact_name || '');
                setEmergencyPhone(meta.emergency_contact_phone || '');
                setAvatar(meta.avatar_url || null);
            }
        }
    }, [session, isEditing]);

    const handlePickImage = () => {
        if (!isEditing) return;
        if (Platform.OS === 'web') {
            // Camera not available on web — go straight to gallery
            openGallery();
            return;
        }
        showAlert(
            "Alterar Foto",
            "Selecione a origem da imagem:",
            [
                { text: "Câmera", onPress: openCamera },
                { text: "Galeria", onPress: openGallery },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    const openCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
            return;
        }

        try {
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });
            processImageResult(result);
        } catch (e) {
            console.log(e);
        }
    };

    const openGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });
            processImageResult(result);
        } catch (e) {
            console.log(e);
        }
    };

    const processImageResult = async (result: ImagePicker.ImagePickerResult) => {
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];

        try {
            const fileExt = asset.uri.split('.').pop() || 'jpg';
            const fileName = `${session?.user?.id}-${Date.now()}.${fileExt}`;
            let body;

            if (Platform.OS === 'web') {
                const response = await fetch(asset.uri);
                body = await response.blob();
            } else {
                const formData = new FormData();
                formData.append('file', {
                    uri: asset.uri,
                    name: fileName,
                    type: asset.mimeType || 'image/jpeg'
                } as any);
                body = formData;
            }

            const { data, error } = await supabase.storage.from('avatars').upload(fileName, body);

            if (error) throw error;

            const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setAvatar(publicUrl.publicUrl);

        } catch (uploadError) {
            console.error('Upload failed, attempting local fallback:', uploadError);
            try {
                const manipResult = await ImageManipulator.manipulateAsync(
                    asset.uri,
                    [{ resize: { width: 400 } }],
                    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                );
                setAvatar(`data:image/jpeg;base64,${manipResult.base64}`);
            } catch (e) {
                showAlert('Aviso', 'Não foi possível salvar a imagem.');
            }
        }
    };

    const formatPhone = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;

        if (cleaned.length > 0) {
            formatted = `(${cleaned.substring(0, 2)}`;
        }
        if (cleaned.length > 2) {
            formatted += `) ${cleaned.substring(2, 3)}`;
        }
        if (cleaned.length > 3) {
            formatted += ` ${cleaned.substring(3, 7)}`;
        }
        if (cleaned.length > 7) {
            formatted += `-${cleaned.substring(7, 11)}`;
        }
        return formatted;
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const updates = {
                name,
                cpf,
                phone,
                avatar_url: avatar,
                emergency_contact_name: emergencyContact,
                emergency_contact_phone: emergencyPhone,
            };

            const { error } = await supabase.auth.updateUser({
                data: updates
            });

            if (error) throw error;

            showAlert('Sucesso', 'Perfil atualizado!');
            setIsEditing(false);
        } catch (error: any) {
            showAlert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSupport = () => {
        if (Platform.OS === 'web') {
            // On web, window.confirm can't handle 3 options — open WhatsApp directly
            const phoneNum = "5561996272630";
            const msg = "Estou precisando de suporte com o app Vitus";
            window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, '_blank');
            return;
        }
        showAlert(
            "Ajuda e Suporte",
            "Como você gostaria de falar conosco?",
            [
                {
                    text: "Enviar E-mail",
                    onPress: () => {
                        Linking.openURL('mailto:lucas@infodesk.net.br?subject=Suporte do App Vitus');
                    }
                },
                {
                    text: "WhatsApp",
                    onPress: () => {
                        const phone = "5561996272630";
                        const msg = "Estou precisando de suporte";
                        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                        Linking.openURL(url).catch(() => {
                            showAlert("Erro", "Não foi possível abrir o WhatsApp.");
                        });
                    }
                },
                {
                    text: "Cancelar",
                    style: "cancel"
                }
            ]
        );
    };

    const handlePanic = async () => {
        const contactPhone = emergencyPhone || session?.user?.user_metadata?.emergency_contact_phone;
        const contactName = emergencyContact || session?.user?.user_metadata?.emergency_contact_name;
        const myName = name || profile?.name || 'Usuário';

        if (!contactPhone) {
            const msg = "Você ainda não configurou um contato de emergência. Vá em Editar perfil para adicionar um.";
            if (Platform.OS === 'web') window.alert(msg);
            else showAlert('Contato não configurado', msg);
            return;
        }

        const message = `🚨 ALERTA VITUS 🚨\n\nOlá${contactName ? `, ${contactName}` : ''}! Sou ${myName} e estou precisando de ajuda agora.\n\nEste é um alerta automático do meu app de saúde Vitus.\n\nPor favor, entre em contato comigo imediatamente! 🙏`;
        const cleanPhone = contactPhone.replace(/\D/g, '');
        const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

        if (Platform.OS === 'web') {
            window.open(waUrl, '_blank');
        } else {
            Linking.openURL(waUrl).catch(() => {
                showAlert('Erro', 'Não foi possível abrir o WhatsApp.');
            });
        }
    };

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            if (!window.confirm("Deseja realmente sair da sua conta?")) return;
            const { error } = await supabase.auth.signOut();
            if (error) {
                alert("Erro ao sair: " + error.message);
            }
            // AuthContext onAuthStateChange sets session to null,
            // which causes RootNavigation to render Login automatically
            return;
        }

        showAlert(
            "Sair",
            "Deseja realmente sair da sua conta?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sair",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase.auth.signOut();
                        if (error) showAlert("Erro", error.message);
                    }
                }
            ]
        );
    };

    const formatCPF = (text: string) => {
        let value = text.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);

        return value
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    };

    return (
        <View style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Meu Perfil</Text>

                    <TouchableOpacity
                        style={styles.editToggleBtn}
                        onPress={() => isEditing ? handleSave() : setIsEditing(true)}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.colors.primary} size="small" />
                        ) : (
                            <Text style={styles.editToggleText}>{isEditing ? 'Salvar' : 'Editar'}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.profileSection}>
                    <TouchableOpacity onPress={handlePickImage} disabled={!isEditing}>
                        <View style={styles.avatarContainer}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatarImage} />
                            ) : (
                                <Ionicons name="person" size={50} color={theme.colors.primary} />
                            )}
                            {isEditing && (
                                <View style={styles.editBadge}>
                                    <Ionicons name="camera" size={14} color="#FFF" />
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    {isEditing ? (
                        <View style={styles.editForm}>
                            <Text style={styles.label}>Nome Completo</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                style={styles.input}
                                placeholder="Seu nome"
                            />

                            <Text style={styles.label}>CPF</Text>
                            <TextInput
                                value={cpf}
                                onChangeText={(t) => setCpf(formatCPF(t))}
                                style={styles.input}
                                placeholder="000.000.000-00"
                                keyboardType="numeric"
                                maxLength={14}
                            />

                            <Text style={styles.label}>Celular</Text>
                            <TextInput
                                value={phone}
                                onChangeText={(t) => setPhone(formatPhone(t))}
                                style={styles.input}
                                placeholder="(00) 0 0000-0000"
                                keyboardType="numeric"
                                maxLength={16}
                            />

                            <Text style={styles.label}>Contato de Emergência (Nome)</Text>
                            <TextInput
                                value={emergencyContact}
                                onChangeText={setEmergencyContact}
                                style={styles.input}
                                placeholder="Nome do familiar ou cuidador"
                            />

                            <Text style={styles.label}>Telefone do Contato de Emergência</Text>
                            <TextInput
                                value={emergencyPhone}
                                onChangeText={(t) => setEmergencyPhone(formatPhone(t))}
                                style={styles.input}
                                placeholder="(00) 0 0000-0000"
                                keyboardType="numeric"
                                maxLength={16}
                            />
                        </View>
                    ) : (
                        <>
                            <Text style={styles.name}>{name || 'Usuário Vitus'}</Text>
                            <Text style={styles.email}>{session?.user?.email}</Text>
                            {cpf ? <Text style={styles.cpf}>CPF: {cpf}</Text> : null}
                            {phone ? <Text style={styles.cpf}>Tel: {phone}</Text> : null}
                        </>
                    )}
                </View>

                {!isEditing && (
                    <>
                        <View style={styles.menuSection}>

                            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Caregiver')}>
                                <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                                    <Ionicons name="share-social-outline" size={24} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.menuText}>Vitus Share (Cuidador)</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={handleSupport}>
                                <View style={styles.menuIcon}>
                                    <Ionicons name="help-circle-outline" size={24} color={theme.colors.text} />
                                </View>
                                <Text style={styles.menuText}>Ajuda e Suporte</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                            </TouchableOpacity>

                            {/* Emergency Contact info */}
                            {(emergencyContact || emergencyPhone) && (
                                <TouchableOpacity style={styles.menuItem} onPress={handlePanic}>
                                    <View style={[styles.menuIcon, { backgroundColor: '#FFF0EE' }]}>
                                        <Ionicons name="call" size={24} color={theme.colors.alert} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.menuText}>Contato de Emergência</Text>
                                        <Text style={{ fontSize: 13, fontFamily: theme.fonts.body, color: theme.colors.text, opacity: 0.5 }}>
                                            {emergencyContact || emergencyPhone}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Botão de Pânico */}
                        <TouchableOpacity
                            style={styles.panicButton}
                            onPress={handlePanic}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="alert-circle" size={24} color="#FFF" style={{ marginRight: 10 }} />
                            <Text style={styles.panicButtonText}>🆘 Chamar Ajuda Agora</Text>
                        </TouchableOpacity>

                        <Button
                            title="Sair da Conta"
                            type="danger"
                            onPress={handleLogout}
                            style={styles.logoutButton}
                            icon="log-out-outline"
                        />

                        <Text style={styles.versionText}>Vitus v1.0.1</Text>
                    </>
                )}
            </ScrollView>
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
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        marginBottom: 32,
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
    },
    editToggleBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.primary + '10',
        borderRadius: 20,
    },
    editToggleText: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F0F7F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        position: 'relative',
        overflow: 'hidden'
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 30,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    email: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginTop: 4,
    },
    cpf: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.8,
        marginTop: 8,
        fontWeight: 'bold',
    },
    editForm: {
        width: '100%',
        marginTop: 10,
    },
    label: {
        fontSize: 14,
        color: theme.colors.text,
        opacity: 0.7,
        marginBottom: 6,
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    input: {
        backgroundColor: '#FFF',
        width: '100%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        fontSize: 16,
        marginBottom: 8,
    },
    menuSection: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 8,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F9F9F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuText: {
        flex: 1,
        fontSize: 17,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.text,
    },
    logoutButton: {
        marginTop: 8,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.3,
        marginTop: 40,
        marginBottom: 20,
    },
    panicButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.alert,
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 24,
        marginVertical: 16,
        shadowColor: theme.colors.alert,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    panicButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: theme.fonts.bold,
    },
});
