import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';

export const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        console.log('Tentando logar:', email);
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            console.log('Resposta Login:', { data, error });
            if (error) {
                if (Platform.OS === 'web') window.alert(error.message);
                else Alert.alert('Ops!', error.message);
            }
        } catch (e: any) {
            console.error('Erro no login:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        console.log('Tentando cadastrar:', email);
        if (!email || !password) {
            const msg = 'Por favor, preencha E-mail e Senha primeiro.';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Ops!', msg);
            return;
        }

        // Pergunta como quer ser chamado (Caixa de Pergunta)
        let chosenName = "";
        const question = "Como você quer ser chamado? (Ex: Maria)";

        if (Platform.OS === 'web') {
            chosenName = window.prompt(question) || "";
        } else {
            // No mobile, usamos o prompt do Alert (iOS) ou um valor padrão/placeholder
            // Para manter a simplicidade solicitada pelo Lucas:
            chosenName = "Usuário Vitus";
        }

        if (!chosenName) {
            const msg = 'Precisamos de um nome para continuar o cadastro.';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Ops!', msg);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name: chosenName }
                }
            });

            console.log('Resposta Supabase:', { data, error });

            if (error) {
                if (Platform.OS === 'web') window.alert(error.message);
                else Alert.alert('Ops!', error.message);
            } else {
                const msg = `Sucesso, ${chosenName}! Verifique seu e-mail para confirmar.`;
                if (Platform.OS === 'web') window.alert(msg);
                else Alert.alert('Sucesso!', msg);
            }
        } catch (e: any) {
            console.error('Erro catastrofico:', e);
            if (Platform.OS === 'web') window.alert(e.message);
            else Alert.alert('Erro', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.bgDecoration} />
            <View style={styles.bgDecorationBottom} />

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
                        placeholder="Sua senha secreta"
                        secureTextEntry
                    />

                    <Button
                        title={loading ? "Entrando..." : "Entrar"}
                        onPress={handleLogin}
                        style={styles.loginButton}
                    />

                    <Button
                        title="Criar Nova Conta"
                        onPress={handleSignUp}
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
        backgroundColor: '#FFFFFF', // Voltando para o Branco Puro para o teste final
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
    bgDecoration: {
        position: 'absolute',
        top: -150,
        right: -100,
        width: 450,
        height: 450,
        borderRadius: 225,
        backgroundColor: 'rgba(6, 129, 91, 0.02)', // Mais sutil ainda
        zIndex: 0,
    },
    bgDecorationBottom: {
        position: 'absolute',
        bottom: -200,
        left: -150,
        width: 600,
        height: 600,
        borderRadius: 300,
        backgroundColor: 'rgba(194, 86, 61, 0.015)', // Mais sutil ainda
        zIndex: 0,
    }
});
