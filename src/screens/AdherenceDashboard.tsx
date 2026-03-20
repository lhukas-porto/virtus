import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/Card';
import { LineChart, BarChart } from 'react-native-gifted-charts';

export const AdherenceDashboard = () => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [adherenceRate, setAdherenceRate] = useState(0);
    const [stats, setStats] = useState<any[]>([]);
    const [weeklyData, setWeeklyData] = useState<any[]>([]);

    const fetchAdherence = async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        try {
            // Pegar logs dos últimos 7 dias
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: logs, error } = await supabase
                .from('medication_logs')
                .select('*, medications(name)')
                .gte('taken_at', sevenDaysAgo.toISOString())
                .order('taken_at', { ascending: true });

            if (error) throw error;

            // Lógica simplificada de adesão:
            // Num cenário real, compararíamos com medication_reminders.
            // Aqui, vamos mostrar o volume de doses tomadas por dia.
            
            const days: any = {};
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dayStr = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                days[dayStr] = 0;
            }

            logs?.forEach(log => {
                const dayStr = new Date(log.taken_at).toLocaleDateString('pt-BR', { weekday: 'short' });
                if (days[dayStr] !== undefined) days[dayStr]++;
            });

            const chartData = Object.keys(days).reverse().map(day => ({
                value: days[day],
                label: day,
                frontColor: theme.colors.primary,
            }));

            setWeeklyData(chartData);
            
            // Total de doses tomadas vs uma média esperada (ex: 3 doses/dia)
            const totalTaken = logs?.length || 0;
            const expected = 21; // Exemplo: 3 doses por dia * 7 dias
            const rate = Math.min(Math.round((totalTaken / expected) * 100), 100);
            setAdherenceRate(rate);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdherence();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Minha Adesão</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.summaryCard}>
                    <View style={styles.rateCircle}>
                        <Text style={styles.rateValue}>{adherenceRate}%</Text>
                        <Text style={styles.rateLabel}>Adesão Semanal</Text>
                    </View>
                    <View style={styles.summaryInfo}>
                        <Text style={styles.summaryText}>
                            {adherenceRate > 90 
                             ? "Excelente! Você está seguindo o tratamento à risca. 🌟" 
                             : adherenceRate > 70 
                             ? "Bom progresso, continue assim! 👍" 
                             : "Vamos melhorar essa pontuação? Tente não pular doses. 💪"}
                        </Text>
                    </View>
                </Card>

                <Text style={styles.sectionTitle}>Volume de Doses (7 dias)</Text>
                <Card style={styles.chartCard}>
                    {loading ? (
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    ) : (
                        <BarChart
                            data={weeklyData}
                            width={Dimensions.get('window').width - 90}
                            height={200}
                            barWidth={22}
                            noOfSections={3}
                            barBorderRadius={4}
                            frontColor={theme.colors.primary}
                            yAxisThickness={0}
                            xAxisThickness={0}
                            hideRules
                            xAxisLabelTextStyle={{ color: theme.colors.text, opacity: 0.5, fontSize: 10 }}
                        />
                    )}
                </Card>

                <View style={styles.infoBox}>
                    <Ionicons name="bulb-outline" size={24} color={theme.colors.accent} />
                    <Text style={styles.infoText}>
                        Uma adesão acima de 95% é crucial para a eficácia de tratamentos crônicos. 
                        Tente configurar alertas de 4 em 4 horas se tiver dificuldade.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backButton: { marginRight: 16 },
    title: { fontSize: 24, fontFamily: theme.fonts.heading, color: theme.colors.text },
    content: { padding: 20 },
    summaryCard: { 
        padding: 24, 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: theme.colors.primary,
        marginBottom: 24
    },
    rateCircle: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        justifyContent: 'center', 
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFF'
    },
    rateValue: { fontSize: 24, fontFamily: theme.fonts.bold, color: '#FFF' },
    rateLabel: { fontSize: 8, color: '#FFF', textTransform: 'uppercase', textAlign: 'center' },
    summaryInfo: { flex: 1, marginLeft: 20 },
    summaryText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#FFF', lineHeight: 22 },
    sectionTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: theme.colors.text, marginBottom: 16 },
    chartCard: { padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 250 },
    infoBox: { 
        flexDirection: 'row', 
        backgroundColor: theme.colors.accent + '15', 
        padding: 16, 
        borderRadius: 16, 
        marginTop: 24,
        alignItems: 'center'
    },
    infoText: { flex: 1, marginLeft: 12, fontSize: 14, fontFamily: theme.fonts.body, color: theme.colors.text, opacity: 0.8 }
});
