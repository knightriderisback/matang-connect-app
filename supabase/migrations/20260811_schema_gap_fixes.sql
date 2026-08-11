-- Gap fixes: jobs/notices drift from initial schema, audit columns, app_settings

-- ===== JOBS: support both old initial schema and Stage-2 API shape =====
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_range TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description TEXT;

-- Map legacy status → is_active where possible
UPDATE jobs SET is_active = true WHERE is_active IS NULL AND (status IS NULL OR status = 'active');
UPDATE jobs SET is_active = false WHERE is_active IS NULL AND status IS NOT NULL AND status <> 'active';
-- Backfill created_by from posted_by if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'posted_by'
  ) THEN
    UPDATE jobs SET created_by = posted_by WHERE created_by IS NULL AND posted_by IS NOT NULL;
  END IF;
END $$;

-- ===== NOTICES: Stage-2 API shape =====
ALTER TABLE notices ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE notices ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Backfill body from content (initial schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notices' AND column_name = 'content'
  ) THEN
    UPDATE notices SET body = content WHERE (body IS NULL OR body = '') AND content IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notices' AND column_name = 'posted_by'
  ) THEN
    UPDATE notices SET created_by = posted_by WHERE created_by IS NULL AND posted_by IS NOT NULL;
  END IF;
END $$;

-- body may still be NOT NULL on stage2-created tables; for legacy rows set placeholder
UPDATE notices SET body = COALESCE(NULLIF(body, ''), title, '—') WHERE body IS NULL OR body = '';

-- ===== AUDIT: dual meta/metadata =====
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS meta JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ===== USERS photo =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ===== Ensure login/register RPCs still grantable =====
GRANT EXECUTE ON FUNCTION login_with_mpin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_user TO anon, authenticated;

-- ===== Cities public read (idempotent) =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cities' AND policyname = 'Cities public read'
  ) THEN
    CREATE POLICY "Cities public read" ON cities FOR SELECT USING (true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- table may not have RLS enabled in some envs
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_city_active ON jobs(city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notices_city_created ON notices(city_id, created_at DESC);
