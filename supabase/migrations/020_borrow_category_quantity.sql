-- Borrow requests are now category + quantity based, not tied to one specific asset.
ALTER TABLE borrow_history
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS needed_by_date DATE;

ALTER TABLE borrow_history
  ALTER COLUMN asset_id DROP NOT NULL;
