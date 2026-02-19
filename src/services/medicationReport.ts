import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
import { theme } from '../theme/theme';

export const generateMedicationPDF = async (
  userName: string,
  periodStart: Date,
  periodEnd: Date
) => {
  // 1. Fetch Data
  // Ajustar datas para cobrir o dia inteiro
  const start = new Date(periodStart);
  start.setHours(0, 0, 0, 0);

  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  const { data: logs, error } = await supabase
    .from('medication_logs')
    .select(`
            *,
            medications (name, dosage, brand)
        `)
    .gte('taken_at', start.toISOString())
    .lte('taken_at', end.toISOString())
    .order('taken_at', { ascending: true });

  if (error) throw error;

  if (!logs || logs.length === 0) {
    throw new Error("Nenhum registro encontrado neste período.");
  }

  // 2. Statistics
  const totalEntries = logs.length;
  // Falta saber total agendado para calcular % de adesão real, mas requer query complexa de reminders
  // Por enquanto, relatório de "O que foi tomado".

  // 3. Generate HTML
  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 32px; font-weight: bold; color: ${theme.colors.primary}; }
          .info { margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: ${theme.colors.primary}; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .taken { color: #2E7D32; font-weight: bold; }
          .badge { padding: 4px 8px; border-radius: 4px; background: #E8F5E9; color: #2E7D32; display: inline-block; }
          .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
            <div class="logo">Vitus</div>
            <div style="text-align: right;">Relatório de Medicamentos</div>
        </div>

        <div class="info">
            <p><strong>Paciente:</strong> ${userName}</p>
            <p><strong>Período:</strong> ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}</p>
            <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 10px 0;">Resumo</h3>
            <p style="margin: 0;">Total de doses registradas: <strong>${totalEntries}</strong></p>
        </div>
        
        <h3>Detalhamento</h3>
        <table>
          <thead>
            <tr>
              <th width="20%">Data</th>
              <th width="15%">Hora</th>
              <th width="35%">Medicamento</th>
              <th width="15%">Dose</th>
              <th width="15%">Status</th>
            </tr>
          </thead>
          <tbody>
          ${logs.map(log => {
    const dateObj = new Date(log.taken_at);
    // Ajustar fuso horário visualmente se necessário, mas toLocaleString deve lidar com locale do device se o engine JS permitir
    // Print usa webview headless, fuso pode ser UTC.
    // Melhor formatar manualmente ou garantir timezone.
    // toLocaleString('pt-BR') costuma funcionar.

    return `
            <tr>
              <td>${dateObj.toLocaleDateString('pt-BR')}</td>
              <td>${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td>${log.medications?.name || 'Desconhecido'}</td>
              <td>${log.medications?.dosage || '-'}</td>
              <td><span class="badge">Tomado</span></td>
            </tr>
          `}).join('')}
          </tbody>
        </table>
        
        <div class="footer">
            Relatório gerado automaticamente pelo aplicativo Vitus. Este documento não substitui aconselhamento médico.
        </div>
      </body>
    </html>
    `;

  // 4. Print to File
  const { uri } = await Print.printToFileAsync({ html });

  // 5. Share
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
};
