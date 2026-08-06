ALTER TABLE borrow_history ADD COLUMN IF NOT EXISTS return_pending BOOLEAN DEFAULT false;
ALTER TABLE borrow_history ADD COLUMN IF NOT EXISTS return_comment TEXT;
