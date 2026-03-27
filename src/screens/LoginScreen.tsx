import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, Modal, TouchableOpacity } from 'react-native';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_CREDS_KEY = 'vitus_biometric_creds';
const BIOMETRIC_ENABLED_KEY = 'vitus_biometric_enabled';
const LAST_USER_EMAIL_KEY = 'vitus_last_user_email';

export const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    // Biometria
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricType, setBiometricType] = useState<'fingerprint' | 'faceid' | 'iris'>('fingerprint');

    useEffect(() => {
        if (Platform.OS === 'web') return;
        checkBiometricAvailability();
        loadLastUser();
    }, []);

    const loadLastUser = async () => {
        try {
            const lastEmail = await AsyncStorage.getItem(LAST_USER_EMAIL_KEY);
            if (lastEmail) {
                setEmail(lastEmail);
            }
        } catch (e) {
            console.warn('Erro ao carregar último usuário:', e);
        }
    };

    const handleBiometricLogin = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Entrar no Vitus',
                fallbackLabel: 'Usar senha',
                cancelLabel: 'Cancelar',
                disableDeviceFallback: false,
            });

            if (result.success) {
                const credsJson = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY);
                if (!credsJson) {
                    Alert.alert('Ops!', 'Credenciais não encontradas. Faça login com e-mail e senha primeiro.');
                    return;
                }
                const creds = JSON.parse(credsJson);
                setLoading(true);
                const { error } = await supabase.auth.signInWithPassword({
                    email: creds.email,
                    password: creds.password,
                });
                if (error) {
                    setLoginError('Não foi possível entrar. Tente com e-mail e senha.');
                }
                setLoading(false);
            }
        } catch (e) {
            console.error('Erro na autenticação biométrica:', e);
        }
    };

    const checkBiometricAvailability = async () => {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);

            if (compatible && enrolled) {
                setBiometricAvailable(true);
                const isEnabled = enabled === 'true';
                setBiometricEnabled(isEnabled);

                // Detecta tipo de biometria disponível
                const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                let selectedType: 'fingerprint' | 'faceid' | 'iris' = 'fingerprint';
                if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                    selectedType = 'faceid';
                } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
                    selectedType = 'iris';
                }
                setBiometricType(selectedType);
            }
        } catch (e) {
            console.warn('Erro ao verificar biometria:', e);
        }
    };

    // Gatilho automático de biometria quando a tela abre com e-mail preenchido
    useEffect(() => {
        if (!biometricEnabled || !email || email.length < 5 || loading) return;

        const autoTrigger = async () => {
            const credsJson = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY);
            if (!credsJson) return;
            const creds = JSON.parse(credsJson);
            if (email.toLowerCase().trim() === creds.email.toLowerCase().trim()) {
                handleBiometricLogin();
            }
        };

        // Delay de 600ms para garantir que a tela está completamente renderizada
        const timer = setTimeout(autoTrigger, 600);
        return () => clearTimeout(timer);
    // Só dispara quando biometricEnabled ou email mudam (não em cada render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [biometricEnabled, email]);

    const promptEnableBiometric = (userEmail: string, userPass: string) => {
        const typeLabel = biometricType === 'faceid' ? 'Face ID' : biometricType === 'iris' ? 'íris' : 'digital';
        Alert.alert(
            `🔐 Login por ${typeLabel}`,
            `Quer usar sua ${typeLabel} para entrar mais rápido nas próximas vezes?`,
            [
                {
                    text: 'Não agora',
                    style: 'cancel',
                },
                {
                    text: `Sim, usar ${typeLabel}!`,
                    onPress: async () => {
                        try {
                            // Validação obrigatória antes de ativar!
                            const result = await LocalAuthentication.authenticateAsync({
                                promptMessage: `Confirme sua ${typeLabel} para ativar o login rápido`,
                            });

                            if (result.success) {
                                await SecureStore.setItemAsync(BIOMETRIC_CREDS_KEY, JSON.stringify({ email: userEmail, password: userPass }));
                                await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
                                setBiometricEnabled(true);
                                Alert.alert('✅ Ativado!', `Agora você pode entrar com sua ${typeLabel}.`);
                            } else {
                                Alert.alert('Ops!', 'Não conseguimos validar sua biometria. Tente ativar novamente no próximo login.');
                            }
                        } catch (e) {
                            console.error('Erro ao salvar credenciais:', e);
                        }
                    },
                },
            ]
        );
    };

    const handleResetPassword = async () => {
        if (!resetEmail) {
            Alert.alert('E-mail necessário', 'Por favor, informe seu e-mail para receber o link de recuperação.');
            return;
        }
        setResetLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: 'https://vitus.app/reset-password',
            });
            if (error) throw error;
            Alert.alert('Sucesso', 'Um link de recuperação foi enviado para o seu e-mail.');
            setShowResetModal(false);
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        } finally {
            setResetLoading(false);
        }
    };

    const handleAction = async () => {
        setLoginError('');

        if (isLoginMode) {
            if (!email || !password) {
                setLoginError('Por favor, preencha E-mail e Senha para entrar.');
                return;
            }
            if (password.length < 6) {
                setLoginError('A senha deve ter pelo menos 6 caracteres.');
                return;
            }
            setLoading(true);
            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    setLoginError(error.message);
                } else {
                    // Login bem-sucedido -> Lembrar e-mail (AsyncStorage - dado não sensível)
                    await AsyncStorage.setItem(LAST_USER_EMAIL_KEY, email.toLowerCase().trim());
                    
                    if (biometricAvailable && !biometricEnabled && Platform.OS !== 'web') {
                        promptEnableBiometric(email, password);
                    }
                }
            } catch (e: any) {
                setLoginError(e.message);
            } finally {
                setLoading(false);
            }
        } else {
            if (!name.trim() || !email || !password) {
                setLoginError('Por favor, preencha Nome, E-mail e Senha para cadastrar.');
                return;
            }
            if (password.length < 6) {
                setLoginError('A senha deve ter pelo menos 6 caracteres.');
                return;
            }
            const firstName = name.trim().split(' ')[0];
            setLoading(true);
            try {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { name: firstName } }
                });
                if (error) {
                    setLoginError(error.message);
                } else {
                    // Cadastro bem-sucedido -> Lembrar e-mail (AsyncStorage - dado não sensível)
                    await AsyncStorage.setItem(LAST_USER_EMAIL_KEY, email.toLowerCase().trim());
                    
                    if (Platform.OS === 'web') window.alert(`Bem-vindo, ${firstName}! Conta criada com sucesso.`);
                    else Alert.alert('Sucesso', `Bem-vindo, ${firstName}! Conta criada com sucesso.`);
                }
            } catch (e: any) {
                setLoginError(e.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const biometricIcon = biometricType === 'faceid' ? 'scan-outline' : 'finger-print';
    const biometricLabel = biometricType === 'faceid' ? 'Face ID' : biometricType === 'iris' ? 'Íris' : 'Digital';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.subtitle}>Sua saúde em boas mãos</Text>
                </View>

                <View style={styles.form}>
                    {!isLoginMode && (
                        <>
                            <Text style={styles.label}>Prenchimento do Nome</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Como você quer ser chamado?"
                            />
                        </>
                    )}

                    <Text style={styles.label}>E-mail</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Ex: maria.silva@email.com"
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Sua senha"
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                            style={styles.eyeBtn}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons
                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                size={24}
                                color={theme.colors.primary}
                            />
                        </TouchableOpacity>
                    </View>

                    {isLoginMode && (
                        <TouchableOpacity
                            style={styles.forgotBtn}
                            onPress={() => {
                                setResetEmail(email);
                                setShowResetModal(true);
                            }}
                        >
                            <Text style={styles.forgotText}>Esqueci minha senha</Text>
                        </TouchableOpacity>
                    )}

                    {!!loginError && (
                        <Text style={{ color: 'red', marginBottom: 16, textAlign: 'center', fontFamily: theme.fonts.bold }}>
                            {loginError}
                        </Text>
                    )}

                    <Button
                        title={loading ? "Aguarde..." : (isLoginMode ? "Entrar" : "Criar conta")}
                        onPress={handleAction}
                        style={styles.loginButton}
                    />

                    {/* Botão de biometria — só aparece na tela de login e quando está habilitado */}
                    {isLoginMode && biometricAvailable && biometricEnabled && Platform.OS !== 'web' && (
                        <TouchableOpacity
                            style={styles.biometricBtn}
                            onPress={handleBiometricLogin}
                            disabled={loading}
                        >
                            <Ionicons name={biometricIcon as any} size={28} color={theme.colors.primary} />
                            <Text style={styles.biometricText}>Entrar com {biometricLabel}</Text>
                        </TouchableOpacity>
                    )}

                    <Button
                        title={isLoginMode ? "Criar nova conta" : "Já possuo uma conta"}
                        onPress={() => { setIsLoginMode(!isLoginMode); setLoginError(''); }}
                        type="secondary"
                        style={styles.signupButton}
                        textStyle={styles.signupText}
                    />
                </View>
            </ScrollView>

            <Modal visible={showResetModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Recuperar Senha</Text>
                        <Text style={styles.modalSub}>{`Enviaremos um link para:\n${resetEmail || 'seu e-mail'}`}</Text>

                        <TextInput
                            style={styles.modalInput}
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            placeholder="Seu e-mail de cadastro"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.mBtn, { backgroundColor: '#F0F0F0' }]}
                                onPress={() => setShowResetModal(false)}
                            >
                                <Text style={styles.mBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.mBtn, { backgroundColor: theme.colors.primary }]}
                                onPress={handleResetPassword}
                                disabled={resetLoading}
                            >
                                <Text style={[styles.mBtnText, { color: '#FFF' }]}>
                                    {resetLoading ? 'Enviando...' : 'Enviar Link'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.footerBranding}>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.brandingLabel, { color: 'red', fontFamily: theme.fonts.bold, opacity: 1 }]}>v1.0.19-STABLE-ALARM</Text>
                    <Text style={styles.brandingLabel}>Desenvolvido por</Text>
                </View>
                <Image
                    source={require('../../assets/branding.png')}
                    style={styles.brandingLogo}
                    resizeMode="contain"
                />
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
        justifyContent: 'center',
        zIndex: 1,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    logo: {
        width: 320,
        height: 160,
        backgroundColor: 'transparent',
        borderWidth: 0,
        opacity: 0.99,
        borderRadius: 8,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        marginTop: -15,
        opacity: 0.5,
        textAlign: 'center',
    },
    form: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 26,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    label: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderRadius: 20,
        padding: 18,
        fontSize: 18,
        fontFamily: theme.fonts.body,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E8EDE9',
    },
    loginButton: {
        marginTop: 10,
        marginBottom: 12,
    },
    signupButton: {
        backgroundColor: 'transparent',
    },
    signupText: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.semiBold,
        textDecorationLine: 'underline',
    },
    footerBranding: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    brandingLabel: {
        fontSize: 12,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.4,
        marginRight: 8,
    },
    brandingLogo: {
        width: 120,
        height: 60,
        backgroundColor: 'transparent',
        borderWidth: 0,
        opacity: 0.95,
        borderRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        marginBottom: 8,
        color: theme.colors.text,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 24,
        backgroundColor: '#F9F9F9',
        fontFamily: theme.fonts.body,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    mBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    mBtnText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    modalSub: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.6,
        textAlign: 'center',
        marginBottom: 20,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E8EDE9',
        marginBottom: 10,
    },
    eyeBtn: {
        padding: 12,
        paddingRight: 18,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginBottom: 16,
    },
    forgotText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontFamily: theme.fonts.semiBold,
        textDecorationLine: 'underline',
    },
    biometricBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary + '10',
        padding: 16,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.colors.primary + '30',
        gap: 10,
    },
    biometricText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    },
});
