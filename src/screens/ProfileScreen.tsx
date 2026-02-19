import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Platform, Image, TextInput, ActivityIndicator } from 'react-native';
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
    const [avatar, setAvatar] = useState(session?.user?.user_metadata?.avatar_url || null);

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session?.user?.user_metadata) {
            const meta = session.user.user_metadata;
            if (!isEditing) {
                setName(meta.name || '');
                setCpf(meta.cpf || '');
                setAvatar(meta.avatar_url || null);
            }
        }
    }, [session, isEditing]);

    const handlePickImage = () => {
        if (!isEditing) return;
        Alert.alert(
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
            Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
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

            const formData = new FormData();
            formData.append('file', {
                uri: asset.uri,
                name: fileName,
                type: asset.mimeType || 'image/jpeg'
            } as any);

            const { data, error } = await supabase.storage.from('avatars').upload(fileName, formData);

            if (error) throw error;

            const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setAvatar(publicUrl.publicUrl);

        } catch (uploadError) {
            try {
                const manipResult = await ImageManipulator.manipulateAsync(
                    asset.uri,
                    [{ resize: { width: 400 } }],
                    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                );
                setAvatar(`data:image/jpeg;base64,${manipResult.base64}`);
            } catch (e) {
                Alert.alert('Aviso', 'Não foi possível salvar a imagem.');
            }
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const updates = {
                name,
                cpf,
                avatar_url: avatar
            };

            const { error } = await supabase.auth.updateUser({
                data: updates
            });

            if (error) throw error;

            Alert.alert('Sucesso', 'Perfil atualizado!');
            setIsEditing(false);
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Deseja realmente sair da sua conta?");
            if (confirmed) {
                const { error } = await supabase.auth.signOut();
                if (error) alert("Erro: " + error.message);
            }
            return;
        }

        Alert.alert(
            "Sair",
            "Deseja realmente sair da sua conta?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sair",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase.auth.signOut();
                        if (error) Alert.alert("Erro", error.message);
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
        <SafeAreaView style={styles.safeArea}>
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
                        </View>
                    ) : (
                        <>
                            <Text style={styles.name}>{name || 'Usuário Vitus'}</Text>
                            <Text style={styles.email}>{session?.user?.email}</Text>
                            {cpf ? <Text style={styles.cpf}>CPF: {cpf}</Text> : null}
                        </>
                    )}
                </View>

                {!isEditing && (
                    <>
                        <View style={styles.menuSection}>
                            <TouchableOpacity style={styles.menuItem}>
                                <View style={styles.menuIcon}>
                                    <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
                                </View>
                                <Text style={styles.menuText}>Lembretes e Avisos</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem}>
                                <View style={styles.menuIcon}>
                                    <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.text} />
                                </View>
                                <Text style={styles.menuText}>Privacidade e Segurança</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem}>
                                <View style={styles.menuIcon}>
                                    <Ionicons name="help-circle-outline" size={24} color={theme.colors.text} />
                                </View>
                                <Text style={styles.menuText}>Ajuda e Suporte</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                            </TouchableOpacity>
                        </View>

                        <Button
                            title="Sair da Conta"
                            type="danger"
                            onPress={handleLogout}
                            style={styles.logoutButton}
                        />

                        <Text style={styles.versionText}>Vitus v1.0.1</Text>
                    </>
                )}
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
    }
});
