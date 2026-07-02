-- ============================================================
-- 014_marketing_phase3_timing_attendance.sql
-- Trainer timing coordination + class attendance tracking
-- ============================================================

-- 1. marketing_trainer_timing (one record per class)
CREATE TABLE IF NOT EXISTS marketing_trainer_timing (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id          UUID REFERENCES marketing_classes(id) ON DELETE CASCADE UNIQUE,
  trainer_name      TEXT,
  arrival_time      TIME,
  start_time        TIME,
  end_time          TIME,
  notes             TEXT,
  recorded_by       UUID REFERENCES user_profiles(id),
  recorded_by_name  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. marketing_attendance (one record per attendee per class)
CREATE TABLE IF NOT EXISTS marketing_attendance (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id         UUID REFERENCES marketing_classes(id) ON DELETE CASCADE,
  attendee_name    TEXT NOT NULL,
  status           TEXT DEFAULT 'Present',
  created_by       UUID REFERENCES user_profiles(id),
  created_by_name  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_attendance_class ON marketing_attendance(class_id);

ALTER TABLE marketing_trainer_timing ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_attendance     ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['marketing_trainer_timing', 'marketing_attendance'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "marketing_select" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "marketing_insert" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "marketing_update" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "marketing_delete" ON %I', tbl);

    EXECUTE format('CREATE POLICY "marketing_select" ON %I FOR SELECT USING (is_marketing_user())', tbl);
    EXECUTE format('CREATE POLICY "marketing_insert" ON %I FOR INSERT WITH CHECK (is_marketing_user())', tbl);
    EXECUTE format('CREATE POLICY "marketing_update" ON %I FOR UPDATE USING (is_marketing_user())', tbl);
    EXECUTE format('CREATE POLICY "marketing_delete" ON %I FOR DELETE USING (is_marketing_user())', tbl);
  END LOOP;
END $$;
