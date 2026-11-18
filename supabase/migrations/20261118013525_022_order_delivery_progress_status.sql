create or replace function public.mark_order_out_for_delivery(p_order_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_listing public.produce_listings; v_actor_role public.user_role;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select role into v_actor_role from public.profiles where id=auth.uid();
 if v_actor_role not in ('farmer','cooperative_manager') then raise exception 'unauthorized'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'accepted' or v_order.fulfilment_method<>'delivery' or v_order.fulfilment_state<>'scheduled_for_delivery' then raise exception 'order_not_ready_for_delivery'; end if;
 select * into v_listing from public.produce_listings where id=v_order.listing_id;
 if not found or not (v_listing.farmer_id=auth.uid() or (v_actor_role='cooperative_manager' and exists(
  select 1 from public.profiles p where p.id=v_listing.farmer_id and p.cooperative_id=v_listing.cooperative_id
  and p.cooperative_id=(select manager.cooperative_id from public.profiles manager where manager.id=auth.uid())
 ))) then raise exception 'unauthorized'; end if;
 update public.orders set fulfilment_state='out_for_delivery',updated_at=now() where id=p_order_id;
 insert into public.order_events(order_id,actor_profile_id,event_type,from_status,to_status,note)
 values(p_order_id,auth.uid(),'delivery_started','accepted','accepted','Seller marked the order as out for delivery');
 insert into public.notifications(recipient_id,order_id,title,body,notification_type)
 values(v_order.buyer_id,p_order_id,'Your produce is on its way','The seller marked order '||left(p_order_id::text,8)||' as out for delivery.','order_update');
end; $$;
revoke all on function public.mark_order_out_for_delivery(uuid) from public,anon;
grant execute on function public.mark_order_out_for_delivery(uuid) to authenticated;

create or replace function public.sync_order_fulfilment_state()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='fulfilled' then new.fulfilment_state:='fulfilled';
 elsif new.status='cancelled' then new.fulfilment_state:='cancelled'; end if;
 return new;
end; $$;
drop trigger if exists sync_order_fulfilment_state_before_update on public.orders;
create trigger sync_order_fulfilment_state_before_update before update of status on public.orders
for each row execute function public.sync_order_fulfilment_state();
