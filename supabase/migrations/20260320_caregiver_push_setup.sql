-- Add push_token and email to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Ensure caregivers table exists (if missing)
CREATE TABLE IF NOT EXISTS public.caregivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    caregiver_email TEXT NOT NULL,
    caregiver_id UUID REFERENCES auth.users(id), -- Opcional, se o cuidador já for usuário
    caregiver_name TEXT,
    caregiver_phone TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for caregivers
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own caregivers"
ON public.caregivers FOR ALL
USING (patient_id = auth.uid());
