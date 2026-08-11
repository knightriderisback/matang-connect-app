-- Chhattisgarh cities seed + expandable profile fields on users

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- Major / district cities of Chhattisgarh (+ a few neighbouring for diaspora)
INSERT INTO cities (name, state, is_active)
SELECT v.name, v.state, true
FROM (VALUES
  ('Raipur', 'Chhattisgarh'),
  ('Bilaspur', 'Chhattisgarh'),
  ('Durg', 'Chhattisgarh'),
  ('Bhilai', 'Chhattisgarh'),
  ('Korba', 'Chhattisgarh'),
  ('Rajnandgaon', 'Chhattisgarh'),
  ('Raigarh', 'Chhattisgarh'),
  ('Jagdalpur', 'Chhattisgarh'),
  ('Ambikapur', 'Chhattisgarh'),
  ('Dhamtari', 'Chhattisgarh'),
  ('Mahasamund', 'Chhattisgarh'),
  ('Kanker', 'Chhattisgarh'),
  ('Baikunthpur', 'Chhattisgarh'),
  ('Jashpur', 'Chhattisgarh'),
  ('Balod', 'Chhattisgarh'),
  ('Baloda Bazar', 'Chhattisgarh'),
  ('Bemetara', 'Chhattisgarh'),
  ('Bijapur', 'Chhattisgarh'),
  ('Dantewada', 'Chhattisgarh'),
  ('Gariaband', 'Chhattisgarh'),
  ('Kondagaon', 'Chhattisgarh'),
  ('Mungeli', 'Chhattisgarh'),
  ('Narayanpur', 'Chhattisgarh'),
  ('Sukma', 'Chhattisgarh'),
  ('Surajpur', 'Chhattisgarh'),
  ('Balrampur', 'Chhattisgarh'),
  ('Gaurela-Pendra-Marwahi', 'Chhattisgarh'),
  ('Manendragarh', 'Chhattisgarh'),
  ('Sakti', 'Chhattisgarh'),
  ('Sarangarh', 'Chhattisgarh'),
  ('Nagpur', 'Maharashtra'),
  ('Mumbai', 'Maharashtra'),
  ('Pune', 'Maharashtra'),
  ('Bhopal', 'Madhya Pradesh'),
  ('Indore', 'Madhya Pradesh')
) AS v(name, state)
WHERE NOT EXISTS (
  SELECT 1 FROM cities c WHERE lower(c.name) = lower(v.name) AND lower(c.state) = lower(v.state)
);
