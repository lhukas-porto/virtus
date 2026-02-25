-- 1. Create medication_user table (Collaborative Database)
CREATE TABLE IF NOT EXISTS public.medication_user (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ean TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS for medication_user
ALTER TABLE public.medication_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view medication_user" ON public.medication_user
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert to medication_user" ON public.medication_user
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Update medication_reminders with new fields
ALTER TABLE public.medication_reminders 
ADD COLUMN IF NOT EXISTS dosage_quantity DECIMAL,
ADD COLUMN IF NOT EXISTS dosage_unit TEXT DEFAULT 'comprimido(s)',
ADD COLUMN IF NOT EXISTS duration_days INTEGER;

-- 4. Storage Bucket Policy (Just in case)
-- Note: Ensure 'medications' bucket exists in Supabase Storage.
