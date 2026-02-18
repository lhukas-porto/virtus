import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { theme, NavTheme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { HealthLogScreen } from '../screens/HealthLogScreen';
import { AddMedicationScreen } from '../screens/AddMedicationScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { LoginScreen } from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function AppTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Alarmes') iconName = focused ? 'alarm' : 'alarm-outline';
                    else if (route.name === 'Monitoramento') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    else if (route.name === 'Scanner') iconName = focused ? 'barcode' : 'barcode-outline';
                    else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';

                    return <Ionicons name={iconName as any} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
                tabBarStyle: { height: 75, paddingBottom: 15, paddingTop: 10 },
                tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }
            })}
        >
            <Tab.Screen
                name="Alarmes"
                component={HomeScreen}
                options={{ tabBarLabel: 'Medicamentos' }}
            />
            <Tab.Screen
                name="Monitoramento"
                component={HealthLogScreen}
                options={{ tabBarLabel: 'Saúde' }}
            />
            <Tab.Screen name="Scanner" component={ScannerScreen} />
            <Tab.Screen name="Perfil" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

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
                        <Stack.Screen name="Main" component={AppTabs} />
                        <Stack.Screen name="HealthLog" component={HealthLogScreen} />
                        <Stack.Screen name="AddMedication" component={AddMedicationScreen} />
                    </>
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
