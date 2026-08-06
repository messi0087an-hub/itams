ALTER TABLE borrow_history ADD COLUMN IF NOT EXISTS requested_due_date DATE;
ALTER TABLE borrow_history ADD COLUMN IF NOT EXISTS extension_comment TEXT;
