import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { Card } from '../components/Card';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';

export const MedicationListScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const [medications, setMedications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMedications = async () => {
        if (!session?.user?.id) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('medications')
                .select('*')
                .eq('profile_id', session.user.id)
                .order('name', { ascending: true });

            if (data) setMedications(data);
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao carregar medicamentos:', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchMedications();
        }, [session])
    );

    const handleDelete = (id: string, name: string) => {
        const performDelete = async () => {
            try {
                const { error } = await supabase
                    .from('medications')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchMedications();
            } catch (e: any) {
                Alert.alert('Erro', 'Não foi possível remover o medicamento.');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Deseja realmente remover o medicamento ${name}?`)) {
                performDelete();
            }
            return;
        }

        Alert.alert(
            "Remover Medicamento",
            `Deseja realmente remover ${name}?`,
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Remover", style: "destructive", onPress: performDelete }
            ]
        );
    };

    const filteredMeds = medications.filter(med =>
        med.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Meus Medicamentos 💊</Text>
                        <Text style={styles.subtitle}>Gerencie seus medicamentos aqui</Text>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={theme.colors.text} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar medicamento..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
                        {filteredMeds.length > 0 ? (
                            filteredMeds.map((med) => (
                                <TouchableOpacity
                                    key={med.id}
                                    onPress={() => navigation.navigate('MedicationDetail', { medication: med })}
                                    activeOpacity={0.85}
                                >
                                    <Card style={styles.medCard}>
                                        <View style={styles.medInfo}>
                                            {/* Foto ou ícone */}
                                            {med.image_url ? (
                                                <Image
                                                    source={{ uri: med.image_url }}
                                                    style={styles.medThumb}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View style={styles.iconBox}>
                                                    <Ionicons name="medical" size={24} color={theme.colors.primary} />
                                                </View>
                                            )}

                                            <View style={{ flex: 1 }}>
                                                {/* Nome */}
                                                <Text style={styles.medName}>{med.name}</Text>

                                                {/* Laboratório + Dosagem */}
                                                <View style={styles.metaRow}>
                                                    {med.brand ? (
                                                        <View style={styles.brandBadge}>
                                                            <Text style={styles.brandText}>{med.brand}</Text>
                                                        </View>
                                                    ) : null}
                                                    {med.dosage ? (
                                                        <Text style={styles.medDosage}>{med.dosage}</Text>
                                                    ) : null}
                                                </View>

                                                {/* Resumo breve (sem dados de alarme) */}
                                                {med.instructions && med.instructions !== 'Cadastrado no Vitus' ? (
                                                    <Text style={styles.medSummary} numberOfLines={2}>
                                                        {med.instructions.split(' - ')[0]}
                                                    </Text>
                                                ) : null}
                                            </View>

                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity
                                                    onPress={() => navigation.navigate('AddMedication', { editMedication: med })}
                                                    style={styles.actionBtn}
                                                >
                                                    <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => handleDelete(med.id, med.name)}
                                                    style={styles.actionBtn}
                                                >
                                                    <Ionicons name="trash-outline" size={22} color={theme.colors.alert} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Card>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="cart-outline" size={80} color={theme.colors.border} />
                                <Text style={styles.emptyText}>Nenhum medicamento encontrado</Text>
                                <Button
                                    title="Escanear medicamento 🔍"
                                    onPress={() => navigation.navigate('Scanner')}
                                    style={styles.addBtn}
                                />
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('AddMedication')}
                                    style={{ marginTop: 20 }}
                                >
                                    <Text style={{ color: theme.colors.primary, fontFamily: theme.fonts.bold }}>
                                        Cadastrar manualmente
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                )}

                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('Scanner')}
                >
                    <Ionicons name="barcode-outline" size={32} color="#FFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 10,
    },
    headerAddBtn: {
        padding: 4,
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    searchIcon: {
        marginRight: 10,
        opacity: 0.4,
    },
    searchInput: {
        flex: 1,
        height: 50,
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
    },
    listContent: {
        paddingBottom: 100,
    },
    medCard: {
        marginBottom: 12,
        padding: 16,
    },
    medInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    medName: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    medDetails: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.5,
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        padding: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.4,
        marginTop: 16,
    },
    addBtn: {
        marginTop: 24,
        width: 200,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    medThumb: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginRight: 16,
        backgroundColor: '#F0F0F0',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        flexWrap: 'wrap',
    },
    brandBadge: {
        backgroundColor: theme.colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    brandText: {
        color: theme.colors.primary,
        fontSize: 11,
        fontFamily: theme.fonts.bold,
    },
    medDosage: {
        fontSize: 13,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.55,
    },
    medSummary: {
        fontSize: 13,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.45,
        marginTop: 4,
        lineHeight: 18,
    },
});
