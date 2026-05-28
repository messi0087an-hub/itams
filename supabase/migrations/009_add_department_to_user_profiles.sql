-- Run this in Supabase SQL Editor to re-enable department field on user profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS department TEXT;
