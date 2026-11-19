-- Lets a farmer remove one of their own listings.
-- * A listing with no orders, allocations or buyer requests is deleted outright.
-- * A listing that already has any of those is kept (so order history stays intact) but paused,
--   which hides it from the marketplace.
-- Returns 'deleted', 'paused' or raises 'listing_not_found' / 'not_authenticated'.
create or replace function public.remove_my_listing(p_listing_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_has_history boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select farmer_id into v_owner from public.produce_listings where id = p_listing_id for update;
  if v_owner is null or v_owner <> v_uid then raise exception 'listing_not_found'; end if;

  v_has_history :=
    exists (select 1 from public.order_allocations a where a.listing_id = p_listing_id)
    or exists (select 1 from public.orders o where o.listing_id = p_listing_id)
    or exists (select 1 from public.buyer_requests r where r.listing_id = p_listing_id);

  if v_has_history then
    update public.produce_listings set status = 'paused', updated_at = now() where id = p_listing_id;
    return 'paused';
  end if;

  delete from public.produce_listings where id = p_listing_id and farmer_id = v_uid;
  return 'deleted';
end;
$function$;
revoke all on function public.remove_my_listing(uuid) from public, anon;
grant execute on function public.remove_my_listing(uuid) to authenticated;
