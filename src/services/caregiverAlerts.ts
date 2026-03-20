import { supabase } from './supabase';
import { Linking, Platform } from 'react-native';

export const notifyCaregivers = async (patientName: string, medName: string, scheduledTime: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch caregivers
        const { data: caregivers, error } = await supabase
            .from('caregivers')
            .select('*')
            .eq('patient_id', user.id)
            .eq('status', 'active');

        if (error || !caregivers) return;

        for (const caregiver of caregivers) {
            // A. WhatsApp Alert (via Deep Link if triggered from app, 
            // but for real automation this should be an API call to Twilio/Evolution)
            if (caregiver.caregiver_phone) {
                const message = `Olá ${caregiver.caregiver_name}, o paciente ${patientName} esqueceu de tomar o medicamento ${medName} agendado para as ${scheduledTime}.`;
                const url = `whatsapp://send?phone=55${caregiver.caregiver_phone}&text=${encodeURIComponent(message)}`;

                // Note: From background/automatic this won't work without user interaction.
                // Real automation requires an Edge Function.
                console.log(`Alerting via WhatsApp: ${caregiver.caregiver_phone}`);
            }

            // B. Register in DB for Edge Function to pick up
            await supabase.from('missed_dose_alerts').insert({
                patient_id: user.id,
                medication_name: medName,
                scheduled_for: new Date().toISOString()
            });

            console.log(`Caregiver ${caregiver.caregiver_email} notified via database alert.`);
        }

    } catch (e) {
        console.error('Failed to notify caregivers:', e);
    }
};

/**
 * TECHNICAL NOTE:
 * For true WhatsApp and Email automation (without the app being open),
 * you must deploy a Supabase Edge Function that runs every 15 minutes.
 * 
 * 1. The Edge Function checks medication_reminders.
 * 2. It compares with medication_logs.
 * 3. It uses 'Resend' for Emails and 'Twilio' or 'Evolution API' for WhatsApp.
 */
