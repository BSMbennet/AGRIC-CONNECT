alter table public.buyer_requests
  add column if not exists request_type text not null default 'standard'
    check (request_type in ('standard','preorder')),
  add column if not exists requested_harvest_date date;

alter table public.buyer_requests
  add constraint buyer_requests_preorder_date_check
  check (
    (request_type = 'standard' and requested_harvest_date is null)
    or (request_type = 'preorder' and requested_harvest_date is not null)
  );

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid not null references public.produce_listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 5 and 1000),
  created_at timestamptz not null default now(),
  unique (order_id)
);

alter table public.product_reviews enable row level security;
grant select on public.product_reviews to anon, authenticated;
grant insert on public.product_reviews to authenticated;

create policy "Reviews are publicly readable"
  on public.product_reviews for select to anon, authenticated using (true);

create policy "Buyer reviews only fulfilled matching orders"
  on public.product_reviews for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = product_reviews.order_id
        and o.buyer_id = (select auth.uid())
        and o.listing_id = product_reviews.listing_id
        and o.status = 'fulfilled'
    )
  );

create index if not exists product_reviews_listing_created_idx
  on public.product_reviews(listing_id, created_at desc);
