-- Public marketplace browsing is read-only and exposes only listing-safe columns.
revoke all privileges on table public.produce_listings from anon;
grant select (
  id, category, produce_name, quantity_available, reserved_quantity, quantity_sold,
  unit, asking_price, currency, price_unit, harvest_date, available_from,
  expires_at, quality_notes, locality, municipality, district, status,
  created_at, updated_at
) on table public.produce_listings to anon;

drop policy if exists "public reads active marketplace listings" on public.produce_listings;
create policy "public reads active marketplace listings"
  on public.produce_listings
  for select
  to anon
  using (
    status = 'active'
    and (expires_at is null or expires_at > now())
    and quantity_available > reserved_quantity + quantity_sold
  );

-- Track fulfilment per farmer allocation so multi-farmer orders cannot be
-- completed by one farmer on behalf of the others.
alter table public.order_allocations
  add column if not exists status text not null default 'reserved'
  check (status in ('reserved', 'fulfilled'));

create or replace function public.fulfill_order_allocation(p_allocation_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allocation public.order_allocations;
  v_listing public.produce_listings;
  v_order public.orders;
  v_actor public.profiles;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  select * into v_actor
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'profile_not_found';
  end if;

  select * into v_allocation
  from public.order_allocations
  where id = p_allocation_id
  for update;

  if not found then
    raise exception 'allocation_not_found';
  end if;

  select * into v_listing
  from public.produce_listings
  where id = v_allocation.listing_id
  for update;

  if not found then
    raise exception 'listing_not_found';
  end if;

  if not (
    v_allocation.farmer_id = auth.uid()
    or (
      v_actor.role = 'cooperative_manager'
      and v_actor.cooperative_id is not null
      and v_listing.cooperative_id = v_actor.cooperative_id
    )
  ) then
    raise exception 'unauthorized';
  end if;

  if v_allocation.status = 'fulfilled' then
    raise exception 'allocation_already_fulfilled';
  end if;

  select * into v_order
  from public.orders
  where id = v_allocation.order_id
  for update;

  if not found or v_order.status <> 'accepted' then
    raise exception 'order_not_ready_for_fulfilment';
  end if;

  if v_listing.reserved_quantity < v_allocation.quantity_allocated then
    raise exception 'reserved_stock_inconsistent';
  end if;

  update public.produce_listings
  set reserved_quantity = reserved_quantity - v_allocation.quantity_allocated,
      quantity_sold = quantity_sold + v_allocation.quantity_allocated,
      status = case
        when quantity_sold + v_allocation.quantity_allocated >= quantity_available then 'sold'::public.listing_status
        else status
      end,
      updated_at = now()
  where id = v_listing.id;

  update public.order_allocations
  set status = 'fulfilled'
  where id = v_allocation.id;

  insert into public.order_events (
    order_id, actor_profile_id, event_type, from_status, to_status, note
  )
  values (
    v_order.id, auth.uid(), 'allocation_fulfilled',
    v_order.status, v_order.status,
    'A farmer confirmed fulfilment of their supply allocation.'
  );

  if not exists (
    select 1
    from public.order_allocations
    where order_id = v_order.id and status <> 'fulfilled'
  ) then
    update public.orders
    set status = 'fulfilled', updated_at = now()
    where id = v_order.id
    returning * into v_order;

    insert into public.order_events (
      order_id, actor_profile_id, event_type, from_status, to_status, note
    )
    values (
      v_order.id, auth.uid(), 'order_fulfilled',
      'accepted', 'fulfilled',
      'All supply allocations have been fulfilled.'
    );
  end if;

  return v_order;
end;
$$;

revoke all on function public.fulfill_order_allocation(uuid) from public, anon;
grant execute on function public.fulfill_order_allocation(uuid) to authenticated;
