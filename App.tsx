import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigation from './src/navigation';
import * as SplashScreen from 'expo-splash-screen';
import {
    useFonts,
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold
} from '@expo-google-fonts/outfit';
import {
    PlayfairDisplay_700Bold
} from '@expo-google-fonts/playfair-display';

import { View, Text } from 'react-native';

import { AlarmOverlay } from './src/components/AlarmOverlay';
import { initializeNotifications } from './src/services/notifications';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
    const [fontsLoaded] = useFonts({
        Outfit_400Regular,
        Outfit_600SemiBold,
        Outfit_700Bold,
        PlayfairDisplay_700Bold,
    });

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
            initializeNotifications();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                <Text style={{ fontSize: 20, color: '#06815B', fontFamily: 'Outfit_600SemiBold' }}>Carregando Vitus...</Text>
            </View>
        );
    }

    return (
        <AuthProvider>
            <RootNavigation />
            <AlarmOverlay />
        </AuthProvider>
    );
}
