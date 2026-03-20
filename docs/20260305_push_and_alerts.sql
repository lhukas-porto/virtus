-- Migration: Add Push Tokens and Caregiver Alerts
-- Run this in the Supabase SQL Editor

-- 1. Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL,
    platform TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, token)
);

-- 2. Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens"
ON public.push_tokens
FOR ALL
USING (auth.uid() = user_id);

-- 3. Create medication_missed_alerts table (optional, but good for history)
CREATE TABLE IF NOT EXISTS public.missed_dose_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reminder_id UUID REFERENCES public.medication_reminders(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.missed_dose_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients and their caregivers can see missed alerts"
ON public.missed_dose_alerts
FOR SELECT
USING (
    auth.uid() = patient_id OR
    EXISTS (
        SELECT 1 FROM public.caregivers
        WHERE caregivers.patient_id = missed_dose_alerts.patient_id
        AND caregivers.caregiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);
