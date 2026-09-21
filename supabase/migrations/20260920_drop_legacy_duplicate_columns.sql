-- Drop legacy/duplicate columns confirmed unused by live app code
-- (verified against app/api/*/route.ts and app/(main)/*/page.tsx on 2026-09-20).
-- All affected tables had 0 rows at time of this migration, so no data loss.
-- Run AFTER 20260920_repoint_legacy_rls_policies.sql.

-- rides: pre-rename columns, superseded by from_place/to_place/ride_date/ride_time/seats/contact_phone/poster_id/is_active
ALTER TABLE public.rides
  DROP COLUMN IF EXISTS from_location,
  DROP COLUMN IF EXISTS to_location,
  DROP COLUMN IF EXISTS travel_date,
  DROP COLUMN IF EXISTS seats_available,
  DROP COLUMN IF EXISTS contact_number,
  DROP COLUMN IF EXISTS posted_by,
  DROP COLUMN IF EXISTS status;

-- businesses: legacy phone column, superseded by contact_phone
ALTER TABLE public.businesses
  DROP COLUMN IF EXISTS phone;

-- dharohar_posts / mahila_posts / gaurav_posts: legacy posted_by, superseded by created_by
ALTER TABLE public.dharohar_posts DROP COLUMN IF EXISTS posted_by;
ALTER TABLE public.mahila_posts DROP COLUMN IF EXISTS posted_by;
ALTER TABLE public.gaurav_posts DROP COLUMN IF EXISTS posted_by;

-- polls: drop legacy pre-rename columns (old multilingual/survey schema, unused by current code)
ALTER TABLE public.polls
  DROP COLUMN IF EXISTS title_en,
  DROP COLUMN IF EXISTS title_hi,
  DROP COLUMN IF EXISTS title_mr,
  DROP COLUMN IF EXISTS poll_type,
  DROP COLUMN IF EXISTS allow_multiple,
  DROP COLUMN IF EXISTS is_anonymous,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date;

-- polls: add columns the live route/frontend code already expects but which never existed
-- (this is why app/api/polls/route.ts always fell through to its 3rd fallback query/insert)
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;
