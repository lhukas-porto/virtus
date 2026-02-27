import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { theme } from '../theme/theme';
import { supabase } from './supabase';

export const getHealthHTML = async (
  userName: string,
  periodStart: Date,
  periodEnd: Date
) => {
  // 1. Fetch Data
  const start = new Date(periodStart);
  start.setHours(0, 0, 0, 0);

  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  const { data: measurements, error } = await supabase
    .from('health_measurements')
    .select('*')
    .gte('measured_at', start.toISOString())
    .lte('measured_at', end.toISOString())
    .order('measured_at', { ascending: true });

  if (error) throw error;

  if (!measurements || measurements.length === 0) {
    throw new Error("Nenhum registro encontrado neste período.");
  }

  const totalMeasurements = measurements.length;

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 32px; font-weight: bold; color: ${theme.colors.primary}; }
          .info { margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
          th { background-color: ${theme.colors.primary}; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
          .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
            <div class="logo">Vitus</div>
            <div style="text-align: right;">Relatório de Sinais Vitais</div>
        </div>

        <div class="info">
            <p><strong>Paciente:</strong> ${userName}</p>
            <p><strong>Período:</strong> ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}</p>
            <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div class="summary">
            <h3 style="margin: 0 0 10px 0;">Resumo do Período</h3>
            <p style="margin: 0;">Total de medições realizadas: <strong>${totalMeasurements}</strong></p>
        </div>
        
        <h3>Histórico de Medições</h3>
        <table>
          <thead>
            <tr>
              <th width="25%">Data</th>
              <th width="20%">Hora</th>
              <th width="35%">Pressão Arterial</th>
              <th width="20%">Pulso</th>
            </tr>
          </thead>
          <tbody>
          ${measurements.map(m => {
    const dateObj = new Date(m.measured_at);
    return `
            <tr>
              <td>${dateObj.toLocaleDateString('pt-BR')}</td>
              <td>${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td>${m.systolic}/${m.diastolic} mmHg</td>
              <td>${m.heart_rate ? `${m.heart_rate} bpm` : '--'}</td>
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

export const generateHealthReport = async (
  userName: string,
  periodStart: Date,
  periodEnd: Date
) => {
  const html = await getHealthHTML(userName, periodStart, periodEnd);


  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  }
};
