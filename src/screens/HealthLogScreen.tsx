import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, SafeAreaView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { generateHealthReport } from '../services/reports';
import { HealthChart } from '../components/HealthChart';

const SYMPTOMS = [
    'Dor de Cabeça', 'Enjoo', 'Tontura', 'Cansaço', 'Tosse', 'Falta de Ar', 'Dores no Corpo'
];

const MOODS = [
    { value: 1, emoji: '😞', label: 'Muito ruim' },
    { value: 2, emoji: '😕', label: 'Ruim' },
    { value: 3, emoji: '😐', label: 'Regular' },
    { value: 4, emoji: '🙂', label: 'Bem' },
    { value: 5, emoji: '😊', label: 'Ótimo' },
];

export const HealthLogScreen = () => {
    const { session, profile } = useAuth();
    const navigation = useNavigation<any>();
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [bloodGlucose, setBloodGlucose] = useState('');
    const [mood, setMood] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Edit modal state
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editSystolic, setEditSystolic] = useState('');
    const [editDiastolic, setEditDiastolic] = useState('');
    const [editHeartRate, setEditHeartRate] = useState('');
    const [editBloodGlucose, setEditBloodGlucose] = useState('');
    const [editLoading, setEditLoading] = useState(false);


    const userName = profile?.name || session?.user?.user_metadata?.name || 'Vitus';

    const fetchHistory = async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('health_measurements')
                .select('*')
                .eq('profile_id', session.user.id)
                .order('measured_at', { ascending: false });

            if (data) {
                const formattedData = data.map((item: any) => ({
                    ...item,
                    systolic: item.systolic / 10,
                    diastolic: item.diastolic / 10,
                }));
                setHistory(formattedData);
            }
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao buscar histórico:', e);
        } finally {
            setFetching(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchHistory();
        }, [session])
    );

    const handleSave = async () => {
        if (!systolic || !diastolic) {
            if (Platform.OS === 'web') window.alert('Por favor, preencha a pressão arterial.');
            else Alert.alert('Ops!', 'Por favor, preencha a pressão arterial.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('health_measurements').insert([
                {
                    profile_id: session?.user?.id,
                    systolic: Math.round(parseFloat(systolic.replace(',', '.')) * 10),
                    diastolic: Math.round(parseFloat(diastolic.replace(',', '.')) * 10),
                    heart_rate: heartRate ? parseInt(heartRate) : null,
                    blood_glucose: bloodGlucose ? parseInt(bloodGlucose) : null,
                    mood: mood,
                    notes: notes,
                },
            ]);

            if (error) throw error;

            if (Platform.OS === 'web') window.alert('Medição salva com sucesso! 🌿');
            else Alert.alert('Sucesso!', 'Sua medição foi registrada.');

            setSystolic('');
            setDiastolic('');
            setHeartRate('');
            setBloodGlucose('');
            setMood(null);
            setNotes('');
            fetchHistory();
        } catch (error: any) {
            if (Platform.OS === 'web') window.alert('Erro ao salvar: ' + error.message);
            else Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (item: any) => {
        setEditingItem(item);
        setEditSystolic(String(item.systolic));
        setEditDiastolic(String(item.diastolic));
        setEditHeartRate(item.heart_rate ? String(item.heart_rate) : '');
        setEditBloodGlucose(item.blood_glucose ? String(item.blood_glucose) : '');
    };

    const handleUpdate = async () => {
        if (!editSystolic || !editDiastolic) {
            if (Platform.OS === 'web') window.alert('Preencha a pressão arterial.');
            else Alert.alert('Ops!', 'Preencha a pressão arterial.');
            return;
        }
        setEditLoading(true);
        try {
            const { error } = await supabase
                .from('health_measurements')
                .update({
                    systolic: Math.round(parseFloat(editSystolic.replace(',', '.')) * 10),
                    diastolic: Math.round(parseFloat(editDiastolic.replace(',', '.')) * 10),
                    heart_rate: editHeartRate ? parseInt(editHeartRate) : null,
                    blood_glucose: editBloodGlucose ? parseInt(editBloodGlucose) : null,
                })
                .eq('id', editingItem.id);

            if (error) throw error;

            setEditingItem(null);
            fetchHistory();
        } catch (err: any) {
            if (Platform.OS === 'web') window.alert('Erro ao atualizar: ' + err.message);
            else Alert.alert('Erro', err.message);
        } finally {
            setEditLoading(false);
        }
    };


    return (
        <View style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                enabled={Platform.OS !== 'web'}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    showsVerticalScrollIndicator={false}
                    style={Platform.OS === 'web' ? { flex: 1, overflowY: 'auto' } as any : { flex: 1 }}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Minha Saúde 🩺</Text>
                        <Text style={styles.subtitle}>Como estão seus sinais hoje?</Text>
                    </View>

                    <Card style={styles.mainCard}>
                        <View style={styles.inputSection}>
                            <Text style={styles.sectionLabel}>Pressão Arterial</Text>
                            <View style={styles.pressureRow}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[styles.largeInput, !systolic && { color: theme.colors.primary + '60' }]}
                                        value={systolic}
                                        onChangeText={(text) => setSystolic(text.replace(/[^0-9.,]/g, ''))}
                                        placeholder="12.0"
                                        placeholderTextColor={theme.colors.primary + '60'}
                                        keyboardType="decimal-pad"
                                        maxLength={4}
                                    />
                                    <Text style={styles.unitLabel}>Sistólica</Text>
                                </View>
                                <Text style={styles.separator}>/</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[styles.largeInput, !diastolic && { color: theme.colors.primary + '60' }]}
                                        value={diastolic}
                                        onChangeText={(text) => setDiastolic(text.replace(/[^0-9.,]/g, ''))}
                                        placeholder="8.0"
                                        placeholderTextColor={theme.colors.primary + '60'}
                                        keyboardType="decimal-pad"
                                        maxLength={4}
                                    />
                                    <Text style={styles.unitLabel}>Diastólica</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputSection}>
                            <Text style={styles.sectionLabel}>Batimentos (BPM)</Text>
                            <View style={styles.heartRateContainer}>
                                <Ionicons name="heart" size={24} color={theme.colors.alert} style={{ marginRight: 12 }} />
                                <TextInput
                                    style={styles.midInput}
                                    value={heartRate}
                                    onChangeText={setHeartRate}
                                    placeholder="75"
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.unitInline}>bpm</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputSection}>
                            <Text style={styles.sectionLabel}>Glicemia (mg/dL)</Text>
                            <View style={styles.heartRateContainer}>
                                <Ionicons name="water" size={24} color="#D81B60" style={{ marginRight: 12 }} />
                                <TextInput
                                    style={styles.midInput}
                                    value={bloodGlucose}
                                    onChangeText={setBloodGlucose}
                                    placeholder="95"
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.unitInline}>mg/dL</Text>
                            </View>
                        </View>
                    </Card>

                    {/* Mood Check-in */}
                    <Card style={styles.moodCard}>
                        <Text style={styles.moodTitle}>Como me sinto hoje? 💭</Text>
                        <Text style={styles.moodSubtitle}>Registrar bem-estar ajuda o seu médico a entender seu quadro completo</Text>
                        <View style={styles.moodRow}>
                            {MOODS.map((m) => (
                                <TouchableOpacity
                                    key={m.value}
                                    style={[
                                        styles.moodBtn,
                                        mood === m.value && styles.moodBtnActive
                                    ]}
                                    onPress={() => setMood(mood === m.value ? null : m.value)}
                                >
                                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                                    <Text style={[
                                        styles.moodLabel,
                                        mood === m.value && styles.moodLabelActive
                                    ]}>{m.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.symptomTitle}>Sintomas & Notas 📝</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.symptomScroll}>
                            {SYMPTOMS.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.symptomTag,
                                        notes.includes(s) && styles.symptomTagActive
                                    ]}
                                    onPress={() => {
                                        if (notes.includes(s)) {
                                            setNotes(notes.replace(s + ', ', '').replace(s, '').trim());
                                        } else {
                                            setNotes(notes ? `${notes}, ${s}` : s);
                                        }
                                    }}
                                >
                                    <Text style={[
                                        styles.symptomTagText,
                                        notes.includes(s) && styles.symptomTagTextActive
                                    ]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            style={styles.notesInput}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Descreva como você está se sentindo ou adicione observações..."
                            multiline
                            numberOfLines={3}
                            placeholderTextColor={theme.colors.text + '40'}
                        />
                    </Card>

                    <Button
                        title={loading ? "Salvando..." : "Registrar Agora"}
                        onPress={handleSave}
                        style={styles.saveButton}
                    />

                    <TouchableOpacity onPress={() => navigation.navigate('HealthReports')} style={styles.reportRow}>
                        <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.reportRowText}>Relatórios Completos</Text>
                    </TouchableOpacity>

                    {/* Performance Graph */}
                    {history.length > 0 && (
                        <HealthChart data={history} />
                    )}

                    {/* History Section */}
                    <View style={styles.historySection}>
                        <Text style={styles.historyTitle}>Últimos Registros</Text>
                        {fetching ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : history.length > 0 ? (
                            history.map((item) => (
                                <View key={item.id} style={styles.historyItem}>
                                    <View style={styles.historyDateBox}>
                                        <Text style={styles.historyDay}>{new Date(item.measured_at).getDate()}</Text>
                                        <Text style={styles.historyMonth}>
                                            {new Date(item.measured_at).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.historyContent}>
                                        <Text style={styles.historyPA}>{item.systolic}/{item.diastolic}</Text>
                                        <Text style={styles.historySub}>
                                            <Ionicons name="heart-outline" size={14} /> {item.heart_rate || '--'} bpm {item.blood_glucose ? `• 🩸 ${item.blood_glucose} mg/dL` : ''} • {new Date(item.measured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    {item.mood && (
                                        <Text style={styles.historyMood}>
                                            {MOODS.find(m => m.value === item.mood)?.emoji || ''}
                                        </Text>
                                    )}
                                    <TouchableOpacity
                                        style={styles.editBtn}
                                        onPress={() => openEditModal(item)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyHistory}>Ainda não há registros de saúde.</Text>
                        )}
                    </View>

                    <Text style={styles.infoText}>
                        Seus dados são salvos de forma segura para acompanhamento médico. 🔒
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Edit Modal */}
            <Modal
                visible={!!editingItem}
                transparent
                animationType="slide"
                onRequestClose={() => setEditingItem(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>✏️ Corrigir Registro</Text>
                        <Text style={styles.modalSubtitle}>
                            {editingItem ? new Date(editingItem.measured_at).toLocaleString('pt-BR', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            }) : ''}
                        </Text>

                        <Text style={styles.modalLabel}>Pressão Arterial</Text>
                        <View style={styles.modalPressureRow}>
                            <View style={styles.modalInputGroup}>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editSystolic}
                                    onChangeText={(t) => setEditSystolic(t.replace(/[^0-9.,]/g, ''))}
                                    keyboardType="decimal-pad"
                                    maxLength={5}
                                    placeholder="12.0"
                                    placeholderTextColor={theme.colors.text + '40'}
                                />
                                <Text style={styles.modalInputLabel}>Sistólica</Text>
                            </View>
                            <Text style={styles.modalSep}>/</Text>
                            <View style={styles.modalInputGroup}>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editDiastolic}
                                    onChangeText={(t) => setEditDiastolic(t.replace(/[^0-9.,]/g, ''))}
                                    keyboardType="decimal-pad"
                                    maxLength={5}
                                    placeholder="8.0"
                                    placeholderTextColor={theme.colors.text + '40'}
                                />
                                <Text style={styles.modalInputLabel}>Diastólica</Text>
                            </View>
                        </View>

                        <Text style={[styles.modalLabel, { marginTop: 16 }]}>Batimentos (BPM)</Text>
                        <View style={styles.modalHeartRow}>
                            <Ionicons name="heart" size={20} color={theme.colors.alert} />
                            <TextInput
                                style={[styles.modalInput, { marginLeft: 10, minWidth: 60 }]}
                                value={editHeartRate}
                                onChangeText={setEditHeartRate}
                                keyboardType="numeric"
                                maxLength={3}
                                placeholder="75"
                                placeholderTextColor={theme.colors.text + '40'}
                            />
                            <Text style={styles.modalBpmLabel}>bpm</Text>
                        </View>

                        <Text style={[styles.modalLabel, { marginTop: 16 }]}>Glicemia (mg/dL)</Text>
                        <View style={styles.modalHeartRow}>
                            <Ionicons name="water" size={20} color="#D81B60" />
                            <TextInput
                                style={[styles.modalInput, { marginLeft: 10, minWidth: 60 }]}
                                value={editBloodGlucose}
                                onChangeText={setEditBloodGlucose}
                                keyboardType="numeric"
                                maxLength={3}
                                placeholder="95"
                                placeholderTextColor={theme.colors.text + '40'}
                            />
                            <Text style={styles.modalBpmLabel}>mg/dL</Text>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingItem(null)}>
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSaveBtn, editLoading && { opacity: 0.6 }]}
                                onPress={handleUpdate}
                                disabled={editLoading}
                            >
                                <Text style={styles.modalSaveText}>{editLoading ? 'Salvando...' : 'Salvar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        padding: 24,
        paddingBottom: Platform.OS === 'web' ? 120 : 40,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        marginBottom: 32,
        marginTop: 10,
    },
    title: {
        fontSize: 32,
        color: theme.colors.text,
        fontFamily: theme.fonts.heading,
    },
    subtitle: {
        fontSize: 18,
        color: theme.colors.text,
        opacity: 0.6,
        fontFamily: theme.fonts.body,
        marginTop: 4,
    },
    mainCard: {
        padding: 20,
        backgroundColor: theme.colors.surface,
        marginBottom: 14,
    },
    inputSection: {
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 15,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 16,
    },
    pressureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputWrapper: {
        alignItems: 'center',
    },
    largeInput: {
        fontSize: 32,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        textAlign: 'center',
        minWidth: 68,
    },
    unitLabel: {
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.4,
        textTransform: 'uppercase',
    },
    separator: {
        fontSize: 34,
        color: theme.colors.border,
        marginHorizontal: 12,
        fontFamily: theme.fonts.body,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        width: '100%',
        marginVertical: 20,
        opacity: 0.5,
    },
    heartRateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
    },
    midInput: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        minWidth: 42,
        textAlign: 'center',
    },
    unitInline: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginLeft: 8,
    },
    saveButton: {
        marginTop: 12,
    },
    reportRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 12,
        gap: 8,
    },
    reportRowText: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
        fontSize: 14,
    },
    historySection: {
        marginTop: 32,
        marginBottom: 20,
    },
    historyTitle: {
        fontSize: 22,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        marginBottom: 16,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    historyDateBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    historyDay: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    },
    historyMonth: {
        fontSize: 10,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        marginTop: -2,
    },
    historyContent: {
        flex: 1,
    },
    historyPA: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    historySub: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginTop: 2,
    },
    emptyHistory: {
        textAlign: 'center',
        color: theme.colors.text,
        opacity: 0.4,
        fontFamily: theme.fonts.body,
        marginTop: 20,
    },
    infoText: {
        textAlign: 'center',
        fontSize: 14,
        color: theme.colors.text,
        opacity: 0.4,
        marginTop: 24,
        marginBottom: 40,
        fontFamily: theme.fonts.body,
    },
    moodCard: {
        padding: 20,
        backgroundColor: theme.colors.surface,
        marginBottom: 16,
        marginTop: 16,
    },
    moodTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 4,
    },
    moodSubtitle: {
        fontSize: 13,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginBottom: 16,
    },
    moodRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    moodBtn: {
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        flex: 1,
        marginHorizontal: 2,
    },
    moodBtnActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    moodEmoji: {
        fontSize: 26,
    },
    moodLabel: {
        fontSize: 9,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.5,
        marginTop: 4,
        textAlign: 'center',
    },
    moodLabelActive: {
        color: theme.colors.primary,
        opacity: 1,
    },
    historyMood: {
        fontSize: 22,
        marginLeft: 8,
    },
    editBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary + '12',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 28,
        paddingBottom: 36,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.45,
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 10,
    },
    modalPressureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    modalInputGroup: {
        alignItems: 'center',
    },
    modalInput: {
        fontSize: 28,
        fontFamily: theme.fonts.heading,
        color: theme.colors.primary,
        textAlign: 'center',
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.primary + '40',
        minWidth: 70,
        paddingVertical: 4,
    },
    modalInputLabel: {
        fontSize: 11,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.4,
        textTransform: 'uppercase',
        marginTop: 4,
    },
    modalSep: {
        fontSize: 28,
        color: theme.colors.border,
        marginHorizontal: 8,
        fontFamily: theme.fonts.body,
    },
    modalHeartRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalBpmLabel: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginLeft: 8,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 28,
    },
    modalCancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    modalCancelText: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.6,
        fontSize: 15,
    },
    modalSaveBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
    },
    modalSaveText: {
        fontFamily: theme.fonts.bold,
        color: '#FFF',
        fontSize: 15,
    },
    symptomTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginTop: 16,
        marginBottom: 12,
    },
    symptomScroll: {
        marginBottom: 16,
    },
    symptomTag: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    symptomTagActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    symptomTagText: {
        fontSize: 14,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.text,
        opacity: 0.7,
    },
    symptomTagTextActive: {
        color: '#FFF',
        opacity: 1,
    },
    notesInput: {
        backgroundColor: '#F9F9F9',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#EEE',
    },
});

