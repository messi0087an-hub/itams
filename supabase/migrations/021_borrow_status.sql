ALTER TABLE borrow_history ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE borrow_history ADD COLUMN IF NOT EXISTS admin_comment TEXT;

-- Existing rows predate the approval workflow — treat them as already approved
-- so history/reports/overdue tracking aren't disrupted. Only new inserts default to 'pending'.
UPDATE borrow_history SET status = 'approved' WHERE status = 'pending';
