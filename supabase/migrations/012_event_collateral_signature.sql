-- ============================================================
-- 012_event_collateral_signature.sql
-- Digital signature capture for event collateral sign-out/sign-in
-- ============================================================

ALTER TABLE marketing_event_collaterals ADD COLUMN IF NOT EXISTS signature text;
