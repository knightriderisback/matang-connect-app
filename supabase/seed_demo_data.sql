-- ============================================================
-- Matang Connect — DEMO / TEST DATA
-- Run in Supabase SQL Editor (as postgres / service role)
-- Safe to re-run: uses fixed phone prefix 90000xxxxx
-- Default M-PIN for all demo users: 1234
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cities
INSERT INTO cities (id, name, state, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Bilaspur', 'Chhattisgarh', true),
  ('11111111-1111-1111-1111-111111111102', 'Raipur', 'Chhattisgarh', true),
  ('11111111-1111-1111-1111-111111111103', 'Durg', 'Chhattisgarh', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure Bilaspur exists by name if id conflict
INSERT INTO cities (name, state, is_active)
SELECT 'Bilaspur', 'Chhattisgarh', true
WHERE NOT EXISTS (SELECT 1 FROM cities WHERE name = 'Bilaspur');

DO $$
DECLARE
  v_city uuid;
  v_hash text := crypt('1234', gen_salt('bf', 8));
  i int;
  v_id uuid;
  v_names text[] := ARRAY[
    'Ramesh Matang','Suresh Kumar','Anita Devi','Priya Sharma','Vikram Singh',
    'Sunita Bai','Rajesh Verma','Kavita Patel','Amit Yadav','Neha Gupta',
    'Deepak Sahu','Pooja Thakur','Manoj Das','Rekha Singh','Sanjay Tiwari',
    'Meena Kumari','Anil Chandrakar','Shweta Rao','Gopal Prasad','Lata Devi',
    'Harish Baghel','Kiran Netam','Ravi Kshatriya','Savita Markam','Naveen Sori',
    'Geeta Sidar','Prakash Dhruv','Usha Yadav','Mahesh Sahu','Anita Netam',
    'Sandeep Patel','Jyoti Verma','Bharat Kumar','Seema Bai','Dinesh Rao',
    'Pushpa Devi','Yogesh Tiwari','Manisha Sahu','Rohit Kumar','Asha Markam',
    'Kamlesh Yadav','Nirmala Devi','Ajay Baghel','Sunita Chandrakar','Vivek Das',
    'Radha Bai','Santosh Kumar','Preeti Sharma','Ganesh Prasad','Hemant Engole'
  ];
  v_villages text[] := ARRAY[
    'Pendri','Takhatpur','Kota','Masturi','Bilha','Sipat','Ratanpur','Koni',
    'Belgahna','Lormi','Mungeli','Patharia','Gaurela','Pendra','Marwahi'
  ];
  v_roles text[] := ARRAY['normal','normal','normal','normal','volunteer','normal','normal','core_committee','normal','volunteer'];
BEGIN
  SELECT id INTO v_city FROM cities WHERE name = 'Bilaspur' LIMIT 1;

  FOR i IN 1..50 LOOP
    v_id := (format('22222222-2222-2222-2222-%012s', lpad(i::text, 12, '0')))::uuid;
    INSERT INTO users (
      id, full_name, phone, m_pin_hash, role, city_id, native_village,
      verification_status, qr_code_id, created_at
    ) VALUES (
      v_id,
      v_names[((i - 1) % array_length(v_names, 1)) + 1],
      '90000' || lpad(i::text, 5, '0'),
      v_hash,
      v_roles[((i - 1) % array_length(v_roles, 1)) + 1],
      v_city,
      v_villages[((i - 1) % array_length(v_villages, 1)) + 1],
      CASE WHEN i % 5 = 0 THEN 'pending' ELSE 'verified' END,
      'MC-DEMO-' || lpad(i::text, 4, '0'),
      now() - ((50 - i) || ' days')::interval
    )
    ON CONFLICT (phone) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      native_village = EXCLUDED.native_village,
      verification_status = EXCLUDED.verification_status;
  END LOOP;
END $$;

-- Notices / posts (all types)
DO $$
DECLARE
  v_poster uuid;
  v_city uuid;
BEGIN
  SELECT id INTO v_city FROM cities WHERE name = 'Bilaspur' LIMIT 1;
  SELECT id INTO v_poster FROM users WHERE phone = '9000000050' LIMIT 1;
  IF v_poster IS NULL THEN
    SELECT id INTO v_poster FROM users ORDER BY created_at DESC LIMIT 1;
  END IF;

  INSERT INTO notices (posted_by, title, content, type, city_id, created_at) VALUES
  (v_poster, 'Samaj Meeting — Sunday 10 AM', E'Sabhi sadasya Sunday subah 10 baje Samaj Bhavan, Bilaspur mein upasthit rahein.\nAgenda: Census review, Kosh report, youth plans.', 'meeting', v_city, now() - interval '1 hour'),
  (v_poster, 'Urgent: Blood needed (B+)', E'Bilaspur Apollo hospital mein B+ blood ki turant zarurat.\nContact: 9000000001\nPatient: community member.', 'urgent', v_city, now() - interval '3 hours'),
  (v_poster, 'Shok Sandesh — Shri Ramlal ji', E'Humein dukh ke saath soochna deni hai ki Shri Ramlal Matang ji (Pendri) ka swargwas ho gaya.\nAntim yatra: aaj sham 4 baje.\nOm Shanti.', 'shok_sandesh', v_city, now() - interval '1 day'),
  (v_poster, 'Matang Yuva Rojgar Mela', E'Agle mahine Rojgar Mela Bilaspur mein.\nNaukar / skill registration abhi open.\nJobs module mein apply karein.', 'announcement', v_city, now() - interval '2 days'),
  (v_poster, 'Kosh transparency update', E'Is mahine Kosh mein ₹45,000 aaye, ₹22,000 seva ke liye kharch.\nDetails Sahyog module mein.', 'general', v_city, now() - interval '3 days'),
  (v_poster, 'Mahila Shakti baithak', E'Mahila mandal ki baithak Shaniwar ko 4 baje.\nVishay: skill training + micro finance.', 'meeting', v_city, now() - interval '4 days'),
  (v_poster, 'Happy Diwali — Matang Samaj', E'Sabhi parivaron ko Deepawali ki hardik shubhkamnayein.\nSuraksha ke saath tyohar manayein.', 'announcement', v_city, now() - interval '5 days'),
  (v_poster, 'Census drive — pending families', E'Jo parivar abhi census complete nahi kiye, is hafte volunteer aapke ghar aayenge.\nSahyog dein.', 'general', v_city, now() - interval '6 days'),
  (v_poster, 'Shok Sandesh — Smt. Kamla Bai', E'Smt. Kamla Bai (Kota) ka dehant.\nAntim sanskar kal subah 9 baje.', 'shok_sandesh', v_city, now() - interval '7 days'),
  (v_poster, 'Sports day registration', E'Matang youth sports day — kabaddi + cricket.\nRegistration Gaurav / Credits se linked.', 'announcement', v_city, now() - interval '8 days'),
  (v_poster, 'New Matrimony profiles', E'5 naye biodata Matrimony module mein add hue hain.\nVerified families only.', 'general', v_city, now() - interval '9 days'),
  (v_poster, 'Urgent: School fees support', E'2 students ke fees ke liye sahyog maanga gaya hai.\nCare / Kosh se help karein.', 'urgent', v_city, now() - interval '10 days');
END $$;

-- Jobs
DO $$
DECLARE v_poster uuid; v_city uuid;
BEGIN
  SELECT id INTO v_city FROM cities WHERE name = 'Bilaspur' LIMIT 1;
  SELECT id INTO v_poster FROM users WHERE phone LIKE '90000%' ORDER BY phone LIMIT 1;
  INSERT INTO jobs (posted_by, title, description, city_id, status, created_at) VALUES
  (v_poster, 'Shop helper — Bilaspur market', 'Full time, 10k–12k. Age 18–30. Contact via app.', v_city, 'active', now() - interval '1 day'),
  (v_poster, 'Data entry (work from home)', 'Part time census support. Laptop preferred.', v_city, 'active', now() - interval '2 days'),
  (v_poster, 'Driver (LMV)', 'Local trips, valid license required.', v_city, 'active', now() - interval '3 days'),
  (v_poster, 'Tailoring instructor — Mahila', 'Women preferred. Evening batch.', v_city, 'active', now() - interval '4 days'),
  (v_poster, 'Warehouse packing', 'Day shift, overtime available.', v_city, 'active', now() - interval '5 days'),
  (v_poster, 'Tuition teacher (Maths 9–10)', '2 hours daily near Takhatpur.', v_city, 'active', now() - interval '6 days');
END $$;

-- Care requests (live constraint values)
DO $$
DECLARE v_user uuid;
BEGIN
  SELECT id INTO v_user FROM users WHERE phone = '9000000003' LIMIT 1;
  IF v_user IS NULL THEN SELECT id INTO v_user FROM users LIMIT 1; END IF;
  INSERT INTO care_requests (requester_id, care_type, description, urgency, status, notes, created_at) VALUES
  (v_user, 'medical', 'Elderly member needs help for dialysis transport twice a week.', 'high', 'open', 'Dialysis support', now() - interval '1 day'),
  (v_user, 'elderly', 'Daily medicine reminder and company for grandmother.', 'normal', 'open', 'Elder care', now() - interval '2 days'),
  (v_user, 'disability', 'Wheelchair ramp help at home entrance.', 'normal', 'in_progress', 'Accessibility', now() - interval '3 days'),
  (v_user, 'financial', 'One-time help for school admission fees.', 'emergency', 'open', 'Fees', now() - interval '4 days'),
  (v_user, 'educational', 'Need books for class 12 science.', 'low', 'open', 'Books', now() - interval '5 days'),
  (v_user, 'other', 'Help shifting house within Bilaspur.', 'normal', 'completed', 'Shifting', now() - interval '10 days');
END $$;

-- Kosh transactions + contributions
DO $$
DECLARE v_user uuid;
BEGIN
  SELECT id INTO v_user FROM users WHERE phone LIKE '90000%' ORDER BY phone LIMIT 1;
  INSERT INTO kosh_transactions (amount, category, description, recorded_by, created_at) VALUES
  (15000, 'income', 'Monthly membership collection', v_user, now() - interval '20 days'),
  (5000, 'donation', 'Diwali donation drive', v_user, now() - interval '15 days'),
  (8000, 'expense', 'Medical emergency support', v_user, now() - interval '12 days'),
  (2500, 'expense', 'Meeting hall rent', v_user, now() - interval '8 days'),
  (12000, 'income', 'Fundraising event', v_user, now() - interval '5 days'),
  (3000, 'expense', 'Sports day kit', v_user, now() - interval '2 days');

  INSERT INTO sahyog_kosh_contributions (contributor_id, amount, purpose, created_at)
  SELECT id, (500 + (random()*2000)::int), 'Sahyog contribution', now() - (g || ' days')::interval
  FROM users, generate_series(1, 15) g
  WHERE phone LIKE '90000%'
  LIMIT 15;
END $$;

-- Sample families + members for census testing
DO $$
DECLARE
  v_head uuid;
  v_fid uuid;
  i int;
BEGIN
  FOR i IN 1..15 LOOP
    SELECT id INTO v_head FROM users WHERE phone = '90000' || lpad(i::text, 5, '0') LIMIT 1;
    IF v_head IS NULL THEN CONTINUE; END IF;
    INSERT INTO families (head_of_family, native_village, address, education_summary, employment_status, needs)
    VALUES (
      v_head,
      (SELECT native_village FROM users WHERE id = v_head),
      'Ward ' || i || ', Bilaspur',
      'Mixed',
      CASE WHEN i % 3 = 0 THEN 'unemployed' ELSE 'employed' END,
      CASE WHEN i % 4 = 0 THEN ARRAY['job','education'] ELSE ARRAY[]::text[] END
    )
    RETURNING id INTO v_fid;

    INSERT INTO family_members (family_id, name, relation, age, gender, education_level, occupation) VALUES
    (v_fid, 'Member A', 'spouse', 32 + (i % 10), 'Female', 'High School (9-10)', 'Homemaker'),
    (v_fid, 'Member B', 'son', 8 + (i % 5), 'Male', 'Primary (1-5)', 'Student'),
    (v_fid, 'Member C', 'daughter', 6 + (i % 4), 'Female', 'Primary (1-5)', 'Student');
  END LOOP;
END $$;

-- SOS sample (resolved-ish)
DO $$
DECLARE v_user uuid; v_city uuid;
BEGIN
  SELECT id INTO v_city FROM cities WHERE name = 'Bilaspur' LIMIT 1;
  SELECT id INTO v_user FROM users WHERE phone = '9000000010' LIMIT 1;
  IF v_user IS NOT NULL THEN
    INSERT INTO sos_alerts (raised_by, type, status, city_id, message, created_at) VALUES
    (v_user, 'medical', 'active', v_city, 'Demo SOS — medical help needed near Sipat road', now() - interval '2 hours'),
    (v_user, 'blood', 'resolved', v_city, 'Demo blood request closed', now() - interval '2 days');
  END IF;
END $$;

-- Quick summary
SELECT 'users_demo' AS kind, count(*) FROM users WHERE phone LIKE '90000%'
UNION ALL
SELECT 'notices', count(*) FROM notices
UNION ALL
SELECT 'jobs', count(*) FROM jobs
UNION ALL
SELECT 'care', count(*) FROM care_requests
UNION ALL
SELECT 'kosh_tx', count(*) FROM kosh_transactions
UNION ALL
SELECT 'families', count(*) FROM families;
