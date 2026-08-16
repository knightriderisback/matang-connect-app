-- Optional: run in Supabase SQL if createBucket from API is blocked
-- Storage > New bucket: feed-images (Public)
-- Or:

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-images',
  'feed-images',
  true,
  3000000,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set public = true;

-- Public read
create policy "Public read feed-images"
on storage.objects for select
using (bucket_id = 'feed-images');

-- Service role uploads via API (service key bypasses RLS); optional authenticated insert:
-- create policy "Auth upload feed-images"
-- on storage.objects for insert to authenticated
-- with check (bucket_id = 'feed-images');
