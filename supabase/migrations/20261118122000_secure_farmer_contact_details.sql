create table if not exists public.listing_private_details (
  listing_id uuid primary key references public.produce_listings(id) on delete cascade,
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  contact_phone text not null,
  fulfilment_details text not null,
  updated_at timestamptz not null default now()
);
alter table public.listing_private_details enable row level security;
grant select, insert, update on public.listing_private_details to authenticated;
create policy "Farmer and assigned agent manage private listing details"
on public.listing_private_details for all to authenticated
using (
  farmer_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = listing_private_details.farmer_id and p.created_by_agent_id = (select auth.uid()))
)
with check (
  farmer_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = listing_private_details.farmer_id and p.created_by_agent_id = (select auth.uid()))
);
create policy "Buyer reads private details for accepted orders"
on public.listing_private_details for select to authenticated
using (
  exists (
    select 1 from public.orders o
    join public.order_allocations a on a.order_id = o.id
    where o.buyer_id = (select auth.uid())
      and a.listing_id = listing_private_details.listing_id
      and o.status in ('accepted','fulfilled')
  )
);
