-- Migration: 20260812_mpin_lockout_safety.sql
-- Description: Ensures columns and index exist for M-PIN rate limiting & account lockout.
-- Safety: Fully idempotent. Non-destructive. No data loss.

ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_mpin_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin_locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_phone_lockout
ON users (phone, mpin_locked_until);
