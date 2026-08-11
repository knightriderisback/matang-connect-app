-- Stage 3 complete: Arthik Vikas + festival seeds + inter-family link foundation

-- Arthik Vikas (economic development schemes)
CREATE TABLE IF NOT EXISTS arthik_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'scheme', -- skill, loan, scheme, self_help, other
  contact_phone TEXT,
  link_url TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arthik_city ON arthik_schemes(city_id, created_at DESC);

-- Inter-family linking (optional: link a family_member to a registered user)
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Seed common festivals (global, year-agnostic dates use current year for demo)
INSERT INTO festivals (title, description, festival_date, is_recurring, city_id)
SELECT * FROM (VALUES
  ('Makar Sankranti', 'Harvest festival — kite flying, til-gud', DATE_TRUNC('year', CURRENT_DATE)::date + 13, true, NULL::uuid),
  ('Holi', 'Festival of colours', DATE_TRUNC('year', CURRENT_DATE)::date + 70, true, NULL),
  ('Gudi Padwa / Ugadi', 'New year in many regions', DATE_TRUNC('year', CURRENT_DATE)::date + 85, true, NULL),
  ('Ram Navami', 'Birth of Lord Rama', DATE_TRUNC('year', CURRENT_DATE)::date + 95, true, NULL),
  ('Hanuman Jayanti', 'Birth of Hanuman', DATE_TRUNC('year', CURRENT_DATE)::date + 110, true, NULL),
  ('Raksha Bandhan', 'Bond of protection', DATE_TRUNC('year', CURRENT_DATE)::date + 220, true, NULL),
  ('Janmashtami', 'Birth of Lord Krishna', DATE_TRUNC('year', CURRENT_DATE)::date + 230, true, NULL),
  ('Ganesh Chaturthi', 'Lord Ganesha festival', DATE_TRUNC('year', CURRENT_DATE)::date + 240, true, NULL),
  ('Navratri / Durga Puja', 'Nine nights of Goddess', DATE_TRUNC('year', CURRENT_DATE)::date + 265, true, NULL),
  ('Dussehra', 'Victory of good over evil', DATE_TRUNC('year', CURRENT_DATE)::date + 275, true, NULL),
  ('Diwali', 'Festival of lights', DATE_TRUNC('year', CURRENT_DATE)::date + 290, true, NULL),
  ('Chhath Puja', 'Sun worship — important in Chhattisgarh/Bihar region', DATE_TRUNC('year', CURRENT_DATE)::date + 295, true, NULL)
) AS v(title, description, festival_date, is_recurring, city_id)
WHERE NOT EXISTS (SELECT 1 FROM festivals LIMIT 1);

-- Feature flags
INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('arthik_enabled', 'true'),
  ('scan_enabled', 'true')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
