import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, Linking, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LinearGradient } from 'expo-linear-gradient';

export const CaregiverScreen = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [caregivers, setCaregivers] = useState<any[]>([]);
    const [adding, setAdding] = useState(false);
    
    // Animações
    const [fadeAnim] = useState(new Animated.Value(0));

    const fetchCaregivers = useCallback(async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('caregivers')
                .select('*')
                .eq('patient_id', session.user.id)
                .order('created_at', { ascending: false });

            if (data) {
                setCaregivers(data);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }).start();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, fadeAnim]);

    useEffect(() => {
        fetchCaregivers();
    }, [fetchCaregivers]);

    const handleAddCaregiver = async () => {
        const trimmedEmail = email.toLowerCase().trim();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            Alert.alert('E-mail Inválido', 'Por favor, informe um endereço de e-mail válido.');
            return;
        }

        setAdding(true);
        try {
            // Busca o ID do perfil se já existir
            const { data: userData } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('email', trimmedEmail)
                .maybeSingle();

            const { error } = await supabase
                .from('caregivers')
                .insert([{
                    patient_id: session?.user?.id,
                    caregiver_email: trimmedEmail,
                    caregiver_id: userData?.id || null,
                    caregiver_name: name || userData?.name || 'Cuidador',
                    caregiver_phone: phone.replace(/[^0-9]/g, ''),
                    status: 'active'
                }]);

            if (error) throw error;

            Alert.alert('Conectado!', `${name || 'O cuidador'} agora tem acesso aos seus registros de saúde.`);
            setEmail('');
            setName('');
            setPhone('');
            fetchCaregivers();
        } catch (e: any) {
            Alert.alert('Oops!', 'Não conseguimos adicionar o cuidador. Verifique a conexão e tente novamente.');
        } finally {
            setAdding(false);
        }
    };

    const removeCaregiver = async (id: string, caregiverName: string) => {
        Alert.alert(
            "Remover Acesso",
            `Tem certeza que deseja parar de compartilhar seus dados com ${caregiverName}?`,
            [
                { text: "Manter", style: "cancel" },
                {
                    text: "Remover",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase
                            .from('caregivers')
                            .delete()
                            .eq('id', id);

                        if (!error) fetchCaregivers();
                    }
                }
            ]
        );
    };

    const handleWhatsApp = (caregiver: any) => {
        if (!caregiver.caregiver_phone) return;
        const message = `Olá ${caregiver.caregiver_name}, convido você para me acompanhar no app Vitus. Assim você recebe alertas caso eu esqueça de tomar meus medicamentos!`;
        const url = `https://wa.me/55${caregiver.caregiver_phone}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url);
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FFF', '#F9FAFB']}
                style={StyleSheet.absoluteFill}
            />
            
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backButton}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                    <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerSubtitle}>Vitus Share</Text>
                    <Text style={styles.title}>Meus Cuidadores</Text>
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Card style={styles.addCard}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>Conectar novo Anjo</Text>
                    <Text style={styles.description}>
                        Adicione familiares ou profissionais de saúde para que eles acompanhem sua adesão ao tratamento.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>E-mail da Conta Vitus</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="email@exemplo.com"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nome para Identificação</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Ex: Dra. Ana ou Papai"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>WhatsApp (Opcional)</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Ex: 11988887777"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Button
                        title="Vincular Cuidador"
                        onPress={handleAddCaregiver}
                        loading={adding}
                        style={styles.submitButton}
                        icon="person-add-outline"
                    />
                </Card>

                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Conexões Ativas</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{caregivers.length}</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
                ) : caregivers.length > 0 ? (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {caregivers.map(c => (
                            <Card key={c.id} style={styles.caregiverItem}>
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {(c.caregiver_name || 'C')[0].toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.caregiverInfo}>
                                    <Text style={styles.caregiverName}>{c.caregiver_name}</Text>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.statusDot, { backgroundColor: c.status === 'active' ? '#10B981' : '#F59E0B' }]} />
                                        <Text style={styles.caregiverEmail}>{c.caregiver_email}</Text>
                                    </View>
                                </View>
                                <View style={styles.actionRow}>
                                    {c.caregiver_phone && (
                                        <TouchableOpacity 
                                            onPress={() => handleWhatsApp(c)} 
                                            style={[styles.miniButton, { backgroundColor: '#F0FDF4' }]}
                                        >
                                            <Ionicons name="logo-whatsapp" size={20} color="#22C55E" />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity 
                                        onPress={() => removeCaregiver(c.id, c.caregiver_name)} 
                                        style={[styles.miniButton, { backgroundColor: '#FEF2F2' }]}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={theme.colors.alert} />
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        ))}
                    </Animated.View>
                ) : (
                    <View style={styles.empty}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="share-social-outline" size={60} color={theme.colors.text} />
                        </View>
                        <Text style={styles.emptyTitle}>Sua rede está vazia</Text>
                        <Text style={styles.emptyText}>Adicione pessoas de confiança para monitorar sua saúde em tempo real.</Text>
                    </View>
                )}
                
                <View style={[styles.footerInfo, { marginBottom: 40 }]}>
                    <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.footerText}>
                        Seus dados de saúde são compartilhados de forma segura e privada.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 24, 
        paddingTop: 16, 
        paddingBottom: 24,
    },
    backButton: { 
        width: 44, 
        height: 44, 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        marginRight: 8
    },
    headerSubtitle: { fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 26, fontFamily: theme.fonts.bold, color: theme.colors.text, marginTop: -2 },
    content: { padding: 24, paddingBottom: 60 },
    addCard: { 
        padding: 24, 
        marginBottom: 32, 
        borderRadius: 24,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: theme.colors.text, marginBottom: 8 },
    description: { fontSize: 15, fontFamily: theme.fonts.body, color: '#6B7280', lineHeight: 22, marginBottom: 24 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.text, marginBottom: 10, opacity: 0.8 },
    input: { 
        backgroundColor: '#F9FAFB', 
        borderRadius: 16, 
        padding: 18, 
        fontSize: 16, 
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        borderWidth: 1, 
        borderColor: '#E5E7EB' 
    },
    submitButton: { marginTop: 8, height: 64 },
    listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    listTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.text, marginRight: 10 },
    countBadge: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
    countText: { color: '#FFF', fontSize: 12, fontFamily: theme.fonts.bold },
    caregiverItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 16, 
        marginBottom: 16,
        borderRadius: 20,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    avatarText: { fontSize: 20, fontFamily: theme.fonts.bold, color: '#4F46E5' },
    caregiverInfo: { flex: 1 },
    caregiverName: { fontSize: 17, fontFamily: theme.fonts.bold, color: theme.colors.text, marginBottom: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    caregiverEmail: { fontSize: 14, fontFamily: theme.fonts.body, color: '#9CA3AF' },
    actionRow: { flexDirection: 'row', alignItems: 'center' },
    miniButton: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    empty: { alignItems: 'center', marginTop: 30, paddingBottom: 40 },
    emptyIconContainer: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        backgroundColor: '#F9FAFB', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginBottom: 20,
        opacity: 0.5
    },
    emptyTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.text, marginBottom: 8 },
    emptyText: { textAlign: 'center', fontSize: 14, fontFamily: theme.fonts.body, color: '#9CA3AF', lineHeight: 20, maxWidth: '70%' },
    footerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingHorizontal: 20 },
    footerText: { fontSize: 12, fontFamily: theme.fonts.body, color: '#9CA3AF', marginLeft: 8, textAlign: 'center' }
});

