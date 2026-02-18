import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';

export const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
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
        if (!email || !password || !name) {
            const msg = 'Por favor, preencha todos os campos (Nome, E-mail e Senha).';
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
                    data: { name: name }
                }
            });

            console.log('Resposta Supabase:', { data, error });

            if (error) {
                if (Platform.OS === 'web') window.alert(error.message);
                else Alert.alert('Ops!', error.message);
            } else {
                const msg = 'Verifique seu e-mail para confirmar o cadastro (ou tente logar se desativou a confirmação).';
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
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Vitus 💜</Text>
                    <Text style={styles.subtitle}>Como quer ser chamado?</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Seu Nome</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Ex: Dona Maria"
                    />

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
    },
    header: {
        marginBottom: 48,
        alignItems: 'center',
    },
    title: {
        fontSize: 48,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 20,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        marginTop: 8,
        opacity: 0.8,
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderRadius: 20,
        padding: 18,
        fontSize: 18,
        fontFamily: theme.fonts.body,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#EFEFEF',
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
    },
});
