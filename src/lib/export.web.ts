import * as XLSX from 'xlsx';
import { HealthLog } from '../types';

export const exportHealthLogsToExcel = async (logs: HealthLog[]) => {
    try {
        // 1. Preparar os dados
        const data = logs.map(log => ({
            'Data': new Date(log.created_at).toLocaleDateString('pt-BR'),
            'Horário': log.time || new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            'Sistólica (mmHg)': log.systolic,
            'Diastólica (mmHg)': log.diastolic,
            'Batimentos (BPM)': log.heart_rate || 'N/A',
        }));

        // 2. Criar planilha
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Histórico de Saúde');

        // 3. Gerar arquivo binário
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

        // 4. Criar Blob e forçar download no navegador
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Vitus_Relatorio_Saude_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Erro na exportação web:', error);
        throw error;
    }
};