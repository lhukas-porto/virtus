import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';

export const PaywallScreen = () => {
    const handlePurchase = (plan: string) => {
        const msg = `Você escolheu o plano: ${plan}. Integrando com meios de pagamento...`;
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Premium', msg);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <Ionicons name="star" size={60} color="#FFD700" />
                </View>
                <Text style={styles.title}>Seu Período de Teste Terminou</Text>
                <Text style={styles.subtitle}>
                    Esperamos que o Vitus tenha ajudado você a cuidar da sua saúde nestes últimos 7 dias.
                </Text>
            </View>

            <View style={styles.benefits}>
                <Text style={styles.benefitTitle}>Ao se tornar Premium, você desbloqueia:</Text>
                <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    <Text style={styles.benefitText}>Alarmes ilimitados e persistentes</Text>
                </View>
                <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    <Text style={styles.benefitText}>Scanner de medicamentos via IA</Text>
                </View>
                <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    <Text style={styles.benefitText}>Relatórios em PDF para seu médico</Text>
                </View>
                <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    <Text style={styles.benefitText}>Suporte prioritário e backup na nuvem</Text>
                </View>
            </View>

            <View style={styles.plans}>
                <TouchableOpacity style={[styles.planCard, styles.planCardFeatured]} onPress={() => handlePurchase('Vitalício')}>
                    <View>
                        <Text style={[styles.planName, { color: '#FFF' }]}>Acesso Vitalício (PROMOÇÃO)</Text>
                        <Text style={[styles.planPrice, { color: '#FFF' }]}>R$ 9,90</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sair da conta</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    content: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF9E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    title: {
        fontSize: 28,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.6,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    benefits: {
        backgroundColor: '#F9F9F9',
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
    },
    benefitTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 16,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    benefitText: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.8,
    },
    plans: {
        gap: 12,
    },
    planCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFF',
    },
    planCardFeatured: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        elevation: 4,
    },
    planName: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    planPrice: {
        fontSize: 20,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        marginTop: 4,
    },
    logoutBtn: {
        marginTop: 40,
        alignItems: 'center',
    },
    logoutText: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.alert,
        textDecorationLine: 'underline',
    }
});
