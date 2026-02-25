import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { theme, NavTheme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { HealthLogScreen } from '../screens/HealthLogScreen';
import { AddMedicationScreen } from '../screens/AddMedicationScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { MedicationListScreen } from '../screens/MedicationListScreen';
import { MedicationDetailScreen } from '../screens/MedicationDetailScreen';
import { AlarmConfigScreen } from '../screens/AlarmConfigScreen';
import { SelectMedicationScreen } from '../screens/SelectMedicationScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MainNavigator } from './MainNavigator';

const Stack = createStackNavigator();

export default function RootNavigation() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer theme={NavTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {session ? (
                    <>
                        <Stack.Screen name="Main" component={MainNavigator} />
                        <Stack.Screen name="HealthLog" component={HealthLogScreen} />
                        <Stack.Screen name="AddMedication" component={AddMedicationScreen} />
                        <Stack.Screen name="Scanner" component={ScannerScreen} />
                        <Stack.Screen name="MedicationDetail" component={MedicationDetailScreen} />
                        <Stack.Screen name="AlarmConfig" component={AlarmConfigScreen} />
                        <Stack.Screen name="SelectMedication" component={SelectMedicationScreen} />
                        <Stack.Screen name="Reports" component={ReportsScreen} />
                    </>
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
