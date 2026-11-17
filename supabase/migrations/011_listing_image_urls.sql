alter table public.produce_listings
  add column if not exists image_urls text[] not null default '{}';

grant select (image_urls) on public.produce_listings to anon, authenticated;
