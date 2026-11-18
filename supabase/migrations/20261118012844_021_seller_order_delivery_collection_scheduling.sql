-- AgricNorthX migration 021: seller acceptance with delivery/collection scheduling.
alter table public.orders
 add column if not exists fulfilment_method text not null default 'collection',
 add column if not exists scheduled_start timestamptz,
 add column if not exists scheduled_end timestamptz,
 add column if not exists fulfilment_location text,
 add column if not exists seller_instructions text,
 add column if not exists delivery_fee numeric(12,2) not null default 0,
 add column if not exists delivery_fee_accepted_at timestamptz,
 add column if not exists fulfilment_state text not null default 'awaiting_schedule';
alter table public.orders
 add constraint orders_fulfilment_method_check check(fulfilment_method in ('delivery','collection')),
 add constraint orders_scheduled_window_check check(scheduled_end is null or scheduled_start is null or scheduled_end>scheduled_start),
 add constraint orders_delivery_fee_check check(delivery_fee>=0),
 add constraint orders_fulfilment_state_check check(fulfilment_state in ('awaiting_schedule','scheduled_for_delivery','ready_for_collection','out_for_delivery','fulfilled','cancelled'));
alter table public.buyer_requests add column if not exists rejection_reason text;
alter table public.buyer_requests add constraint buyer_requests_rejection_reason_check check(rejection_reason is null or char_length(trim(rejection_reason)) between 1 and 500);

create or replace function public.is_order_participant(p_order_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.orders o where o.id=p_order_id and
 (o.buyer_id=(select auth.uid()) or exists(select 1 from public.order_allocations a where a.order_id=o.id and a.farmer_id=(select auth.uid()))));
$$;
revoke all on function public.is_order_participant(uuid) from public,anon;
grant execute on function public.is_order_participant(uuid) to authenticated;

create table public.order_schedule_events(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 actor_profile_id uuid references public.profiles(id),
 event_type text not null check(event_type in ('schedule_set','schedule_changed','delivery_fee_confirmed')),
 previous_schedule jsonb, new_schedule jsonb not null default '{}'::jsonb, note text, created_at timestamptz not null default now()
);
create index order_schedule_events_order_created_idx on public.order_schedule_events(order_id,created_at desc);
alter table public.order_schedule_events enable row level security;
create policy "order participants read schedule events" on public.order_schedule_events for select to authenticated using(public.is_order_participant(order_id));
grant select on public.order_schedule_events to authenticated;
revoke insert,update,delete on public.order_schedule_events from anon,authenticated;

