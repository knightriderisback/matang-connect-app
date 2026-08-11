-- Matang Connect Initial Schema - Stage 1 Complete (100%)
-- Compatible with the fixed application code (city_id, RPCs, rate limiting)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    state text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    m_pin_hash text NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'normal' CHECK (role IN ('normal', 'volunteer', 'core_committee', 'super_admin')),
    city_id uuid REFERENCES cities(id),
    native_village text NOT NULL,
    verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by uuid REFERENCES users(id),
    verified_at timestamptz,
    qr_code_id text UNIQUE,
    title text,
    failed_mpin_attempts integer DEFAULT 0,
    mpin_locked_until timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS families (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    head_of_family uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    native_village text NOT NULL,
    address text NOT NULL,
    education_summary text,
    employment_status text DEFAULT 'employed',
    needs text[] DEFAULT '{}',
    is_duplicate_flag boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS family_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name text NOT NULL,
    relation text NOT NULL,
    age integer NOT NULL,
    gender text,
    education_level text,
    occupation text,
    is_unemployed boolean DEFAULT false,
    needs_care boolean DEFAULT false,
    blood_group text,
    marital_status text,
    phone text,
    skills text[],
    disability text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_key text NOT NULL,
    granted_by uuid REFERENCES users(id),
    granted_at timestamptz DEFAULT now(),
    UNIQUE(user_id, permission_key)
);

CREATE TABLE IF NOT EXISTS app_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key text NOT NULL UNIQUE,
    setting_value jsonb DEFAULT 'false',
    updated_by uuid REFERENCES users(id),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id uuid NOT NULL REFERENCES users(id),
    action text NOT NULL,
    target_id text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mpin_rate_limits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone text NOT NULL,
    action text NOT NULL,
    attempt_count integer DEFAULT 1,
    first_attempt_at timestamptz DEFAULT now(),
    locked_until timestamptz,
    UNIQUE(phone, action)
);

CREATE TABLE IF NOT EXISTS sos_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    raised_by uuid NOT NULL REFERENCES users(id),
    type text NOT NULL,
    status text DEFAULT 'active',
    city_id uuid REFERENCES cities(id),
    message text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sahyog_kosh_contributions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contributor_id uuid REFERENCES users(id),
    amount numeric NOT NULL,
    purpose text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kosh_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    amount numeric NOT NULL,
    category text NOT NULL,
    description text,
    recorded_by uuid NOT NULL REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    posted_by uuid NOT NULL REFERENCES users(id),
    title text NOT NULL,
    description text,
    city_id uuid REFERENCES cities(id),
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    posted_by uuid NOT NULL REFERENCES users(id),
    title text NOT NULL,
    content text,
    type text DEFAULT 'general',
    city_id uuid REFERENCES cities(id),
    created_at timestamptz DEFAULT now()
);

INSERT INTO cities (name, state) VALUES
    ('Bilaspur', 'Chhattisgarh'),
    ('Raipur', 'Chhattisgarh'),
    ('Nagpur', 'Maharashtra'),
    ('Mumbai', 'Maharashtra')
ON CONFLICT DO NOTHING;

INSERT INTO app_settings (setting_key, setting_value) VALUES
    ('stage_2_enabled', 'false'),
    ('stage_3_enabled', 'false'),
    ('kosh_transparency_mode', 'false'),
    ('sos_enabled', 'false'),
    ('jobs_enabled', 'false'),
    ('notices_enabled', 'false')
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION register_user(
    p_full_name text,
    p_phone text,
    p_mpin text,
    p_city_id uuid,
    p_native_village text
)
RETURNS TABLE (id uuid, qr_code_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hash text;
    v_qr text;
    v_user_id uuid;
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE phone = p_phone) THEN
        RAISE EXCEPTION 'PHONE_EXISTS';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM cities WHERE id = p_city_id AND is_active = true) THEN
        RAISE EXCEPTION 'INVALID_CITY';
    END IF;
    IF length(p_mpin) <> 4 OR p_mpin !~ '^\d{4}$' THEN
        RAISE EXCEPTION 'INVALID_MPIN';
    END IF;
    v_hash := crypt(p_mpin, gen_salt('bf', 10));
    v_qr := 'MATANG-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
    INSERT INTO users (full_name, phone, m_pin_hash, city_id, native_village, qr_code_id, role, verification_status)
    VALUES (p_full_name, p_phone, v_hash, p_city_id, p_native_village, v_qr, 'normal', 'pending')
    RETURNING users.id, users.qr_code_id INTO v_user_id, v_qr;
    RETURN QUERY SELECT v_user_id, v_qr;
END;
$$;

CREATE OR REPLACE FUNCTION login_with_mpin(
    p_phone text,
    p_mpin text
)
RETURNS TABLE (
    id uuid,
    full_name text,
    role text,
    city_id uuid,
    qr_code_id text,
    verification_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user users%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM users WHERE phone = p_phone;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    IF v_user.mpin_locked_until IS NOT NULL AND v_user.mpin_locked_until > now() THEN
        RAISE EXCEPTION 'ACCOUNT_LOCKED';
    END IF;
    IF v_user.m_pin_hash = crypt(p_mpin, v_user.m_pin_hash) THEN
        UPDATE users SET failed_mpin_attempts = 0, mpin_locked_until = NULL WHERE users.id = v_user.id;
        RETURN QUERY SELECT v_user.id, v_user.full_name, v_user.role, v_user.city_id, v_user.qr_code_id, v_user.verification_status;
    ELSE
        UPDATE users
        SET failed_mpin_attempts = COALESCE(failed_mpin_attempts, 0) + 1,
            mpin_locked_until = CASE
                WHEN COALESCE(failed_mpin_attempts, 0) + 1 >= 5 THEN now() + interval '15 minutes'
                ELSE mpin_locked_until
            END
        WHERE users.id = v_user.id;
        RETURN;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION register_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_with_mpin TO anon, authenticated;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities public read" ON cities FOR SELECT USING (true);

COMMENT ON FUNCTION login_with_mpin IS 'Secure M-PIN login - hash never leaves DB + rate limit';
COMMENT ON FUNCTION register_user IS 'Secure registration - hashing server-side';
