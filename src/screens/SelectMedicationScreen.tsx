import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export const SelectMedicationScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const [medications, setMedications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMeds = async () => {
            if (!session?.user?.id) return;
            try {
                const { data, error } = await supabase
                    .from('medications')
                    .select('*')
                    .eq('profile_id', session.user.id)
                    .order('name');
                if (data) setMedications(data);
                if (error) console.error(error);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchMeds();
    }, []);

    const handleSelect = (med: any) => {
        navigation.navigate('AlarmConfig', { medicationId: med.id, medicationName: med.name });
    };

    const renderItem = ({ item }: any) => (
        <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
            <View style={styles.iconBox}>
                <Ionicons name="medkit-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{item.name}</Text>
                {item.dosage ? <Text style={styles.medDosage}>{item.dosage}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
                    <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Criar Alarme</Text>
            </View>
            <Text style={styles.subtitle}>Selecione o medicamento:</Text>

            {loading ? <ActivityIndicator color={theme.colors.primary} size="large" style={{ marginTop: 40 }} /> : (
                <FlatList
                    data={medications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>Você ainda não tem medicamentos cadastrados.</Text>
                            <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('AddMedication')}>
                                <Text style={styles.newButtonText}>+ Cadastrar Primeiro Medicamento</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {!loading && medications.length > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => navigation.navigate('AddMedication')} style={styles.footerBtn}>
                        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.footerLinkText}>Cadastrar novo medicamento</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        marginLeft: 10,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.6,
        marginBottom: 20,
    },
    list: {
        paddingBottom: 80,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    medName: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },
    medDosage: {
        fontSize: 14,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.6,
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        marginBottom: 20,
        opacity: 0.5,
        textAlign: 'center',
    },
    newButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    newButtonText: {
        color: '#FFF',
        fontFamily: theme.fonts.bold,
        fontSize: 16,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    footerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
    },
    footerLinkText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    }
});
