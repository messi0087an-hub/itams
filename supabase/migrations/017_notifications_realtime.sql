-- ============================================================
-- ITAMS Migration 017: Enable realtime on notifications
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Required for the bell notification to update instantly without
-- a page refresh (NotificationContext subscribes to postgres_changes).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
