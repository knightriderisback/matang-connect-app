-- Stage 2 core schema

CREATE TABLE IF NOT EXISTS titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  title_key TEXT NOT NULL,
  title_label TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city_id, title_key)
);

CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  created_by UUID REFERENCES users(id),
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  contact_phone TEXT,
  salary_range TEXT,
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  requester_id UUID REFERENCES users(id),
  request_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  contact_phone TEXT,
  location TEXT,
  urgency TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL DEFAULT 'false',
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('stage_2_enabled', 'true'),
  ('stage_3_enabled', 'false'),
  ('kosh_transparency_mode', 'true'),
  ('sos_enabled', 'true'),
  ('jobs_enabled', 'true'),
  ('notices_enabled', 'true'),
  ('care_enabled', 'true'),
  ('titles_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS kosh_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  entry_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT,
  target_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notices_city ON notices(city_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_care_city ON care_requests(city_id, status);
CREATE INDEX IF NOT EXISTS idx_titles_city ON titles(city_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
