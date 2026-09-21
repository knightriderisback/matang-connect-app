-- ARCHIVED 2026-09-20 — already applied to production, kept here for history only.

-- Optional: run in Supabase SQL if createBucket from API is blocked
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-images',
  'feed-images',
  true,
  3000000,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set public = true;

create policy "Public read feed-images"
on storage.objects for select
using (bucket_id = 'feed-images');
