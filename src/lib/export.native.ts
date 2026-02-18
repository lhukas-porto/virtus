import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { HealthLog } from '../types';

export const exportHealthLogsToExcel = async (logs: HealthLog[]) => {
    try {
        // 1. Preparar os dados para a planilha
        const data = logs.map(log => ({
            'Data': new Date(log.created_at).toLocaleDateString('pt-BR'),
            'Horário': log.time || new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            'Sistólica (mmHg)': log.systolic,
            'Diastólica (mmHg)': log.diastolic,
            'Batimentos (BPM)': log.heart_rate || 'N/A',
        }));

        // 2. Criar workbook e worksheet
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Histórico de Saúde');

        // 3. Gerar arquivo base64
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

        // 4. Salvar no sistema de arquivos local
        const fileName = `Vitus_Relatorio_Saude_${Date.now()}.xlsx`;
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(filePath, wbout, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // 5. Compartilhar o arquivo
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Exportar Relatório de Saúde',
                UTI: 'com.microsoft.excel.xlsx',
            });
        } else {
            throw new Error('Compartilhamento não disponível neste dispositivo');
        }

    } catch (error) {
        console.error('Erro na exportação:', error);
        throw error;
    }
};