insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', false)
on conflict (id) do nothing;

create policy "farmer uploads own listing images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "farmer reads own listing images"
on storage.objects for select to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "buyers read images for active listings"
on storage.objects for select to authenticated
using (
  bucket_id = 'listing-images'
  and exists (
    select 1 from public.produce_listings l
    where l.image_path = name and l.status = 'active'
  )
);

create policy "farmer updates own listing images"
on storage.objects for update to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "farmer deletes own listing images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
