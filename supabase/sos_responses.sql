-- Run in Supabase SQL Editor if sos_responses / notifications missing

CREATE TABLE IF NOT EXISTS sos_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id uuid REFERENCES sos_alerts(id) ON DELETE CASCADE,
  responder_id uuid REFERENCES users(id),
  status text DEFAULT 'interested',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  title text,
  body text,
  type text,
  ref_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sos_responses_alert ON sos_responses(alert_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
