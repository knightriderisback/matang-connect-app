-- Re-point legacy RLS policies that referenced pre-rename columns
-- (posted_by -> poster_id on rides, posted_by -> created_by on mahila_posts)
-- so the old dead columns can be dropped without losing the security intent.
-- Also removes duplicate USING(true) read policies left over from migration history.

DROP POLICY IF EXISTS "Owner updates own ride" ON public.rides;
CREATE POLICY "Owner updates own ride" ON public.rides
  FOR UPDATE USING (poster_id = auth.uid());

DROP POLICY IF EXISTS "Verified users post rides" ON public.rides;
CREATE POLICY "Verified users post rides" ON public.rides
  FOR INSERT WITH CHECK (
    poster_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.verification_status = 'verified')
  );

DROP POLICY IF EXISTS "Everyone can read rides" ON public.rides;

DROP POLICY IF EXISTS "Verified users post mahila content" ON public.mahila_posts;
CREATE POLICY "Verified users post mahila content" ON public.mahila_posts
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.verification_status = 'verified')
  );

DROP POLICY IF EXISTS "Everyone can read mahila posts" ON public.mahila_posts;
DROP POLICY IF EXISTS "Everyone can read dharohar posts" ON public.dharohar_posts;
DROP POLICY IF EXISTS "Everyone can read gaurav posts" ON public.gaurav_posts;
