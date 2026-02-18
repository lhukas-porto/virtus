import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../providers/AuthProvider";
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

export default function AppLayout() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.text,
                tabBarStyle: {
                    borderTopColor: theme.colors.gray200,
                    backgroundColor: theme.colors.background,
                    height: 60,
                    paddingBottom: 10,
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Início",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="scan"
                options={{
                    title: "Escanear",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="barcode-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="add-medication"
                options={{
                    href: null, // Oculto da tab bar
                    headerShown: true,
                    title: "Novo Medicamento"
                }}
            />
        </Tabs>
    );
}