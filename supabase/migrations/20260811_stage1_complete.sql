-- Stage 1 completion: census columns + correct admin_reset_mpin (aligned with m_pin_hash schema)

-- Family contact + soft duplicate flag
ALTER TABLE families ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS duplicate_flag BOOLEAN DEFAULT false;

-- Expanded family member fields
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS disability TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- User photo
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Ensure audit_logs exists with both meta + metadata compatibility
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT,
  target_id TEXT,
  meta JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS meta JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Admin reset M-PIN RPC — MUST use real column names from initial schema
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
  SET m_pin_hash = crypt(p_new_mpin, gen_salt('bf', 10)),
      failed_mpin_attempts = 0,
      mpin_locked_until = NULL
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reset_mpin TO service_role;
-- Also allow authenticated for edge cases (API uses service role)
GRANT EXECUTE ON FUNCTION admin_reset_mpin TO authenticated;
