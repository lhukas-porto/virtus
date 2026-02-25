import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { theme } from '../theme/theme';

// Logo da Vitus em Base64 para uso nos relatórios PDF
const LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAc0AAADNCAYAAADaMiupAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAIMjSURBVHhe7b33exVHura/fw/uc+8ZgwQS4PHMme/M+PjM2CZKW1nknHMyzjlnexzGaWwDCltZIoPBxgQb44wTYBwwGJNzMBmEEsqf+6xVXd3V1b2lLSGwQfXD+0jaodNu1btX1apV/6e+vh4Gg8FgMBga5//oDxgMBoPBYPDHSNNgMBgMhjAx0jQYDAaDIUyMNA0Gg8FgCBMjTYPBYDAYwsRI02AwGAyGMDHSNBgMBoMhTIw0DQaDwWAIEyNNg8FgMBjCxEjTYDAYDIYwMdI0GAwGgyFMjDQNBoPBYAgTI02DwWAwGMLESNNgMBgMhjAx0jQYDAaDIUyMNA0Gg8FgCBMjTYPBYDAYwsRI02AwGAyGMDHSNBgMBoMhTIw0DQaDwWAIEyNNg8FgMBjCxEjTYDAYDIYwMdI0GAwGgyFMjDQNBoPBYAgTI02DwWAwGMLESNNgMBgMhjAx0jQYDAaDIUyMNA0Gg8FgCBMjTYPBYDAYwsRI02AwGAyGMDHSNBgMBoMhTIw0DQaDwWAIEyNNg8FgMBjCxEjTYDAYDIYwMdI0GAwGgyFMjDQNBoPBYAgTI02DwWAwGMLESNNgMBgMhjAx0jQYDAaDIUyMNA0Gg8FgCBMjTYPBYDAYwsRI02AwGAyGMDHSNBgMBoMhTIw0DQaDwWAIEyNNA0Gg8FgCJP/q6+vh8FgMBgMBn+MNA0Gg8FgCBMjTYPBYDAYwsRI02AwGAyGMDHSNBgMBoMhTIw0DQaDwWAIEyNNg8FgMBjCxEjTYDAYDIYwMdI0GAwGgyFMjDQNBoPBYAgTI02DwWAwGMLESNNgMBgMhjAx0jQYDAaDIUyMNA0Gg8FgCBMjTYPBYDAYwsRI02AwGAyGMDHSNBgMBoMhTIw0DQaDwWAIEyNNg8FgMBjCxEjTYDAYDIYwMdI0GAwGgyFMjDQNBoPBYAgTI02DwWAwGMLESNNgMBgMhjAx0jQYDAaDIUyMNA0Gg8FgCBMjTYPBYDAYwsRI02AwGAyGMDHSNBgMBoMhTIw0DQaDwWAIEyNNg8FgMBjCxEjTYDAYDIYwMdI02DQYDAaDIWyMNA0Gg8FgCBMjTYPBYDAYwsRI02AwGAyGMDHSNBgMBoMhTIw0DQaDwWAIEyNNg8FgMBjCxEjTYDAYDIYwMdI0GAwGgyFMjDQNBoPBYAgTI02DwWAwGMLESNNgMBgMhjAx0jQYDAaDIUyMNA0Gg8FgCBMjTYPBYDAYwsRI02AwGAyGMDHSNBgMBoMhTIw0DQaDwWAIEyNNg8FgMBjCxEjTYDAYDAajTYxQWlaRZqRpMBgMBoPBYDAYDAbDxf8B7a7J9A==';

export const generateHealthReport = async (userName: string, measurements: any[]) => {
    const html = `
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: ${theme.colors.text}; }
                    .header { margin-bottom: 30px; border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 16px; display: flex; align-items: center; }
                    .logo { height: 54px; }
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
                    <img src="${LOGO_BASE64}" class="logo" alt="Vitus" />
                </div>
                <div class="patient-info">
                    <p><strong>Paciente:</strong> ${userName}</p>
                    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
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

    // Web: open the report HTML in a new browser tab (printing from there)
    if (Platform.OS === 'web') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        return;
    }

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

    // Web: trigger a browser download directly
    if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
    }

    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    try {
        await FileSystem.writeAsStringAsync(filePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(filePath, { mimeType: 'text/csv', dialogTitle: 'Exportar Dados de Saúde' });
    } catch (error) {
        console.error('Erro ao exportar CSV:', error);
        throw error;
    }
};

