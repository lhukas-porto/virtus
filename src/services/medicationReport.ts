import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { theme } from '../theme/theme';

import { VITUS_LOGO_BASE64 } from '../utils/logoBase64';

export const getMedicationHTML = async (
  userName: string,
  periodStart: Date,
  periodEnd: Date
) => {
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

  const totalEntries = logs.length;

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { height: 40px; object-fit: contain; }
          .info { margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
          th { background-color: ${theme.colors.primary}; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .badge { padding: 4px 8px; border-radius: 4px; background: #E8F5E9; color: #2E7D32; display: inline-block; font-size: 10px; font-weight: bold; }
          .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
          .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
            <img class="logo" src="${VITUS_LOGO_BASE64}" alt="Vitus" />
            <div style="text-align: right;">Relatório de Medicamentos</div>
        </div>

        <div class="info">
            <p><strong>Paciente:</strong> ${userName}</p>
            <p><strong>Período:</strong> ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}</p>
            <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div class="summary">
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
};

export const generateMedicationPDF = async (
  userName: string,
  periodStart: Date,
  periodEnd: Date
) => {
  const html = await getMedicationHTML(userName, periodStart, periodEnd);


  // 4. Print / Share
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
  } else {
    // 4. Print to File (Native)
    const { uri } = await Print.printToFileAsync({ html });
    // 5. Share (Native)
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  }
};
