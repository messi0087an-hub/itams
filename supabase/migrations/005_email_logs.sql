-- ============================================================
-- ITAMS Migration 005: Email deduplication log
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Tracks which automated emails have already been sent to prevent duplicates.
-- The `type` field encodes both the action and entity ID
-- (e.g. "approval_reminder_3_UUID", "warranty_7_UUID", "borrow_due_emp_UUID")
-- so a unique constraint on type alone covers all dedup needs.

CREATE TABLE IF NOT EXISTS email_logs (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type         TEXT        NOT NULL UNIQUE,  -- unique email event key
  reference_id TEXT        NOT NULL,         -- the entity this email relates to
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_reference ON email_logs(reference_id);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users need SELECT to check if an email was already sent
CREATE POLICY "Authenticated can read email logs"
  ON email_logs FOR SELECT TO authenticated USING (true);

-- Authenticated users need INSERT to record sent emails
CREATE POLICY "Authenticated can insert email logs"
  ON email_logs FOR INSERT TO authenticated WITH CHECK (true);
