-- Create a global catalog table for medications
CREATE TABLE IF NOT EXISTS public.medication_catalog (
    ean TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    dosage TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.medication_catalog ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read (SELECT) from the catalog
CREATE POLICY "Allow public read access" ON public.medication_catalog
    FOR SELECT USING (true);

-- Policy: Only authenticated users (or service role) can insert/update (optional, depends on strategy)
-- For now, let's allow authenticated users to contribute to the catalog if needed, or keep it strictly curated.
-- We'll just allow read for now publicly.

-- Create an index on EAN for faster lookups (already PK, but explicit doesn't hurt if we change PK)
-- CREATE INDEX idx_medication_catalog_ean ON public.medication_catalog(ean);
