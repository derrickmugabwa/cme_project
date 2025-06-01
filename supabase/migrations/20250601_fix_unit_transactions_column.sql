-- Fix column name in unit_transactions table
ALTER TABLE unit_transactions RENAME COLUMN reference_id TO session_id;
