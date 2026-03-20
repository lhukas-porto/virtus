import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme } from '../theme/theme';

interface HealthChartProps {
    data: any[];
}

export const HealthChart = ({ data }: HealthChartProps) => {
    if (!data || data.length < 1) return null;

    // Filter and format data (last 7 points)
    const recentData = [...data].reverse().slice(-7);

    const labels = recentData.map(item => new Date(item.measured_at).getDate().toString());
    const systolicPoints = recentData.map(item => item.systolic);
    const diastolicPoints = recentData.map(item => item.diastolic);
    const heartRatePoints = recentData.map(item => item.heart_rate || 0);

    return (
        <View style={styles.container}>
            <Text style={styles.chartTitle}>Tendência de Saúde</Text>
            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                    <Text style={styles.legendText}>Sis.</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#80CBC4' }]} />
                    <Text style={styles.legendText}>Dia.</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.alert }]} />
                    <Text style={styles.legendText}>BPM</Text>
                </View>
            </View>

            <LineChart
                data={{
                    labels: labels,
                    datasets: [
                        {
                            data: systolicPoints,
                            color: (opacity = 1) => theme.colors.primary,
                            strokeWidth: 3
                        },
                        {
                            data: diastolicPoints,
                            color: (opacity = 1) => '#80CBC4',
                            strokeWidth: 3
                        },
                        {
                            data: heartRatePoints,
                            color: (opacity = 1) => theme.colors.alert,
                            strokeWidth: 2,
                            withDots: true
                        }
                    ],
                }}
                width={Dimensions.get('window').width - 60}
                height={200}
                chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => theme.colors.text,
                    labelColor: (opacity = 1) => theme.colors.text + '80',
                    style: {
                        borderRadius: 16
                    },
                    propsForDots: {
                        r: '4',
                        strokeWidth: '2',
                        stroke: '#fff'
                    },
                    propsForBackgroundLines: {
                        strokeDasharray: '',
                        stroke: '#F0F0F0'
                    }
                }}
                bezier
                style={{
                    marginVertical: 8,
                    borderRadius: 16,
                    paddingRight: 40
                }}
                withInnerLines={true}
                withOuterLines={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        alignItems: 'center'
    },
    chartTitle: {
        fontSize: 16,
        alignSelf: 'flex-start',
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
        marginBottom: 12,
    },
    legendRow: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
        opacity: 0.6,
    },
});
