import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const HomeScreen = () => (
    <View style={styles.container}>
        <Text style={styles.title}>Home Vitus 🌿</Text>
        <Text style={styles.subtitle}>Próxima dose: 08:00</Text>
    </View>
);

export const ScannerScreen = () => (
    <View style={styles.container}>
        <Text style={styles.title}>Lupa Mágica 🔍</Text>
    </View>
);

export const ProfileScreen = () => (
    <View style={styles.container}>
        <Text style={styles.title}>Meu Perfil 🩺</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontFamily: 'serif',
        color: theme.colors.primary,
    },
    subtitle: {
        fontSize: 18,
        color: theme.colors.text,
        marginTop: 10,
    }
});
