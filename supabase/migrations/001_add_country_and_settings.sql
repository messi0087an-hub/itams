-- ============================================================
-- ITAMS Migration 001: Country support + App Settings
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add country column to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;

-- 2. Create app_settings table (key-value store for system config)
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Seed the default approving officer email
INSERT INTO app_settings (key, value)
  VALUES ('approving_officer_email', 'jamaludin.ali@trainocate.com')
  ON CONFLICT (key) DO NOTHING;

-- 4. Enable Row Level Security on app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings (needed to fetch approving email)
CREATE POLICY "Authenticated users can read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can write settings (enforced at app level, this is a backup)
CREATE POLICY "Admins can write settings"
  ON app_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
