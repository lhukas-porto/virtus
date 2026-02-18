import { View, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.primary }}>
                Olá, Vitus! 💜
            </Text>
            <Text style={{ marginTop: 10, color: theme.colors.text }}>Seu diário de saúde.</Text>

            <TouchableOpacity
                onPress={() => router.push('/add-medication')}
                style={{ marginTop: 20, backgroundColor: theme.colors.primary, padding: 15, borderRadius: 10 }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Novo Medicamento</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.push('/add-health-log')}
                style={{ marginTop: 15, backgroundColor: theme.colors.text, padding: 15, borderRadius: 10 }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Registrar Sinais Vitais</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleLogout}
                style={{ marginTop: 40 }}
            >
                <Text style={{ color: theme.colors.gray600, textDecorationLine: 'underline' }}>Sair da conta</Text>
            </TouchableOpacity>
        </View>
    );
}