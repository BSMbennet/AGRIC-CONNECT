create or replace function public.confirm_preorder_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare v_req public.buyer_requests; v_listing public.produce_listings; v_actor_role public.user_role;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select p.role into v_actor_role from public.profiles p where p.id = auth.uid();
  select * into v_req from public.buyer_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' or v_req.request_type <> 'preorder' then raise exception 'preorder_not_pending'; end if;
  select * into v_listing from public.produce_listings where id = v_req.listing_id for update;
  if not found then raise exception 'listing_not_found'; end if;
  if not (v_listing.farmer_id = auth.uid() or (v_actor_role = 'cooperative_manager' and exists (
    select 1 from public.profiles p where p.id = v_listing.farmer_id and p.cooperative_id = v_listing.cooperative_id
      and p.cooperative_id = (select manager.cooperative_id from public.profiles manager where manager.id = auth.uid())
  ))) then raise exception 'unauthorized'; end if;
  update public.buyer_requests set status = 'accepted' where id = p_request_id;
  return p_request_id;
end;
$function$;
revoke all on function public.confirm_preorder_request(uuid) from public;
grant execute on function public.confirm_preorder_request(uuid) to authenticated;
