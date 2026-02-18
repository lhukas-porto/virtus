import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Button, StyleSheet, Text, View, Alert } from 'react-native';
import { theme } from '../../theme';

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    if (!permission) {
        // Permissões ainda carregando
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        // Permissão negada ou pendente
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Precisamos de acesso à câmera para ler os remédios.</Text>
                <Button onPress={requestPermission} title="Conceder Permissão" color={theme.colors.primary} />
            </View>
        );
    }

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        setScanned(true);
        Alert.alert(
            "Código Detectado!",
            `Tipo: ${type}\nDado: ${data}`,
            [{ text: "Escanear Novamente", onPress: () => setScanned(false) }]
        );
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "qr"],
                }}
            >
                <View style={styles.overlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.instructionText}>Aponte para o código de barras</Text>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background },
    message: { textAlign: 'center', paddingBottom: 10, fontSize: 16, color: theme.colors.text, paddingHorizontal: 20 },
    camera: { flex: 1 },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 280,
        height: 150,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        backgroundColor: 'transparent',
        borderRadius: 12,
    },
    instructionText: { color: 'white', marginTop: 20, fontSize: 16, fontWeight: '600' },
});