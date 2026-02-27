import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, Modal } from 'react-native';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';

export const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);

    const handleAction = async () => {
        setLoginError('');

        if (isLoginMode) {
            if (!email || !password) {
                setLoginError('Por favor, preencha E-mail e Senha para entrar.');
                return;
            }
            setLoading(true);
            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) setLoginError(error.message);
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

                    <Text style={styles.label}>Senha</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Sua senha"
                        secureTextEntry
                    />

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

                    <Button
                        title={isLoginMode ? "Criar nova conta" : "Já possuo uma conta"}
                        onPress={() => { setIsLoginMode(!isLoginMode); setLoginError(''); }}
                        type="secondary"
                        style={styles.signupButton}
                        textStyle={styles.signupText}
                    />
                </View>
            </ScrollView>

            <View style={styles.footerBranding}>
                <Text style={styles.brandingLabel}>Desenvolvido por</Text>
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
        borderRadius: 8, // Tenta suavizar os cantos da imagem
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
        width: 120, // Aumentado conforme pedido
        height: 60,  // Aumentado conforme pedido
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
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 24,
        backgroundColor: '#F9F9F9',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});
