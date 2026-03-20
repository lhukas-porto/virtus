import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, StatusBar, DeviceEventEmitter, Platform } from 'react-native';
import { showAlert } from '../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../services/supabase';
import { syncNotifications } from '../services/notifications';

export const MedicationDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { medication } = route.params;

    const [showImageModal, setShowImageModal] = useState(false);
    const [med, setMed] = useState(medication);
    const [reminders, setReminders] = useState<any[]>([]);
    const [nextDoses, setNextDoses] = useState<any[]>([]);

    useFocusEffect(
        React.useCallback(() => {
            const fetchData = async () => {
                // Fetch med data
                const { data: medData, error: medError } = await supabase
                    .from('medications')
                    .select('*')
                    .eq('id', medication.id)
                    .single();

                if (medData && !medError) {
                    setMed(medData);
                }

                // Fetch reminders
                const { data: remData, error: remError } = await supabase
                    .from('medication_reminders')
                    .select('*')
                    .eq('medication_id', medication.id);

                if (remData) {
                    setReminders(remData);

                    // Generate next 5 doses
                    const doses: any[] = [];
                    const now = new Date();

                    remData.forEach(rem => {
                        const [h, m] = rem.reminder_time.slice(0, 5).split(':').map(Number);
                        const freq = rem.frequency_hours || 24;

                        let current = new Date();
                        current.setHours(h, m, 0, 0);

                        // Backtrack to start to find first upcoming
                        while (current > now) {
                            current = new Date(current.getTime() - freq * 60 * 60 * 1000);
                        }
                        // Move to first future
                        while (current <= now) {
                            current = new Date(current.getTime() + freq * 60 * 60 * 1000);
                        }

                        // Get next few
                        for (let i = 0; i < 5; i++) {
                            doses.push({
                                time: new Date(current),
                                reminderId: rem.id,
                                medName: med.name,
                                frequency: freq
                            });
                            current = new Date(current.getTime() + freq * 60 * 60 * 1000);
                        }
                    });

                    doses.sort((a, b) => a.time.getTime() - b.time.getTime());
                    setNextDoses(doses.slice(0, 5));
                }
            };
            fetchData();
        }, [medication.id, med.name])
    );

    // Separa o resumo do sufixo de alarme (ex: "Analgésico - Diário das 08:00")
    const parts = (med.instructions || '').split(' - ');
    const summary = parts[0] !== 'Cadastrado no Vitus' ? parts[0] : '';
    const alarmInfo = parts.length > 1 ? parts.slice(1).join(' - ') : '';

    const handleDeleteReminder = async (reminderId: string, timeLabel: string) => {
        const performDelete = async () => {
            const { error } = await supabase.from('medication_reminders').delete().eq('id', reminderId);
            if (!error) {
                setReminders(prev => prev.filter(r => r.id !== reminderId));
                setNextDoses(prev => prev.filter(d => d.reminderId !== reminderId));
                DeviceEventEmitter.emit('event.refreshAgenda');
                await syncNotifications();
                showAlert('Sucesso', 'Alarme e sequências futuras removidos.');
            }
        };
        showAlert(
            'Cancelar Alarmes',
            `Deseja cancelar o alarme de ${timeLabel} e todos os seguintes desta série?`,
            [
                { text: 'Não' },
                { text: 'Sim, Cancelar', style: 'destructive', onPress: performDelete }
            ]
        );
    };

    const handleDelete = () => {
        const performDelete = async () => {
            try {
                const { error } = await supabase
                    .from('medications')
                    .delete()
                    .eq('id', med.id);
                if (error) throw error;
                await syncNotifications();
                navigation.goBack();
            } catch (e: any) {
                showAlert('Erro', 'Não foi possível remover o medicamento.');
            }
        };
        showAlert(
            'Remover Medicamento',
            `Deseja realmente remover ${med.name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: performDelete }
            ]
        );
    };

    return (
        <>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header com foto */}
                    <View style={styles.photoHeader}>
                        {med.image_url ? (
                            <TouchableOpacity
                                style={styles.photoContainer}
                                onPress={() => setShowImageModal(true)}
                                activeOpacity={0.9}
                            >
                                <Image
                                    source={{ uri: med.image_url }}
                                    style={styles.photo}
                                    resizeMode="cover"
                                />
                                <View style={styles.expandHint}>
                                    <Ionicons name="expand-outline" size={16} color="#FFF" />
                                    <Text style={styles.expandHintText}>Toque para ampliar</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Ionicons name="medical" size={64} color={theme.colors.primary} />
                            </View>
                        )}

                        {/* Botão voltar */}
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>

                        {/* Botões de Ação (Editar + Deletar) */}
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerBtn}
                                onPress={() => navigation.navigate('AddMedication', { editMedication: med })}
                            >
                                <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerBtn}
                                onPress={handleDelete}
                            >
                                <Ionicons name="trash-outline" size={24} color={theme.colors.alert} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Conteúdo */}
                    <View style={styles.content}>
                        {/* Nome e brand */}
                        <View style={styles.nameRow}>
                            <Text style={styles.medName}>{med.name}</Text>
                            {med.brand ? (
                                <View style={styles.brandBadge}>
                                    <Text style={styles.brandText}>{med.brand}</Text>
                                </View>
                            ) : null}
                        </View>


                        {/* Resumo / Indicação */}
                        {summary ? (
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryHeader}>
                                    <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                                    <Text style={styles.summaryTitle}>Indicação</Text>
                                </View>
                                <Text style={styles.summaryText}>{summary}</Text>
                            </View>
                        ) : null}

                        <View style={styles.actionCard}>
                            <View style={styles.summaryHeader}>
                                <Ionicons name="alarm-outline" size={20} color={theme.colors.accent} />
                                <Text style={[styles.summaryTitle, { color: theme.colors.accent }]}>Próximas Doses</Text>
                            </View>

                            {nextDoses.length > 0 ? (
                                nextDoses.map((dose, i) => {
                                    const timeStr = dose.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    const dateStr = dose.time.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                    return (
                                        <View key={`${dose.reminderId}-${i}`} style={styles.doseRow}>
                                            <View style={styles.doseInfo}>
                                                <Ionicons name="time-outline" size={18} color={theme.colors.text} style={{ opacity: 0.6 }} />
                                                <Text style={styles.doseTime}>{timeStr}</Text>
                                                <Text style={styles.doseDate}>{dateStr}</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteReminder(dose.reminderId, timeStr)}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <Ionicons name="trash-outline" size={18} color={theme.colors.alert} opacity={0.6} />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={styles.noAlarmText}>Nenhuma dose pendente.</Text>
                            )}

                            <TouchableOpacity
                                style={styles.addAlarmBtn}
                                onPress={() => navigation.navigate('AlarmConfig', { medicationId: med.id, medicationName: med.name })}
                            >
                                <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
                                <Text style={styles.addAlarmText}>Adicionar Novo Horário</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Código de barras */}
                        {med.barcode ? (
                            <View style={styles.infoRow}>
                                <Ionicons name="barcode-outline" size={20} color={theme.colors.primary} />
                                <Text style={styles.infoLabel}>EAN</Text>
                                <Text style={styles.infoValue}>{med.barcode}</Text>
                            </View>
                        ) : null}

                        {/* Botão de excluir */}
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={20} color={theme.colors.alert} />
                            <Text style={styles.deleteButtonText}>Remover Medicamento</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Modal de foto em tela cheia */}
            <Modal
                visible={showImageModal}
                transparent={false}
                animationType="fade"
                onRequestClose={() => setShowImageModal(false)}
                statusBarTranslucent
            >
                <View style={styles.modalContainer}>
                    <StatusBar hidden />
                    <Image
                        source={{ uri: med.image_url }}
                        style={styles.modalImage}
                        resizeMode="contain"
                    />
                    <TouchableOpacity
                        style={styles.modalCloseBtn}
                        onPress={() => setShowImageModal(false)}
                    >
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    photoHeader: {
        position: 'relative',
    },
    photoContainer: {
        width: '100%',
        height: 280,
        backgroundColor: '#F0F0F0',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    expandHint: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    expandHintText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: theme.fonts.body,
    },
    photoPlaceholder: {
        width: '100%',
        height: 200,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtn: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerActions: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        gap: 12,
    },
    headerBtn: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    content: {
        padding: 24,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 12,
    },
    medName: {
        fontSize: 28,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        flex: 1,
    },
    brandBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 4,
    },
    brandText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        textTransform: 'uppercase',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    infoLabel: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        opacity: 0.5,
        flex: 1,
    },
    infoValue: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        flex: 2,
        textAlign: 'right',
    },
    summaryCard: {
        backgroundColor: theme.colors.primary + '08',
        borderRadius: 16,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: theme.colors.primary + '20',
    },
    actionCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        elevation: 2,
    },
    addAlarmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 10,
        backgroundColor: theme.colors.primary + '10',
        borderRadius: 12,
    },
    addAlarmText: {
        color: theme.colors.primary,
        fontFamily: theme.fonts.bold,
        fontSize: 14,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    summaryTitle: {
        fontSize: 13,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        textTransform: 'uppercase',
    },
    summaryText: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        lineHeight: 24,
    },
    noAlarmText: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.4,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 32,
        marginBottom: 40,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: theme.colors.alert + '40',
        backgroundColor: theme.colors.alert + '08',
    },
    deleteButtonText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.alert,
    },
    doseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    doseInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    doseTime: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    doseDate: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        padding: 8,
    },
});
