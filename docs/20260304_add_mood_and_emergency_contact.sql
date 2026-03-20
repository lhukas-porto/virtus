-- Migration: Add mood field to health_measurements
-- and emergency contact fields are stored in user metadata (no DB change needed for those)
-- Run this in the Supabase SQL Editor

-- Add mood column to health_measurements table (1-5 rating or NULL)
ALTER TABLE health_measurements
ADD COLUMN IF NOT EXISTS mood SMALLINT CHECK (mood >= 1 AND mood <= 5);

COMMENT ON COLUMN health_measurements.mood IS 'Daily wellbeing rating from 1 (very bad) to 5 (excellent). Optional, entered by user.';
