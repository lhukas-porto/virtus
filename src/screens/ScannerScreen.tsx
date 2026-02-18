import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Dimensions, Alert, Platform, ActivityIndicator, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { identifyMedicineByGTIN } from '../services/medicineIdentification';

const { width } = Dimensions.get('window');

export const ScannerScreen = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const navigation = useNavigation<any>();
    const [scanned, setScanned] = useState(false);

    if (!permission) {
        // Camera permissions are still loading.
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.permissionContent}>
                    <Ionicons name="camera-outline" size={80} color={theme.colors.primary} />
                    <Text style={styles.permissionTitle}>Acesso à Câmera</Text>
                    <Text style={styles.permissionSubtitle}>
                        Precisamos da sua câmera para que a "Lupa Mágica" possa ler os seus remédios.
                    </Text>
                    <Button
                        title="Permitir Câmera"
                        onPress={requestPermission}
                        style={styles.permissionButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    const [identifying, setIdentifying] = useState(false);

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        if (scanned || identifying) return;
        setIdentifying(true);
        setScanned(true);

        try {
            const medInfo = await identifyMedicineByGTIN(data);
            setIdentifying(false);

            if (medInfo) {
                navigation.navigate('AddMedication', {
                    barcode: data,
                    medInfo: medInfo
                });
                setScanned(false);
            } else {
                setScanned(false);
                const queryManual = 'Não encontramos detalhes para este código. Deseja cadastrar manualmente?';
                if (Platform.OS === 'web') {
                    if (window.confirm(queryManual)) {
                        navigation.navigate('AddMedication', { barcode: data });
                    }
                } else {
                    Alert.alert('Código lido', queryManual, [
                        { text: 'Não', style: 'cancel' },
                        { text: 'Sim', onPress: () => navigation.navigate('AddMedication', { barcode: data }) }
                    ]);
                }
            }
        } catch (e) {
            setIdentifying(false);
            setScanned(false);
            Alert.alert('Erro', 'Houve um problema ao identificar o remédio.');
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e"],
                }}
            >
                <SafeAreaView style={styles.overlay}>
                    <View style={styles.topBar}>
                        <Text style={styles.scannerTitle}>Lupa Mágica 🔍</Text>
                    </View>

                    <View style={styles.scannerContainer}>
                        <View style={styles.viewfinder}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                            {identifying && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="large" color={theme.colors.primary} />
                                    <Text style={styles.loadingText}>Identificando...</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.instruction}>
                            Aponte para o código de barras do remédio
                        </Text>
                    </View>

                    <View style={styles.bottomBar}>
                        <TouchableOpacity
                            style={styles.manualButton}
                            onPress={() => navigation.navigate('AddMedication')}
                        >
                            <Ionicons name="create-outline" size={24} color="#FFF" />
                            <Text style={styles.manualButtonText}>Digitar Nome</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="close" size={32} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </CameraView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: theme.colors.background,
    },
    permissionTitle: {
        fontSize: 28,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        marginTop: 20,
    },
    permissionSubtitle: {
        fontSize: 18,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        textAlign: 'center',
        marginTop: 12,
        opacity: 0.6,
        lineHeight: 26,
    },
    permissionButton: {
        marginTop: 32,
        width: '100%',
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    topBar: {
        padding: 24,
        alignItems: 'center',
    },
    scannerTitle: {
        fontSize: 24,
        fontFamily: theme.fonts.heading,
        color: '#FFF',
    },
    scannerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewfinder: {
        width: width * 0.7,
        height: width * 0.7,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: theme.colors.primary,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 6,
        borderLeftWidth: 6,
        borderTopLeftRadius: 20,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 6,
        borderRightWidth: 6,
        borderTopRightRadius: 20,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 6,
        borderLeftWidth: 6,
        borderBottomLeftRadius: 20,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 6,
        borderRightWidth: 6,
        borderBottomRightRadius: 20,
    },
    instruction: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: theme.fonts.body,
        marginTop: 40,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    bottomBar: {
        padding: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    manualButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        gap: 10,
    },
    manualButtonText: {
        color: '#FFF',
        fontFamily: theme.fonts.bold,
        fontSize: 16,
    },
    closeButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    loadingText: {
        color: '#FFF',
        marginTop: 12,
        fontFamily: theme.fonts.bold,
    }
});
