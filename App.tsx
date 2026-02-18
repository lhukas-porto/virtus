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
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <AuthProvider>
            <RootNavigation />
        </AuthProvider>
    );
}
