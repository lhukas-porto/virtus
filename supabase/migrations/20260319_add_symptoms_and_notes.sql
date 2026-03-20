-- Migration: 20260319_add_symptoms_and_notes.sql

-- Add notes to existing measurements if needed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='health_measurements' AND column_name='notes') THEN
        ALTER TABLE public.health_measurements ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Create table for symptoms
CREATE TABLE IF NOT EXISTS public.symptoms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symptom_type TEXT NOT NULL, -- e.g., 'Dor', 'Náusea', 'Tontura', 'Cansaço'
    description TEXT,
    severity INTEGER CHECK (severity >= 1 AND severity <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for symptoms_logs
ALTER TABLE public.symptoms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own symptoms"
ON public.symptoms_logs FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own symptoms"
ON public.symptoms_logs FOR INSERT
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own symptoms"
ON public.symptoms_logs FOR UPDATE
USING (profile_id = auth.uid());

CREATE POLICY "Users can delete their own symptoms"
ON public.symptoms_logs FOR DELETE
USING (profile_id = auth.uid());
