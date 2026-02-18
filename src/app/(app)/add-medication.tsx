import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { theme } from '../../theme';
import { scheduleMedicationReminder } from '../../lib/notifications';
import { router } from 'expo-router';

export default function AddMedicationScreen() {
    const [name, setName] = useState('');
    const [dosage, setDosage] = useState('');
    const [time, setTime] = useState('08:00');
    const [frequency, setFrequency] = useState('daily');

    const handleSave = async () => {
        if (!name || !dosage || !time) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }

        try {
            await scheduleMedicationReminder(name, dosage, time, frequency);
            Alert.alert('Sucesso', `Lembrete criado para ${time}!`, [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert('Erro', 'Falha ao agendar notificação.');
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Nome do Remédio</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Dipirona" placeholderTextColor="#999" />

            <Text style={styles.label}>Dosagem</Text>
            <TextInput style={styles.input} value={dosage} onChangeText={setDosage} placeholder="Ex: 500mg" placeholderTextColor="#999" />

            <Text style={styles.label}>Horário Inicial (HH:MM)</Text>
            <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="08:00" keyboardType="numbers-and-punctuation" placeholderTextColor="#999" />

            <Text style={styles.hint}>Frequência fixa: Diária (para teste)</Text>

            <TouchableOpacity style={styles.button} onPress={handleSave}>
                <Text style={styles.buttonText}>Salvar e Agendar</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: theme.colors.background },
    label: { fontSize: 16, color: theme.colors.text, marginBottom: 8, marginTop: 16, fontWeight: '600' },
    input: { backgroundColor: theme.colors.white, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.gray200, fontSize: 16 },
    button: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, marginTop: 32, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    hint: { color: theme.colors.gray200, fontSize: 12, marginTop: 5, fontStyle: 'italic' }
});