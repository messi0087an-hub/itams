-- ============================================================
-- ITAMS Migration 008: Multi-country isolation
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Ensure country column exists on assets table
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Singapore';

-- Ensure country column exists on user_profiles table
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;

-- Set existing assets with NULL country to Singapore (preserves existing data)
UPDATE public.assets
SET country = 'Singapore'
WHERE country IS NULL OR country = '';

-- Set existing users with NULL country to Singapore by default
UPDATE public.user_profiles
SET country = 'Singapore'
WHERE country IS NULL OR country = '';

-- Index for fast country-filtered queries
CREATE INDEX IF NOT EXISTS idx_assets_country ON public.assets (country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON public.user_profiles (country);
