-- Stage 3 modules schema
-- Vyapar | Matrimony | Dharohar | Panchang | Mahila Shakti | Polls

-- 1. Vyapar (Business directory)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- shop, service, manufacturing, food, other
  description TEXT,
  address TEXT,
  contact_phone TEXT,
  whatsapp TEXT,
  photo_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);

-- 2. Matrimony profiles
CREATE TABLE IF NOT EXISTS matrimony_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  city_id UUID REFERENCES cities(id),
  gender TEXT NOT NULL, -- male, female
  age INT,
  height_cm INT,
  education TEXT,
  occupation TEXT,
  native_village TEXT,
  about TEXT,
  looking_for TEXT,
  photo_url TEXT,
  contact_visible BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matrimony_city ON matrimony_profiles(city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_matrimony_gender ON matrimony_profiles(gender, is_active);

-- 3. Dharohar (Heritage / culture posts)
CREATE TABLE IF NOT EXISTS dharohar_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  created_by UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'culture', -- culture, history, festival, art, language
  photo_url TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dharohar_city ON dharohar_posts(city_id, created_at DESC);

-- 4. Panchang / Festivals
CREATE TABLE IF NOT EXISTS festivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  festival_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT true, -- yearly
  city_id UUID REFERENCES cities(id), -- null = global
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_festivals_date ON festivals(festival_date);

-- 5. Mahila Shakti (Women empowerment)
CREATE TABLE IF NOT EXISTS mahila_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  created_by UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  post_type TEXT DEFAULT 'resource', -- resource, event, success_story, scheme
  event_date DATE,
  contact_phone TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mahila_city ON mahila_posts(city_id, created_at DESC);

-- 6. Community Polls
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  created_by UUID REFERENCES users(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- ["Option A", "Option B"]
  is_active BOOLEAN DEFAULT true,
  ends_at TIMESTAMPTZ,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_polls_city ON polls(city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

-- Feature flags for Stage 3
INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('stage_3_enabled', 'true'),
  ('vyapar_enabled', 'true'),
  ('matrimony_enabled', 'true'),
  ('dharohar_enabled', 'true'),
  ('panchang_enabled', 'true'),
  ('mahila_enabled', 'true'),
  ('polls_enabled', 'true')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
