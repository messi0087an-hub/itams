CREATE TABLE IF NOT EXISTS system_settings (
  id text PRIMARY KEY DEFAULT 'global',
  currency text DEFAULT 'SGD',
  updated_at timestamptz DEFAULT now()
);
INSERT INTO system_settings (id, currency) VALUES ('global', 'SGD') ON CONFLICT (id) DO NOTHING;
