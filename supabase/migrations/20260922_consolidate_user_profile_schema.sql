-- =========================================================================
-- Consolidate User Profile & Vanshawali Pos Schema
-- This fixes the schema gaps where code was falling back to app_settings
-- and localStorage.
-- =========================================================================

-- 1. Ensure all extended user profile columns exist directly on the users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS failed_mpin_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS mpin_locked_until TIMESTAMPTZ;

-- Index frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_city_id ON users(city_id);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_qr_code_id ON users(qr_code_id);

-- 2. Ensure vanshawali positions can be stored permanently in the database
-- rather than solely in localStorage per device
ALTER TABLE vanshawali_people
ADD COLUMN IF NOT EXISTS pos_x NUMERIC,
ADD COLUMN IF NOT EXISTS pos_y NUMERIC,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure families table has duplicate check column
ALTER TABLE families
ADD COLUMN IF NOT EXISTS is_duplicate_flag BOOLEAN DEFAULT FALSE;

-- 4. RLS safety verification (Allow users to read verified profiles, staff full access)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read verified member profiles' AND tablename = 'users') THEN
    CREATE POLICY "Public read verified member profiles" ON users
      FOR SELECT USING (verification_status = 'verified');
  END IF;
END $$;
