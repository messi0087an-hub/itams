-- ============================================================
-- ITAMS Migration 004: In-app notifications + borrow fields
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT         NOT NULL,
  body         TEXT,
  type         TEXT         DEFAULT 'info',   -- info | success | warning | request
  reference_id TEXT,                           -- e.g. asset_request id
  is_read      BOOLEAN      DEFAULT FALSE,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read) WHERE NOT is_read;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Any authenticated user can create a notification (needed to notify other users)
CREATE POLICY "Authenticated can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 2. Borrow history — borrowing-for fields
ALTER TABLE borrow_history
  ADD COLUMN IF NOT EXISTS borrowing_for    TEXT DEFAULT 'myself',  -- 'myself' | 'customer'
  ADD COLUMN IF NOT EXISTS customer_name    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signed_off_by    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signed_off_email TEXT DEFAULT NULL;

-- 3. Asset requests — track approving officer at time of submission
--    (needed for reminder emails even if officer changes in Settings later)
ALTER TABLE asset_requests
  ADD COLUMN IF NOT EXISTS approving_officer_email TEXT DEFAULT NULL;
