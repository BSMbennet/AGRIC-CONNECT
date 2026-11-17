create or replace function public.accept_buyer_request(p_request_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.buyer_requests;
  v_listing public.produce_listings;
  v_order public.orders;
  v_actor_role public.user_role;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select p.role into v_actor_role from public.profiles p where p.id = auth.uid();
  select * into v_req from public.buyer_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'request_not_pending'; end if;

  select * into v_listing from public.produce_listings where id = v_req.listing_id for update;
  if not found then raise exception 'listing_not_found'; end if;
  if not (
    v_listing.farmer_id = auth.uid()
    or (v_actor_role = 'cooperative_manager' and exists (
      select 1 from public.profiles p
      where p.id = v_listing.farmer_id and p.cooperative_id = v_listing.cooperative_id
        and p.cooperative_id = (select manager.cooperative_id from public.profiles manager where manager.id = auth.uid())
    ))
  ) then raise exception 'unauthorized'; end if;

  if v_listing.status <> 'active' then raise exception 'listing_not_active'; end if;
  if (v_listing.quantity_available - v_listing.reserved_quantity - v_listing.quantity_sold) < v_req.quantity_requested then
    raise exception 'insufficient_stock';
  end if;

  update public.produce_listings
    set reserved_quantity = reserved_quantity + v_req.quantity_requested, updated_at = now()
    where id = v_listing.id;

  insert into public.orders (buyer_id, listing_id, quantity_agreed, unit, unit_price, status)
    values (v_req.buyer_id, v_listing.id, v_req.quantity_requested, v_listing.unit,
      coalesce(v_req.proposed_price, v_listing.asking_price), 'accepted')
    returning * into v_order;

  insert into public.order_allocations (order_id, listing_id, farmer_id, quantity_allocated, agreed_unit_price)
    values (v_order.id, v_listing.id, v_listing.farmer_id, v_req.quantity_requested, v_order.unit_price);

  insert into public.order_events (order_id, actor_profile_id, event_type, from_status, to_status)
    values (v_order.id, auth.uid(), 'request_accepted', null, 'accepted');

  update public.buyer_requests set status = 'accepted' where id = p_request_id;
  return v_order;
end;
$$;
revoke all on function public.accept_buyer_request(uuid) from public, anon;
grant execute on function public.accept_buyer_request(uuid) to authenticated;

create or replace function public.reject_buyer_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.buyer_requests;
  v_listing public.produce_listings;
  v_actor_role public.user_role;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select p.role into v_actor_role from public.profiles p where p.id = auth.uid();
  select * into v_req from public.buyer_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'request_not_pending'; end if;
  select * into v_listing from public.produce_listings where id = v_req.listing_id;
  if not (
    v_listing.farmer_id = auth.uid()
    or (v_actor_role = 'cooperative_manager' and exists (
      select 1 from public.profiles p where p.id = v_listing.farmer_id
        and p.cooperative_id = v_listing.cooperative_id
        and p.cooperative_id = (select manager.cooperative_id from public.profiles manager where manager.id = auth.uid())
    ))
  ) then raise exception 'unauthorized'; end if;
  update public.buyer_requests set status = 'rejected' where id = p_request_id;
end;
$$;
revoke all on function public.reject_buyer_request(uuid) from public, anon;
grant execute on function public.reject_buyer_request(uuid) to authenticated;

create or replace function public.create_aggregate_order(p_buyer_id uuid, p_allocations jsonb)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_item record;
  v_listing public.produce_listings;
  v_actor public.profiles;
  v_total numeric := 0;
  v_unit text;
  v_weighted_total numeric := 0;
  v_farmer_count integer := 0;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if p_buyer_id is distinct from auth.uid() then raise exception 'buyer_id_mismatch'; end if;
  select * into v_actor from public.profiles where id = auth.uid();
  if v_actor.role not in ('buyer','cooperative_manager') then raise exception 'unauthorized'; end if;
  if jsonb_typeof(p_allocations) <> 'array' or jsonb_array_length(p_allocations) < 2 then
    raise exception 'at_least_two_allocations_required';
  end if;

  select count(distinct l.farmer_id) into v_farmer_count
  from public.produce_listings l
  where l.id in (select distinct (item->>'listing_id')::uuid from jsonb_array_elements(p_allocations) item);
  if v_farmer_count < 2 then raise exception 'at_least_two_farmers_required'; end if;

  -- Aggregate duplicate listing IDs before checking stock, preventing split-allocation oversell.
  for v_item in
    select (item->>'listing_id')::uuid as listing_id, sum((item->>'quantity')::numeric) as quantity
    from jsonb_array_elements(p_allocations) item
    group by (item->>'listing_id')::uuid
    order by (item->>'listing_id')::uuid
  loop
    if v_item.quantity <= 0 then raise exception 'invalid_quantity'; end if;
    select * into v_listing from public.produce_listings where id = v_item.listing_id for update;
    if not found then raise exception 'listing_not_found'; end if;
    if v_listing.status <> 'active' then raise exception 'listing_not_active'; end if;
    if v_actor.role = 'cooperative_manager' and (
      v_actor.cooperative_id is null or v_listing.cooperative_id is distinct from v_actor.cooperative_id
    ) then raise exception 'listing_not_in_managed_cooperative'; end if;
    if (v_listing.quantity_available - v_listing.reserved_quantity - v_listing.quantity_sold) < v_item.quantity then
      raise exception 'insufficient_stock';
    end if;
    if v_unit is null then v_unit := v_listing.unit;
    elsif v_unit <> v_listing.unit then raise exception 'mixed_units_not_supported'; end if;
    v_total := v_total + v_item.quantity;
    v_weighted_total := v_weighted_total + (v_item.quantity * v_listing.asking_price);
  end loop;

  insert into public.orders (buyer_id, listing_id, quantity_agreed, unit, unit_price, status)
    values (p_buyer_id, null, v_total, v_unit, v_weighted_total / nullif(v_total, 0), 'pending')
    returning * into v_order;

  for v_item in
    select (item->>'listing_id')::uuid as listing_id, sum((item->>'quantity')::numeric) as quantity
    from jsonb_array_elements(p_allocations) item
    group by (item->>'listing_id')::uuid
    order by (item->>'listing_id')::uuid
  loop
    select * into v_listing from public.produce_listings where id = v_item.listing_id;
    update public.produce_listings
      set reserved_quantity = reserved_quantity + v_item.quantity, updated_at = now()
      where id = v_listing.id;
    insert into public.order_allocations (order_id, listing_id, farmer_id, quantity_allocated, agreed_unit_price)
      values (v_order.id, v_listing.id, v_listing.farmer_id, v_item.quantity, v_listing.asking_price);
  end loop;

  insert into public.order_events (order_id, actor_profile_id, event_type, to_status)
    values (v_order.id, auth.uid(), 'aggregate_order_created', 'pending');
  return v_order;
end;
$$;
revoke all on function public.create_aggregate_order(uuid, jsonb) from public, anon;
grant execute on function public.create_aggregate_order(uuid, jsonb) to authenticated;
