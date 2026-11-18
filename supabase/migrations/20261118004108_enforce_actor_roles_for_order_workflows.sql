create or replace function public.confirm_preorder_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare v_req public.buyer_requests; v_listing public.produce_listings; v_actor_role public.user_role;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select p.role into v_actor_role from public.profiles p where p.id=auth.uid();
 if v_actor_role not in ('farmer','cooperative_manager') then raise exception 'unauthorized'; end if;
 select * into v_req from public.buyer_requests where id=p_request_id for update;
 if not found then raise exception 'request_not_found'; end if;
 if v_req.status<>'pending' or v_req.request_type<>'preorder' then raise exception 'preorder_not_pending'; end if;
 select * into v_listing from public.produce_listings where id=v_req.listing_id for update;
 if not found then raise exception 'listing_not_found'; end if;
 if v_listing.status<>'active' then raise exception 'listing_not_active'; end if;
 if not (v_listing.farmer_id=auth.uid() or (v_actor_role='cooperative_manager' and exists(
  select 1 from public.profiles p where p.id=v_listing.farmer_id and p.cooperative_id=v_listing.cooperative_id
   and p.cooperative_id=(select manager.cooperative_id from public.profiles manager where manager.id=auth.uid())
 ))) then raise exception 'unauthorized'; end if;
 update public.buyer_requests set status='accepted' where id=p_request_id;
 return p_request_id;
end;
$function$;

create or replace function public.update_buyer_order_details(
 p_order_id uuid,p_buyer_name text,p_contact_number text,p_fulfilment_preference text,p_delivery_location text,p_order_instructions text
)
returns void language plpgsql security definer set search_path = '' as $function$
declare v_order public.orders; v_actor_role public.user_role;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select p.role into v_actor_role from public.profiles p where p.id=auth.uid();
 if v_actor_role<>'buyer' then raise exception 'unauthorized'; end if;
 if char_length(trim(coalesce(p_buyer_name,'')))<2 or char_length(trim(coalesce(p_buyer_name,'')))>120 then raise exception 'invalid_buyer_name'; end if;
 if char_length(trim(coalesce(p_contact_number,'')))<7 or char_length(trim(coalesce(p_contact_number,'')))>30 then raise exception 'invalid_contact_number'; end if;
 if p_fulfilment_preference not in ('delivery','collection') then raise exception 'invalid_fulfilment_preference'; end if;
 if p_fulfilment_preference='delivery' and char_length(trim(coalesce(p_delivery_location,'')))<5 then raise exception 'delivery_location_required'; end if;
 if char_length(coalesce(p_order_instructions,''))>1000 then raise exception 'instructions_too_long'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.buyer_id<>auth.uid() then raise exception 'unauthorized'; end if;
 if v_order.status not in ('pending','accepted') then raise exception 'order_not_editable'; end if;
 update public.orders set buyer_name=trim(p_buyer_name),buyer_contact_number=trim(p_contact_number),fulfilment_preference=p_fulfilment_preference,
  delivery_location=case when p_fulfilment_preference='delivery' then trim(p_delivery_location) else null end,
  order_instructions=nullif(trim(coalesce(p_order_instructions,'')),''),updated_at=now() where id=p_order_id;
end;
$function$;
revoke all on function public.confirm_preorder_request(uuid) from anon, public;
grant execute on function public.confirm_preorder_request(uuid) to authenticated;
revoke all on function public.update_buyer_order_details(uuid,text,text,text,text,text) from anon, public;
grant execute on function public.update_buyer_order_details(uuid,text,text,text,text,text) to authenticated;
