-- Stage 1 completion: optional census columns + rate limit support
-- Run in Supabase SQL Editor if columns/functions are missing.

ALTER TABLE families ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS duplicate_flag BOOLEAN DEFAULT false;

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS disability TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT,
  target_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION admin_reset_mpin(p_user_id UUID, p_new_mpin TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_new_mpin IS NULL OR length(p_new_mpin) <> 4 OR p_new_mpin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'INVALID_MPIN';
  END IF;
  UPDATE users
  SET mpin_hash = crypt(p_new_mpin, gen_salt('bf')),
      failed_login_attempts = 0,
      locked_until = NULL,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
