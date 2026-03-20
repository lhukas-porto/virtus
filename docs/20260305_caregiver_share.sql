-- Migration: Add Caregivers support (Vitus Share)
-- Run this in the Supabase SQL Editor

-- 1. Create caregivers table
CREATE TABLE IF NOT EXISTS public.caregivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    caregiver_email TEXT NOT NULL,
    caregiver_name TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;

-- 3. Basic RLS Policies for the table itself
CREATE POLICY "Users can manage their own caregiver list"
ON public.caregivers
FOR ALL
USING (auth.uid() = patient_id);

-- 4. CRITICAL: Update other tables to allow caregivers to see data
-- Note: This assumes the caregiver logs in with the SAME email.
-- We use a function or a subquery in policies.

-- Policy for profiles
CREATE POLICY "Caregivers can view shared profiles"
ON public.profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.caregivers
        WHERE caregivers.patient_id = public.profiles.id
        AND caregivers.caregiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Policy for medications
CREATE POLICY "Caregivers can view shared medications"
ON public.medications
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.caregivers
        WHERE caregivers.patient_id = medications.user_id
        AND caregivers.caregiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Policy for reminders
CREATE POLICY "Caregivers can view shared reminders"
ON public.medication_reminders
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.caregivers
        JOIN public.medications ON medications.id = medication_reminders.medication_id
        WHERE medications.user_id = caregivers.patient_id
        AND caregivers.caregiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Policy for logs
CREATE POLICY "Caregivers can view shared logs"
ON public.medication_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.caregivers
        WHERE caregivers.patient_id = (SELECT user_id FROM public.medications WHERE id = medication_logs.medication_id)
        AND caregivers.caregiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- 5. Add a view or a way to list "Patients I am caring for"
-- (Handled in the App logic via query to caregivers table)
