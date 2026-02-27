import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const ReportPreviewScreen = ({ navigation, route }: any) => {
    const { html, title } = route.params;
    const [loading, setLoading] = useState(false);

    const handleShare = async () => {
        setLoading(true);
        try {
            if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível gerar o arquivo PDF.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{title || 'Pré-visualização'}</Text>
                <TouchableOpacity onPress={handleShare} disabled={loading} style={styles.shareButton}>
                    {loading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Ionicons name="share-outline" size={24} color={theme.colors.primary} />
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.webViewContainer}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html }}
                    style={styles.webview}
                    scalesPageToFit={true}
                    enableApplePay={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    )}
                />
            </View>

            <View style={styles.footer}>
                <Text style={styles.hint}>
                    Use dois dedos para dar zoom no relatório. 🔍
                </Text>
                <TouchableOpacity style={styles.primaryButton} onPress={handleShare} disabled={loading}>
                    <Text style={styles.buttonText}>
                        {loading ? "Processando..." : "Gerar e Compartilhar PDF"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        padding: 5,
    },
    shareButton: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
    },
    webViewContainer: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: '#FFF',
    },
    hint: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginBottom: 15,
        fontFamily: theme.fonts.body,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: theme.fonts.bold,
    }
});
