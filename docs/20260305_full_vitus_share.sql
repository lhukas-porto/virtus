-- MASTER MIGRATION: VITUS SHARE SYSTEM (CUIDADOR) v2 - RLS REFINED
-- Run this in the Supabase SQL Editor

-- 1. Create caregivers table
CREATE TABLE IF NOT EXISTS public.caregivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    caregiver_email TEXT NOT NULL,
    caregiver_name TEXT,
    caregiver_phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL,
    platform TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, token)
);

-- 3. Create missed_dose_alerts table
CREATE TABLE IF NOT EXISTS public.missed_dose_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reminder_id UUID REFERENCES public.medication_reminders(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE RLS
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missed_dose_alerts ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (Rethinking EMAIL check for performance and security)

DROP POLICY IF EXISTS "Users can manage their own caregiver list" ON public.caregivers;
CREATE POLICY "Users can manage their own caregiver list" ON public.caregivers FOR ALL USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.push_tokens;
CREATE POLICY "Users can manage their own tokens" ON public.push_tokens FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Patients and their caregivers can see missed alerts" ON public.missed_dose_alerts;
CREATE POLICY "Patients and their caregivers can see missed alerts" ON public.missed_dose_alerts 
FOR SELECT USING (
    auth.uid() = patient_id OR
    EXISTS (
        SELECT 1 FROM public.caregivers
        WHERE caregivers.patient_id = missed_dose_alerts.patient_id
        AND caregivers.caregiver_email = (auth.jwt() ->> 'email')
    )
);

-- 5. ACCESS TO PATIENT DATA (Profiles, Meds, Reminders, Logs)

-- Profiles
DROP POLICY IF EXISTS "Caregivers can view shared profiles" ON public.profiles;
CREATE POLICY "Caregivers can view shared profiles" ON public.profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.caregivers
        WHERE caregivers.patient_id = public.profiles.id
        AND caregivers.caregiver_email = (auth.jwt() ->> 'email')
    )
);

-- Medications
DROP POLICY IF EXISTS "Caregivers can view shared medications" ON public.medications;
CREATE POLICY "Caregivers can view shared medications" ON public.medications FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.caregivers
        WHERE caregivers.patient_id = medications.profile_id
        AND caregivers.caregiver_email = (auth.jwt() ->> 'email')
    )
);

-- Reminders
DROP POLICY IF EXISTS "Caregivers can view shared reminders" ON public.medication_reminders;
CREATE POLICY "Caregivers can view shared reminders" ON public.medication_reminders FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.caregivers
        JOIN public.medications ON medications.id = medication_reminders.medication_id
        WHERE medications.profile_id = caregivers.patient_id
        AND caregivers.caregiver_email = (auth.jwt() ->> 'email')
    )
);

-- Logs
DROP POLICY IF EXISTS "Caregivers can view shared logs" ON public.medication_logs;
CREATE POLICY "Caregivers can view shared logs" ON public.medication_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.caregivers
        WHERE caregivers.patient_id = (SELECT profile_id FROM public.medications WHERE id = medication_logs.medication_id)
        AND caregivers.caregiver_email = (auth.jwt() ->> 'email')
    )
);
