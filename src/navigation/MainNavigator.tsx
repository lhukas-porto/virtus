import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { HealthLogScreen } from '../screens/HealthLogScreen';
import { MedicationListScreen } from '../screens/MedicationListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { WebAlarmBanner } from '../components/WebAlarmBanner';

// Height of the tab bar (used for paddingBottom on web)
const TAB_BAR_HEIGHT = 65;

export const MainNavigator = () => {
    const { width } = useWindowDimensions();
    const [activeTab, setActiveTab] = useState(0);
    const [indicatorAnim] = useState(new Animated.Value(0));

    const tabs = [
        { id: 0, label: 'Alarmes', icon: 'alarm', component: HomeScreen },
        { id: 1, label: 'Monitoramento', icon: 'stats-chart', component: HealthLogScreen },
        { id: 2, label: 'Farmácia', icon: 'medical', component: MedicationListScreen },
        { id: 3, label: 'Perfil', icon: 'person', component: ProfileScreen },
    ];

    const handleTabPress = (index: number) => {
        setActiveTab(index);
        Animated.spring(indicatorAnim, {
            toValue: index * (width / 4),
            useNativeDriver: true,
            tension: 50,
            friction: 7
        }).start();
    };

    React.useEffect(() => {
        indicatorAnim.setValue(activeTab * (width / 4));
    }, [width]);

    const ActiveComponent = tabs[activeTab].component;

    return (
        <View style={styles.container}>
            {/* Web-only in-app alarm banner (expo-notifications not available on web) */}
            <WebAlarmBanner />

            {/* Content area — on web, pad the bottom so content isn't hidden under the fixed tab bar */}
            <View style={[
                styles.content,
                Platform.OS === 'web' && { paddingBottom: TAB_BAR_HEIGHT }
            ]}>
                <ActiveComponent />
            </View>

            {/* Footer — on web use position:fixed so it's always anchored to the bottom */}
            <View style={[
                styles.footer,
                Platform.OS === 'web' && {
                    position: 'absolute' as any,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                }
            ]}>
                <SafeAreaView edges={['bottom']}>
                    <View style={styles.tabBar}>
                        <Animated.View
                            style={[
                                styles.indicator,
                                {
                                    width: width / 4,
                                    transform: [{ translateX: indicatorAnim }]
                                }
                            ]}
                        />

                        {tabs.map((tab, index) => {
                            const isActive = activeTab === index;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    style={styles.tabItem}
                                    onPress={() => handleTabPress(index)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={(isActive ? tab.icon : `${tab.icon}-outline`) as any}
                                        size={24}
                                        color={isActive ? theme.colors.primary : '#9CA3AF'}
                                    />
                                    <Text style={[
                                        styles.tabLabel,
                                        isActive && styles.tabLabelActive
                                    ]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </SafeAreaView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
    },
    footer: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabBar: {
        flexDirection: 'row',
        height: TAB_BAR_HEIGHT,
        position: 'relative',
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 8,
    },
    tabLabel: {
        fontSize: 11,
        fontFamily: theme.fonts.bold,
        color: '#9CA3AF',
        marginTop: 4,
    },
    tabLabelActive: {
        color: theme.colors.primary,
    },
    indicator: {
        position: 'absolute',
        top: 0,
        height: 3,
        backgroundColor: theme.colors.primary,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
    }
});