create or replace function public.accept_buyer_request_with_schedule(
 p_request_id uuid,p_fulfilment_method text,p_scheduled_start timestamptz,p_scheduled_end timestamptz,
 p_fulfilment_location text,p_seller_instructions text,p_delivery_fee numeric
) returns public.orders language plpgsql security definer set search_path='' as $$
declare v_req public.buyer_requests; v_listing public.produce_listings; v_order public.orders; v_actor_role public.user_role;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select p.role into v_actor_role from public.profiles p where p.id=auth.uid();
 if v_actor_role not in ('farmer','cooperative_manager') then raise exception 'unauthorized'; end if;
 if p_fulfilment_method not in ('delivery','collection') or p_scheduled_start is null or p_scheduled_start<=now()
  or (p_scheduled_end is not null and p_scheduled_end<=p_scheduled_start)
  or char_length(trim(coalesce(p_fulfilment_location,'')))<3 or char_length(p_fulfilment_location)>300
  or char_length(coalesce(p_seller_instructions,''))>1000 or coalesce(p_delivery_fee,0)<0
  or (p_fulfilment_method='collection' and coalesce(p_delivery_fee,0)<>0) then raise exception 'invalid_schedule'; end if;
 select * into v_req from public.buyer_requests where id=p_request_id for update;
 if not found or v_req.status<>'pending' or v_req.request_type='preorder' then raise exception 'request_not_pending'; end if;
 select * into v_listing from public.produce_listings where id=v_req.listing_id for update;
 if not found then raise exception 'listing_not_found'; end if;
 if not (v_listing.farmer_id=auth.uid() or (v_actor_role='cooperative_manager' and exists(
  select 1 from public.profiles p where p.id=v_listing.farmer_id and p.cooperative_id=v_listing.cooperative_id
  and p.cooperative_id=(select manager.cooperative_id from public.profiles manager where manager.id=auth.uid())
 ))) then raise exception 'unauthorized'; end if;
 if v_listing.status<>'active' then raise exception 'listing_not_active'; end if;
 if v_listing.quantity_available-v_listing.reserved_quantity-v_listing.quantity_sold<v_req.quantity_requested then raise exception 'insufficient_stock'; end if;
 update public.produce_listings set reserved_quantity=reserved_quantity+v_req.quantity_requested,updated_at=now() where id=v_listing.id;
 insert into public.orders(buyer_id,listing_id,quantity_agreed,unit,unit_price,status,collection_method,collection_point,
  buyer_name,buyer_contact_number,fulfilment_preference,delivery_location,order_instructions,buyer_request_id,
  fulfilment_method,scheduled_start,scheduled_end,fulfilment_location,seller_instructions,delivery_fee,fulfilment_state)
 values(v_req.buyer_id,v_listing.id,v_req.quantity_requested,v_listing.unit,coalesce(v_req.proposed_price,v_listing.asking_price),'accepted',
  p_fulfilment_method,trim(p_fulfilment_location),v_req.buyer_name,v_req.contact_number,p_fulfilment_method,
  case when p_fulfilment_method='delivery' then trim(p_fulfilment_location) else null end,v_req.order_instructions,v_req.id,
  p_fulfilment_method,p_scheduled_start,p_scheduled_end,trim(p_fulfilment_location),nullif(trim(coalesce(p_seller_instructions,'')),''),
  coalesce(p_delivery_fee,0),case when p_fulfilment_method='delivery' then 'scheduled_for_delivery' else 'ready_for_collection' end)
 returning * into v_order;
 insert into public.order_allocations(order_id,listing_id,farmer_id,quantity_allocated,agreed_unit_price)
 values(v_order.id,v_listing.id,v_listing.farmer_id,v_req.quantity_requested,v_order.unit_price);
 insert into public.order_events(order_id,actor_profile_id,event_type,from_status,to_status,note)
 values(v_order.id,auth.uid(),'request_accepted',null,'accepted','Seller accepted and scheduled fulfilment');
 insert into public.order_schedule_events(order_id,actor_profile_id,event_type,new_schedule,note)
 values(v_order.id,auth.uid(),'schedule_set',jsonb_build_object('method',p_fulfilment_method,'start',p_scheduled_start,
 'end',p_scheduled_end,'location',trim(p_fulfilment_location),'instructions',p_seller_instructions,'delivery_fee',coalesce(p_delivery_fee,0)),'Initial seller schedule');
 update public.buyer_requests set status='accepted' where id=p_request_id;
 insert into public.notifications(recipient_id,order_id,title,body,notification_type)
 values(v_req.buyer_id,v_order.id,'Your order was accepted','The seller accepted your request and scheduled '||
 p_fulfilment_method||' for '||to_char(p_scheduled_start at time zone 'Africa/Johannesburg','DD Mon YYYY HH24:MI')||'.','order_accepted');
 return v_order;
end; $$;
revoke all on function public.accept_buyer_request_with_schedule(uuid,text,timestamptz,timestamptz,text,text,numeric) from public,anon;
grant execute on function public.accept_buyer_request_with_schedule(uuid,text,timestamptz,timestamptz,text,text,numeric) to authenticated;
revoke execute on function public.accept_buyer_request(uuid) from public,anon,authenticated;

