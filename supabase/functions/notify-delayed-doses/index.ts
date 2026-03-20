// supabase/functions/notify-delayed-doses/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
    const supabaseClient = createClient(
        Deno.env.get('VITUS_SUPABASE_URL') ?? '',
        Deno.env.get('VITUS_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        // 1. Buscar lembretes ativos
        const { data: reminders, error: rErr } = await supabaseClient
            .from('medication_reminders')
            .select('*, medications(name, profile_id)');

        if (rErr) throw rErr;

        const notifications = [];

        for (const rem of reminders) {
            const medication = rem.medications;
            const patientId = medication.profile_id;
            const frequencyHours = rem.frequency_hours || 24;
            
            // 2. Verificar o último log deste lembrete
            const { data: logs, error: lErr } = await supabaseClient
                .from('medication_logs')
                .select('taken_at')
                .eq('reminder_id', rem.id)
                .order('taken_at', { ascending: false })
                .limit(1);

            if (lErr) continue;

            const now = new Date();
            const lastTaken = logs && logs[0] ? new Date(logs[0].taken_at) : new Date(rem.created_at);
            const diffHours = (now.getTime() - lastTaken.getTime()) / (1000 * 60 * 60);

            // Se o atraso for maior que a frequência + 45 minutos de tolerância
            if (diffHours > (frequencyHours + 0.75)) {
                // 3. Buscar cuidadores e seus tokens
                const { data: caregivers, error: cErr } = await supabaseClient
                    .from('caregivers')
                    .select('caregiver_email')
                    .eq('patient_id', patientId);

                if (cErr || !caregivers.length) continue;

                for (const cg of caregivers) {
                    const { data: prof } = await supabaseClient
                        .from('profiles')
                        .select('push_token, name')
                        .eq('email', cg.caregiver_email)
                        .single();

                    if (prof?.push_token) {
                        notifications.push({
                            to: prof.push_token,
                            title: `🚨 Alerta de Atraso: ${medication.name}`,
                            body: `Atenção! O paciente ainda não confirmou a dose de ${medication.name}. Que tal dar uma conferida?`,
                            data: { type: 'caregiver_alert', patientId }
                        });
                    }
                }
            }
        }

        // 4. Enviar para o Expo
        if (notifications.length > 0) {
            await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notifications),
            });
        }

        return new Response(JSON.stringify({ sent: notifications.length }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
