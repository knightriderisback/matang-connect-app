-- Remaining DPR gaps: campaigns, rides, gamification, gaurav, notice categories

-- Notice category (includes shok_sandesh)
ALTER TABLE notices ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
-- general | meeting | shok_sandesh | announcement | other

-- Kosh fundraising campaigns with progress
CREATE TABLE IF NOT EXISTS kosh_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  title TEXT NOT NULL,
  description TEXT,
  goal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  raised_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'open', -- open, closed
  created_by UUID REFERENCES users(id),
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kosh_campaigns_city ON kosh_campaigns(city_id, status);

ALTER TABLE kosh_entries ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES kosh_campaigns(id) ON DELETE SET NULL;

-- Ride sharing
CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  poster_id UUID REFERENCES users(id),
  ride_type TEXT DEFAULT 'offer', -- offer | need
  from_place TEXT NOT NULL,
  to_place TEXT NOT NULL,
  ride_date DATE,
  ride_time TEXT,
  seats INT DEFAULT 1,
  contact_phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rides_city ON rides(city_id, is_active);

-- Volunteer gamification
CREATE TABLE IF NOT EXISTS volunteer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  points INT NOT NULL DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS volunteer_point_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT,
  awarded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Matang Gaurav (monthly highlights / patrika)
CREATE TABLE IF NOT EXISTS gaurav_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  month_label TEXT, -- e.g. Aug 2026
  created_by UUID REFERENCES users(id),
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Youth e-portfolio items under Arthik
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  city_id UUID REFERENCES cities(id),
  title TEXT NOT NULL,
  description TEXT,
  skills TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stage rollout flags (for members; super_admin always unlocked in app logic)
INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('stage_1_enabled', 'true'),
  ('stage_2_enabled', 'true'),
  ('stage_3_enabled', 'false'),
  ('rides_enabled', 'true'),
  ('gaurav_enabled', 'true'),
  ('gamification_enabled', 'true'),
  ('ai_member_enabled', 'true'),
  ('ai_god_mode_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;
