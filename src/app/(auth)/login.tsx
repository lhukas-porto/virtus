import { View, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
    // Login fake anônimo para teste rápido
    const handleLogin = async () => {
        await supabase.auth.signInAnonymously();
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 20 }}>
                Vitus Login
            </Text>
            <TouchableOpacity
                onPress={handleLogin}
                style={{ backgroundColor: theme.colors.primary, padding: 15, borderRadius: 10 }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Entrar como Convidado</Text>
            </TouchableOpacity>
        </View>
    );
}