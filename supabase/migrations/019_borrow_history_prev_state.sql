-- Run this in Supabase SQL Editor to snapshot the asset's pre-borrow status/owner
-- so handleReturn can restore it correctly instead of always defaulting to "available"
ALTER TABLE borrow_history
  ADD COLUMN IF NOT EXISTS prev_status TEXT,
  ADD COLUMN IF NOT EXISTS prev_assigned_user TEXT;
