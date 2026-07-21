-- Run this in Supabase SQL Editor to add per-asset useful life (years) for depreciation
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS useful_life INTEGER DEFAULT 5;
