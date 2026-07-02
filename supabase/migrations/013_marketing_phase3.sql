-- ============================================================
-- 013_marketing_phase3.sql
-- Google Review gift tracking + paid ads campaign tracking
-- ============================================================

-- 1. marketing_google_reviews
CREATE TABLE IF NOT EXISTS marketing_google_reviews (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id       UUID REFERENCES marketing_classes(id) ON DELETE CASCADE,
  attendee_name  TEXT NOT NULL,
  left_review    BOOLEAN DEFAULT false,
  gift_item_id   UUID REFERENCES marketing_items(id),
  notes          TEXT,
  created_by     UUID REFERENCES user_profiles(id),
  created_by_name TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_google_reviews_class ON marketing_google_reviews(class_id);

-- 2. marketing_ads
CREATE TABLE IF NOT EXISTS marketing_ads (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform         TEXT NOT NULL,
  campaign_name    TEXT NOT NULL,
  budget           DECIMAL(10,2) DEFAULT 0,
  spend            DECIMAL(10,2) DEFAULT 0,
  start_date       DATE,
  end_date         DATE,
  status           TEXT DEFAULT 'Active',
  leads_generated  INTEGER DEFAULT 0,
  notes            TEXT,
  created_by       UUID REFERENCES user_profiles(id),
  created_by_name  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketing_google_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_ads            ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['marketing_google_reviews', 'marketing_ads'] LOOP
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
