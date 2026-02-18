import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export const ProfileScreen = () => {
    const { session, profile } = useAuth();

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

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Meu Perfil</Text>
                </View>

                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={50} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.name}>{profile?.name || 'Vitus User'}</Text>
                    <Text style={styles.email}>{session?.user?.email}</Text>
                </View>

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

                <Text style={styles.versionText}>Vitus v1.0.0 🌿</Text>
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
    },
    title: {
        fontSize: 32,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0F7F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EFEFEF',
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
