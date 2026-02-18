-- Allow authenticated users to contribute to the global catalog
-- This enables the "crowdsourcing" or "cache" mechanism where found medicines are saved for everyone.

CREATE POLICY "Allow authenticated insert" ON public.medication_catalog
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Optionally allow updates if we want users to correct data, but maybe risky for now.
-- Let's just allow insert.
