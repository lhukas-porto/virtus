import { useState } from "react";
import { Alert, StyleSheet, View, TextInput, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { supabase } from "../../lib/supabase";
import { Link, Stack } from "expo-router";
import { theme } from "../../theme";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);

    async function signUpWithEmail() {
        setLoading(true);
        const {
            error,
        } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            Alert.alert(error.message);
        } else {
            Alert.alert("Sucesso", "Verifique seu e-mail para confirmação!");
        }
        setLoading(false);
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Criar Conta", headerShown: false }} />
            <View style={styles.form}>
                <Text style={styles.title}>Criar Conta</Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(text) => setFullName(text)}
                        value={fullName}
                        placeholder="Nome Completo"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder="seu@email.com"
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        secureTextEntry={true}
                        placeholder="Senha"
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    disabled={loading}
                    onPress={signUpWithEmail}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Cadastrar</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Já tem uma conta? </Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity>
                            <Text style={styles.link}>Entrar</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: "center",
        padding: 20,
    },
    form: {
        padding: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: theme.colors.primary,
        textAlign: "center",
        marginBottom: 30,
    },
    inputContainer: {
        marginBottom: 15,
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        fontSize: 16,
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 20,
    },
    footerText: {
        color: theme.colors.text,
    },
    link: {
        color: theme.colors.primary,
        fontWeight: "bold",
    },
});
