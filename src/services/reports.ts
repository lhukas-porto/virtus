import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../theme/theme';

export const generateHealthReport = async (userName: string, measurements: any[]) => {
    const html = `
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: ${theme.colors.text}; }
                    h1 { color: ${theme.colors.primary}; font-size: 28px; border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 10px; }
                    .header { margin-bottom: 30px; }
                    .patient-info { margin-bottom: 20px; font-size: 16px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background-color: ${theme.colors.primary}; color: white; padding: 12px; text-align: left; }
                    td { border-bottom: 1px solid #ddd; padding: 12px; }
                    .footer { margin-top: 50px; font-size: 12px; text-align: center; opacity: 0.6; }
                    .status-normal { color: ${theme.colors.success}; font-weight: bold; }
                    .status-alert { color: ${theme.colors.alert}; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório de Saúde - Vitus 🌿</h1>
                    <div class="patient-info">
                        <p><strong>Paciente:</strong> ${userName}</p>
                        <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Data/Hora</th>
                            <th>Pressão (PA)</th>
                            <th>Pulso (BPM)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${measurements.map(m => `
                            <tr>
                                <td>${new Date(m.measured_at).toLocaleString('pt-BR')}</td>
                                <td>${m.systolic}/${m.diastolic} mmHg</td>
                                <td>${m.heart_rate || '--'} bpm</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Este relatório foi gerado automaticamente pelo aplicativo Vitus.</p>
                    <p>Foco em saúde e bem-estar para o seu dia a dia.</p>
                </div>
            </body>
        </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        throw error;
    }
};

export const exportHealthCSV = async (measurements: any[]) => {
    const header = "Data,Hora,Sistolica,Diastolica,BPM\n";
    const rows = measurements.map(m => {
        const date = new Date(m.measured_at);
        return `${date.toLocaleDateString('pt-BR')},${date.toLocaleTimeString('pt-BR')},${m.systolic},${m.diastolic},${m.heart_rate || ''}`;
    }).join("\n");

    const csvContent = header + rows;
    const fileName = `vitus_saude_${new Date().getTime()}.csv`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    try {
        await FileSystem.writeAsStringAsync(filePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(filePath, { mimeType: 'text/csv', dialogTitle: 'Exportar Dados de Saúde' });
    } catch (error) {
        console.error('Erro ao exportar CSV:', error);
        throw error;
    }
};

