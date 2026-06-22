-- ============================================================
-- 010_marketing_module.sql
-- Marketing ITAMS — full schema
-- ============================================================

-- User profile extensions
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS marketing_access BOOLEAN DEFAULT false;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS marketing_role TEXT DEFAULT null;

-- 1. marketing_items
CREATE TABLE IF NOT EXISTS marketing_items (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  category         TEXT,
  description      TEXT,
  image_url        TEXT,
  item_code        TEXT,
  unit             TEXT DEFAULT 'pcs',
  cost_per_unit    DECIMAL(10,2),
  delivery_charge  DECIMAL(10,2),
  tax_amount       DECIMAL(10,2),
  total_cost       DECIMAL(10,2),
  is_free_from_vendor BOOLEAN DEFAULT false,
  supplier_name    TEXT,
  minimum_stock_level INTEGER DEFAULT 0,
  expiry_date      DATE,
  country          TEXT DEFAULT 'Singapore',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. marketing_item_variants
CREATE TABLE IF NOT EXISTS marketing_item_variants (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id      UUID REFERENCES marketing_items(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  color        TEXT,
  size         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. marketing_locations
CREATE TABLE IF NOT EXISTS marketing_locations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  country     TEXT DEFAULT 'Singapore',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO marketing_locations (name) VALUES
  ('Marketing Room'),
  ('Sales Port'),
  ('Level 19 Cabinet'),
  ('Port Room 1'),
  ('Port Room 2'),
  ('Shelf outside Finance Office')
ON CONFLICT DO NOTHING;

-- 4. marketing_stock
CREATE TABLE IF NOT EXISTS marketing_stock (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id       UUID REFERENCES marketing_items(id) ON DELETE CASCADE,
  variant_id    UUID REFERENCES marketing_item_variants(id),
  location_id   UUID REFERENCES marketing_locations(id),
  quantity      INTEGER DEFAULT 0,
  opening_stock INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. marketing_stock_movements
CREATE TABLE IF NOT EXISTS marketing_stock_movements (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id          UUID REFERENCES marketing_items(id),
  variant_id       UUID REFERENCES marketing_item_variants(id),
  location_id      UUID REFERENCES marketing_locations(id),
  movement_type    TEXT NOT NULL,
  quantity         INTEGER NOT NULL,
  from_location_id UUID REFERENCES marketing_locations(id),
  to_location_id   UUID REFERENCES marketing_locations(id),
  reason           TEXT,
  notes            TEXT,
  class_id         UUID,
  event_id         UUID,
  performed_by     UUID REFERENCES user_profiles(id),
  performed_by_name TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 6. marketing_classes
CREATE TABLE IF NOT EXISTS marketing_classes (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name       TEXT NOT NULL,
  class_date       DATE NOT NULL,
  class_type       TEXT,
  trainer_name     TEXT,
  account_manager  TEXT,
  person_in_charge TEXT,
  classroom        TEXT,
  pax_count        INTEGER DEFAULT 0,
  pax_confirmed    INTEGER DEFAULT 0,
  end_date         DATE,
  notes            TEXT,
  country          TEXT DEFAULT 'Singapore',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 7. marketing_class_gifts
CREATE TABLE IF NOT EXISTS marketing_class_gifts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id         UUID REFERENCES marketing_classes(id) ON DELETE CASCADE,
  item_id          UUID REFERENCES marketing_items(id),
  variant_id       UUID REFERENCES marketing_item_variants(id),
  quantity         INTEGER NOT NULL,
  is_packed        BOOLEAN DEFAULT false,
  is_distributed   BOOLEAN DEFAULT false,
  packed_by        UUID REFERENCES user_profiles(id),
  packed_at        TIMESTAMPTZ,
  distributed_by   UUID REFERENCES user_profiles(id),
  distributed_at   TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 8. marketing_events
CREATE TABLE IF NOT EXISTS marketing_events (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name        TEXT NOT NULL,
  event_date        DATE NOT NULL,
  end_date          DATE,
  description       TEXT,
  partner_category  TEXT,
  partners          TEXT,
  project_lead      TEXT,
  account_manager   TEXT,
  event_modality    TEXT,
  target_group      TEXT,
  sub_category      TEXT,
  external_funding  BOOLEAN DEFAULT false,
  trainer           TEXT,
  budget            DECIMAL(10,2),
  actual_cost       DECIMAL(10,2),
  registrations     INTEGER DEFAULT 0,
  attendees         INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'upcoming',
  country           TEXT DEFAULT 'Singapore',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 9. marketing_event_collaterals
CREATE TABLE IF NOT EXISTS marketing_event_collaterals (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id              UUID REFERENCES marketing_events(id) ON DELETE CASCADE,
  item_id               UUID REFERENCES marketing_items(id),
  variant_id            UUID REFERENCES marketing_item_variants(id),
  quantity_needed       INTEGER NOT NULL,
  quantity_taken        INTEGER DEFAULT 0,
  quantity_returned     INTEGER DEFAULT 0,
  quantity_damaged      INTEGER DEFAULT 0,
  signed_out_by         UUID REFERENCES user_profiles(id),
  signed_out_name       TEXT,
  signed_out_at         TIMESTAMPTZ,
  signed_out_signature  TEXT,
  signed_in_by          UUID REFERENCES user_profiles(id),
  signed_in_name        TEXT,
  signed_in_at          TIMESTAMPTZ,
  signed_in_signature   TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 10. marketing_approvals
CREATE TABLE IF NOT EXISTS marketing_approvals (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type      TEXT NOT NULL,
  requested_by      UUID REFERENCES user_profiles(id),
  requested_by_name TEXT,
  item_id           UUID REFERENCES marketing_items(id),
  quantity          INTEGER,
  reason            TEXT,
  event_id          UUID REFERENCES marketing_events(id),
  status            TEXT DEFAULT 'pending',
  approver_id       UUID REFERENCES user_profiles(id),
  approver_name     TEXT,
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  reminder_sent_at  TIMESTAMPTZ,
  country           TEXT DEFAULT 'Singapore',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 11. marketing_notifications
CREATE TABLE IF NOT EXISTS marketing_notifications (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES user_profiles(id),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  type         TEXT DEFAULT 'info',
  is_read      BOOLEAN DEFAULT false,
  related_id   UUID,
  related_type TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 12. marketing_stocktake
CREATE TABLE IF NOT EXISTS marketing_stocktake (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id          UUID REFERENCES marketing_items(id),
  variant_id       UUID REFERENCES marketing_item_variants(id),
  location_id      UUID REFERENCES marketing_locations(id),
  system_quantity  INTEGER,
  actual_quantity  INTEGER,
  discrepancy      INTEGER,
  notes            TEXT,
  performed_by     UUID REFERENCES user_profiles(id),
  performed_by_name TEXT,
  stocktake_date   DATE DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 13. marketing_qr_notes
CREATE TABLE IF NOT EXISTS marketing_qr_notes (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id          UUID REFERENCES marketing_items(id),
  variant_id       UUID REFERENCES marketing_item_variants(id),
  quantity_taken   INTEGER,
  taken_by_name    TEXT,
  reason           TEXT,
  notes            TEXT,
  acknowledged_by  UUID REFERENCES user_profiles(id),
  acknowledged_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE marketing_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_item_variants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_stock              ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_stock_movements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_classes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_class_gifts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_event_collaterals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_approvals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_stocktake          ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_qr_notes           ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user has marketing_access
CREATE OR REPLACE FUNCTION is_marketing_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND (marketing_access = true OR role = 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies for each marketing table (read + write for marketing users / admins)
DO $$ DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'marketing_items','marketing_item_variants','marketing_locations',
    'marketing_stock','marketing_stock_movements','marketing_classes',
    'marketing_class_gifts','marketing_events','marketing_event_collaterals',
    'marketing_approvals','marketing_stocktake','marketing_qr_notes'
  ] LOOP
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

-- marketing_notifications: own rows only for staff; admin sees all
DROP POLICY IF EXISTS "marketing_notifications_select" ON marketing_notifications;
CREATE POLICY "marketing_notifications_select" ON marketing_notifications
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "marketing_notifications_insert" ON marketing_notifications;
CREATE POLICY "marketing_notifications_insert" ON marketing_notifications
  FOR INSERT WITH CHECK (is_marketing_user());

DROP POLICY IF EXISTS "marketing_notifications_update" ON marketing_notifications;
CREATE POLICY "marketing_notifications_update" ON marketing_notifications
  FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));