create or replace function public.reject_buyer_request_with_reason(p_request_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare v_req public.buyer_requests; v_listing public.produce_listings; v_actor_role public.user_role;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select p.role into v_actor_role from public.profiles p where p.id=auth.uid();
 if v_actor_role not in ('farmer','cooperative_manager') or char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'invalid_rejection'; end if;
 select * into v_req from public.buyer_requests where id=p_request_id for update;
 if not found or v_req.status<>'pending' then raise exception 'request_not_pending'; end if;
 select * into v_listing from public.produce_listings where id=v_req.listing_id;
 if not found or not (v_listing.farmer_id=auth.uid() or (v_actor_role='cooperative_manager' and exists(
  select 1 from public.profiles p where p.id=v_listing.farmer_id and p.cooperative_id=v_listing.cooperative_id
  and p.cooperative_id=(select manager.cooperative_id from public.profiles manager where manager.id=auth.uid())
 ))) then raise exception 'unauthorized'; end if;
 update public.buyer_requests set status='rejected',rejection_reason=trim(p_reason) where id=p_request_id;
 insert into public.notifications(recipient_id,title,body,notification_type)
 values(v_req.buyer_id,'Your order request was declined','The seller declined your request. Reason: '||trim(p_reason),'order_rejected');
end; $$;
revoke all on function public.reject_buyer_request_with_reason(uuid,text) from public,anon;
grant execute on function public.reject_buyer_request_with_reason(uuid,text) to authenticated;
revoke execute on function public.reject_buyer_request(uuid) from public,anon,authenticated;

create or replace function public.update_order_fulfilment_schedule(
 p_order_id uuid,p_fulfilment_method text,p_scheduled_start timestamptz,p_scheduled_end timestamptz,
 p_fulfilment_location text,p_seller_instructions text,p_delivery_fee numeric
) returns public.orders language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_listing public.produce_listings; v_actor_role public.user_role; v_old jsonb; v_new public.orders;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select p.role into v_actor_role from public.profiles p where p.id=auth.uid();
 if v_actor_role not in ('farmer','cooperative_manager') then raise exception 'unauthorized'; end if;
 if p_fulfilment_method not in ('delivery','collection') or p_scheduled_start is null or p_scheduled_start<=now()
  or (p_scheduled_end is not null and p_scheduled_end<=p_scheduled_start)
  or char_length(trim(coalesce(p_fulfilment_location,'')))<3 or char_length(p_fulfilment_location)>300
  or char_length(coalesce(p_seller_instructions,''))>1000 or coalesce(p_delivery_fee,0)<0
  or (p_fulfilment_method='collection' and coalesce(p_delivery_fee,0)<>0) then raise exception 'invalid_schedule'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status not in ('accepted','pending') then raise exception 'order_not_schedulable'; end if;
 select * into v_listing from public.produce_listings where id=v_order.listing_id;
 if not found or not (v_listing.farmer_id=auth.uid() or (v_actor_role='cooperative_manager' and exists(
  select 1 from public.profiles p where p.id=v_listing.farmer_id and p.cooperative_id=v_listing.cooperative_id
  and p.cooperative_id=(select manager.cooperative_id from public.profiles manager where manager.id=auth.uid())
 ))) then raise exception 'unauthorized'; end if;
 v_old:=jsonb_build_object('method',v_order.fulfilment_method,'start',v_order.scheduled_start,'end',v_order.scheduled_end,
 'location',v_order.fulfilment_location,'instructions',v_order.seller_instructions,'delivery_fee',v_order.delivery_fee);
 update public.orders set fulfilment_method=p_fulfilment_method,fulfilment_preference=p_fulfilment_method,
 scheduled_start=p_scheduled_start,scheduled_end=p_scheduled_end,fulfilment_location=trim(p_fulfilment_location),
 seller_instructions=nullif(trim(coalesce(p_seller_instructions,'')),''),
 delivery_fee=coalesce(p_delivery_fee,0),delivery_fee_accepted_at=null,
 fulfilment_state=case when p_fulfilment_method='delivery' then 'scheduled_for_delivery' else 'ready_for_collection' end,
 delivery_location=case when p_fulfilment_method='delivery' then trim(p_fulfilment_location) else null end,
 collection_method=p_fulfilment_method,collection_point=trim(p_fulfilment_location),updated_at=now()
 where id=p_order_id returning * into v_new;
 insert into public.order_schedule_events(order_id,actor_profile_id,event_type,previous_schedule,new_schedule,note)
 values(v_new.id,auth.uid(),'schedule_changed',v_old,jsonb_build_object('method',p_fulfilment_method,'start',p_scheduled_start,
 'end',p_scheduled_end,'location',trim(p_fulfilment_location),'instructions',p_seller_instructions,'delivery_fee',coalesce(p_delivery_fee,0)),'Seller updated schedule');
 insert into public.notifications(recipient_id,order_id,title,body,notification_type)
 values(v_new.buyer_id,v_new.id,'Your order schedule changed','The seller updated the '||p_fulfilment_method||
 ' schedule. New time: '||to_char(p_scheduled_start at time zone 'Africa/Johannesburg','DD Mon YYYY HH24:MI')||'.','order_schedule_changed');
 return v_new;
end; $$;
revoke all on function public.update_order_fulfilment_schedule(uuid,text,timestamptz,timestamptz,text,text,numeric) from public,anon;
grant execute on function public.update_order_fulfilment_schedule(uuid,text,timestamptz,timestamptz,text,text,numeric) to authenticated;

create or replace function public.confirm_order_delivery_fee(p_order_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_order public.orders;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.buyer_id<>auth.uid() then raise exception 'unauthorized'; end if;
 if v_order.delivery_fee<=0 then raise exception 'no_delivery_fee'; end if;
 if v_order.delivery_fee_accepted_at is null then
  update public.orders set delivery_fee_accepted_at=now(),updated_at=now() where id=p_order_id;
  insert into public.order_schedule_events(order_id,actor_profile_id,event_type,new_schedule,note)
  values(p_order_id,auth.uid(),'delivery_fee_confirmed',jsonb_build_object('delivery_fee',v_order.delivery_fee),'Buyer accepted delivery fee');
  insert into public.notifications(recipient_id,order_id,title,body,notification_type)
  select distinct a.farmer_id,p_order_id,'Buyer accepted delivery fee','Buyer accepted the delivery fee for order '||left(p_order_id::text,8)||'.','order_update'
  from public.order_allocations a where a.order_id=p_order_id;
 end if;
end; $$;
revoke all on function public.confirm_order_delivery_fee(uuid) from public,anon;
grant execute on function public.confirm_order_delivery_fee(uuid) to authenticated;
