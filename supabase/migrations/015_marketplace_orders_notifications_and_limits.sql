-- Required marketplace details, order conversations, in-app notifications and server-side plan limits.
update public.produce_listings set harvest_date=coalesce(harvest_date,available_from,current_date);
alter table public.produce_listings alter column harvest_date set not null;

-- Keep farmer contact and exact fulfilment instructions private until an order is accepted.
create table if not exists public.listing_private_details(
 listing_id uuid primary key references public.produce_listings(id) on delete cascade,
 farmer_id uuid not null references public.profiles(id) on delete cascade,
 contact_phone text not null check(char_length(trim(contact_phone)) between 7 and 30),
 fulfilment_details text not null check(char_length(trim(fulfilment_details)) between 5 and 500),
 updated_at timestamptz not null default now()
);
insert into public.listing_private_details(listing_id,farmer_id,contact_phone,fulfilment_details)
select l.id,l.farmer_id,coalesce(nullif(p.phone_e164,''),'Contact via AgricNorthX'),'Agree collection or delivery details directly with the farmer.'
from public.produce_listings l join public.profiles p on p.id=l.farmer_id
on conflict(listing_id) do nothing;
alter table public.listing_private_details enable row level security;
create or replace function public.can_view_listing_private_details(p_listing_id uuid) returns boolean language sql stable security definer set search_path = '' as $
 select exists(select 1 from public.produce_listings l where l.id=p_listing_id and (
  l.farmer_id=(select auth.uid())
  or exists(select 1 from public.profiles f where f.id=l.farmer_id and f.created_by_agent_id=(select auth.uid()))
  or exists(select 1 from public.profiles me where me.id=(select auth.uid()) and me.role='admin')
  or exists(select 1 from public.order_allocations a join public.orders o on o.id=a.order_id where a.listing_id=l.id and o.buyer_id=(select auth.uid()) and o.status in ('accepted','fulfilled'))
 ));
$;
revoke all on function public.can_view_listing_private_details(uuid) from public,anon;
grant execute on function public.can_view_listing_private_details(uuid) to authenticated;
create policy "farmers and assigned agents manage listing private details" on public.listing_private_details for all to authenticated
 using(farmer_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=farmer_id and p.created_by_agent_id=(select auth.uid())) or public.current_role_name()='admin')
 with check(farmer_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=farmer_id and p.created_by_agent_id=(select auth.uid())) or public.current_role_name()='admin');
create policy "buyers see seller details on accepted orders" on public.listing_private_details for select to authenticated
 using(public.can_view_listing_private_details(listing_id));
grant select,insert,update,delete on public.listing_private_details to authenticated;
alter table public.produce_listings drop column if exists contact_phone;
alter table public.produce_listings drop column if exists fulfilment_details;

create or replace function public.enforce_listing_private_owner()
returns trigger language plpgsql security definer set search_path = '' as $
begin
 if not exists(select 1 from public.produce_listings l where l.id=new.listing_id and l.farmer_id=new.farmer_id) then
  raise exception 'listing_private_details_owner_mismatch';
 end if;
 return new;
end; $;
create trigger enforce_listing_private_owner_before_write before insert or update on public.listing_private_details for each row execute function public.enforce_listing_private_owner();


alter table public.buyer_requests add column if not exists buyer_name text;
alter table public.buyer_requests add column if not exists contact_number text;
alter table public.buyer_requests add column if not exists fulfilment_preference text;
alter table public.buyer_requests add column if not exists delivery_location text;
alter table public.buyer_requests add column if not exists order_instructions text;
update public.buyer_requests r set buyer_name=coalesce(nullif(r.buyer_name,''),p.display_name,'Buyer'),contact_number=coalesce(nullif(r.contact_number,''),nullif(p.phone_e164,''),'Not provided'),fulfilment_preference=coalesce(r.fulfilment_preference,'collection'),delivery_location=coalesce(r.delivery_location,'') from public.profiles p where p.id=r.buyer_id;
alter table public.buyer_requests alter column buyer_name set not null;
alter table public.buyer_requests alter column contact_number set not null;
alter table public.buyer_requests alter column fulfilment_preference set not null;
alter table public.buyer_requests add constraint buyer_request_fulfilment_check check(fulfilment_preference in ('delivery','collection'));
alter table public.buyer_requests add constraint buyer_request_delivery_location_check check(fulfilment_preference <> 'delivery' or char_length(trim(coalesce(delivery_location,'')))>=5);
alter table public.buyer_requests add constraint buyer_request_buyer_name_check check(char_length(trim(buyer_name)) between 2 and 120);
alter table public.buyer_requests add constraint buyer_request_contact_check check(char_length(trim(contact_number)) between 7 and 30);

alter table public.orders add column if not exists buyer_name text;
alter table public.orders add column if not exists buyer_contact_number text;
alter table public.orders add column if not exists fulfilment_preference text;
alter table public.orders add column if not exists delivery_location text;
alter table public.orders add column if not exists order_instructions text;
alter table public.orders add column if not exists buyer_request_id uuid references public.buyer_requests(id);
create unique index if not exists orders_buyer_request_unique on public.orders(buyer_request_id) where buyer_request_id is not null;
update public.orders o set buyer_name=coalesce(o.buyer_name,p.display_name,'Buyer'),buyer_contact_number=coalesce(o.buyer_contact_number,nullif(p.phone_e164,''),'Not provided'),fulfilment_preference=coalesce(o.fulfilment_preference,case when lower(coalesce(o.collection_method,''))='delivery' then 'delivery' else 'collection' end),delivery_location=coalesce(o.delivery_location,o.collection_point,'') from public.profiles p where p.id=o.buyer_id;
alter table public.orders alter column buyer_name set not null;
alter table public.orders alter column buyer_contact_number set not null;
alter table public.orders alter column fulfilment_preference set not null;
alter table public.orders add constraint orders_fulfilment_check check(fulfilment_preference in ('delivery','collection'));

-- Replace acceptance RPC so the farmer receives the complete buyer order details before acceptance.
create or replace function public.accept_buyer_request(p_request_id uuid)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare v_req public.buyer_requests; v_listing public.produce_listings; v_order public.orders; v_actor_role public.user_role;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 select p.role into v_actor_role from public.profiles p where p.id=auth.uid();
 select * into v_req from public.buyer_requests where id=p_request_id for update;
 if not found then raise exception 'request_not_found'; end if;
 if v_req.status <> 'pending' then raise exception 'request_not_pending'; end if;
 select * into v_listing from public.produce_listings where id=v_req.listing_id for update;
 if not found then raise exception 'listing_not_found'; end if;
 if not (v_listing.farmer_id=auth.uid() or (v_actor_role='cooperative_manager' and exists(select 1 from public.profiles p where p.id=v_listing.farmer_id and p.cooperative_id=v_listing.cooperative_id and p.cooperative_id=(select manager.cooperative_id from public.profiles manager where manager.id=auth.uid())))) then raise exception 'unauthorized'; end if;
 if v_listing.status<>'active' then raise exception 'listing_not_active'; end if;
 if (v_listing.quantity_available-v_listing.reserved_quantity-v_listing.quantity_sold)<v_req.quantity_requested then raise exception 'insufficient_stock'; end if;
 update public.produce_listings set reserved_quantity=reserved_quantity+v_req.quantity_requested,updated_at=now() where id=v_listing.id;
 insert into public.orders(buyer_id,listing_id,quantity_agreed,unit,unit_price,status,collection_method,collection_point,buyer_name,buyer_contact_number,fulfilment_preference,delivery_location,order_instructions,buyer_request_id)
 values(v_req.buyer_id,v_listing.id,v_req.quantity_requested,v_listing.unit,coalesce(v_req.proposed_price,v_listing.asking_price),'accepted',v_req.fulfilment_preference,v_req.delivery_location,v_req.buyer_name,v_req.contact_number,v_req.fulfilment_preference,v_req.delivery_location,v_req.order_instructions,v_req.id)
 returning * into v_order;
 insert into public.order_allocations(order_id,listing_id,farmer_id,quantity_allocated,agreed_unit_price) values(v_order.id,v_listing.id,v_listing.farmer_id,v_req.quantity_requested,v_order.unit_price);
 insert into public.order_events(order_id,actor_profile_id,event_type,from_status,to_status) values(v_order.id,auth.uid(),'request_accepted',null,'accepted');
 update public.buyer_requests set status='accepted' where id=p_request_id;
 return v_order;
end; $$;
revoke all on function public.accept_buyer_request(uuid) from public,anon;
grant execute on function public.accept_buyer_request(uuid) to authenticated;

-- Atomic plan caps: Free=10 active listings, Pro=50, Premium=200.
create or replace function public.enforce_farmer_listing_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_limit integer:=10; v_plan text;
begin
 if new.status <> 'active' then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.farmer_id::text,0));
 select s.plan into v_plan from public.farmer_subscriptions s
 where s.farmer_id=new.farmer_id and s.status in ('active','trialing') and s.current_period_end>now()
 order by case s.plan when 'premium' then 2 else 1 end desc limit 1;
 if v_plan='pro' then v_limit:=50; elsif v_plan='premium' then v_limit:=200; end if;
 if (select count(*) from public.produce_listings l where l.farmer_id=new.farmer_id and l.status='active' and (tg_op='INSERT' or l.id<>new.id)) >= v_limit then
  raise exception using errcode='P0001',message='farmer_listing_limit_reached',detail=format('Your current plan allows %s active listings. Upgrade your plan or pause an existing listing.',v_limit);
 end if;
 return new;
end; $$;
drop trigger if exists farmer_listing_limit_guard on public.produce_listings;
create trigger farmer_listing_limit_guard before insert or update of status,farmer_id on public.produce_listings for each row execute function public.enforce_farmer_listing_limit();

-- Order-scoped discussion. Only the buyer and allocated farmers can read or post.
create table if not exists public.order_comments(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 author_id uuid not null references public.profiles(id),
 body text not null check(char_length(trim(body)) between 1 and 2000),
 author_display_name text not null,
 author_role text not null,
 created_at timestamptz not null default now()
);
create index if not exists order_comments_order_created_idx on public.order_comments(order_id,created_at);
alter table public.order_comments enable row level security;
create or replace function public.is_order_participant(p_order_id uuid) returns boolean language sql stable security definer set search_path = '' as $
 select exists(select 1 from public.orders o where o.id=p_order_id and (
  o.buyer_id=(select auth.uid()) or exists(select 1 from public.order_allocations a where a.order_id=o.id and a.farmer_id=(select auth.uid()))
 ));
$;
revoke all on function public.is_order_participant(uuid) from public,anon;
grant execute on function public.is_order_participant(uuid) to authenticated;
create policy "order participants read comments" on public.order_comments for select to authenticated using(public.is_order_participant(order_id));
create policy "order participants write comments" on public.order_comments for insert to authenticated with check(author_id=(select auth.uid()) and public.is_order_participant(order_id));
create or replace function public.set_order_comment_author()
returns trigger language plpgsql security definer set search_path = '' as $
begin
 select p.display_name,p.role::text into new.author_display_name,new.author_role from public.profiles p where p.id=new.author_id;
 if new.author_display_name is null then raise exception 'comment_author_profile_missing'; end if;
 return new;
end; $;
create trigger set_order_comment_author_before_insert before insert on public.order_comments for each row execute function public.set_order_comment_author();
grant select,insert on public.order_comments to authenticated;
revoke update,delete on public.order_comments from anon,authenticated;

create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 order_id uuid references public.orders(id) on delete cascade,
 title text not null,
 body text not null,
 notification_type text not null,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);
alter table public.notifications enable row level security;
create policy "users read own notifications" on public.notifications for select to authenticated using(recipient_id=(select auth.uid()));
create policy "users mark own notifications read" on public.notifications for update to authenticated using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));
grant select on public.notifications to authenticated;
revoke insert,update,delete on public.notifications from anon,authenticated;
grant update(read_at) on public.notifications to authenticated;

create or replace function public.notify_farmer_of_buyer_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_farmer uuid; v_crop text;
begin
 select farmer_id,produce_name into v_farmer,v_crop from public.produce_listings where id=new.listing_id;
 insert into public.notifications(recipient_id,title,body,notification_type)
 values(v_farmer,'New buyer order request',new.buyer_name||' requested '||new.quantity_requested||' units of '||v_crop||'. Review the full order before accepting.','order_request');
 return new;
end; $$;
drop trigger if exists notify_farmer_new_request on public.buyer_requests;
create trigger notify_farmer_new_request after insert on public.buyer_requests for each row execute function public.notify_farmer_of_buyer_request();

create or replace function public.notify_order_comment_participants()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_buyer uuid; v_farmer uuid; v_author text; v_role public.user_role;
begin
 select buyer_id into v_buyer from public.orders where id=new.order_id;
 select display_name,role into v_author,v_role from public.profiles where id=new.author_id;
 if new.author_id=v_buyer then
  insert into public.notifications(recipient_id,order_id,title,body,notification_type)
  select distinct a.farmer_id,new.order_id,'New order comment',v_author||' commented on order '||left(new.order_id::text,8)||'.','order_comment'
  from public.order_allocations a where a.order_id=new.order_id and a.farmer_id<>new.author_id;
 else
  insert into public.notifications(recipient_id,order_id,title,body,notification_type)
  values(v_buyer,new.order_id,'New order comment',v_author||' commented on your order '||left(new.order_id::text,8)||'.','order_comment');
 end if;
 return new;
end; $$;
drop trigger if exists notify_order_comment on public.order_comments;
create trigger notify_order_comment after insert on public.order_comments for each row execute function public.notify_order_comment_participants();

create or replace function public.notify_order_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.status is distinct from old.status then
  insert into public.notifications(recipient_id,order_id,title,body,notification_type)
  values(new.buyer_id,new.id,'Order status updated','Your order status is now '||new.status||'.','order_update');
  insert into public.notifications(recipient_id,order_id,title,body,notification_type)
  select distinct a.farmer_id,new.id,'Order status updated','Order '||left(new.id::text,8)||' status is now '||new.status||'.','order_update'
  from public.order_allocations a where a.order_id=new.id and a.farmer_id<>new.buyer_id;
 end if;
 return new;
end; $$;
drop trigger if exists notify_order_status on public.orders;
create trigger notify_order_status after update of status on public.orders for each row execute function public.notify_order_status_change();


-- Buyers may revise fulfilment/contact instructions before fulfilment; notify all allocated farmers.
create or replace function public.update_buyer_order_details(
 p_order_id uuid,p_buyer_name text,p_contact_number text,p_fulfilment_preference text,p_delivery_location text,p_order_instructions text
) returns public.orders language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 if char_length(trim(p_buyer_name)) not between 2 and 120 then raise exception 'invalid_buyer_name'; end if;
 if char_length(trim(p_contact_number)) not between 7 and 30 then raise exception 'invalid_contact_number'; end if;
 if p_fulfilment_preference not in ('delivery','collection') then raise exception 'invalid_fulfilment_preference'; end if;
 if p_fulfilment_preference='delivery' and char_length(trim(coalesce(p_delivery_location,'')))<5 then raise exception 'delivery_location_required'; end if;
 if char_length(coalesce(p_order_instructions,''))>1000 then raise exception 'instructions_too_long'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.buyer_id<>auth.uid() then raise exception 'unauthorized'; end if;
 if v_order.status not in ('pending','accepted') then raise exception 'order_not_editable'; end if;
 update public.orders set buyer_name=trim(p_buyer_name),buyer_contact_number=trim(p_contact_number),
  fulfilment_preference=p_fulfilment_preference,delivery_location=case when p_fulfilment_preference='delivery' then trim(p_delivery_location) else null end,
  order_instructions=nullif(trim(coalesce(p_order_instructions,'')), ''),
  collection_method=p_fulfilment_preference,
  collection_point=case when p_fulfilment_preference='delivery' then trim(p_delivery_location) else collection_point end,
  updated_at=now()
 where id=p_order_id returning * into v_order;
 return v_order;
end; $$;
revoke all on function public.update_buyer_order_details(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.update_buyer_order_details(uuid,text,text,text,text,text) to authenticated;

create or replace function public.notify_buyer_order_details_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if (new.buyer_name,new.buyer_contact_number,new.fulfilment_preference,new.delivery_location,new.order_instructions)
    is distinct from
    (old.buyer_name,old.buyer_contact_number,old.fulfilment_preference,old.delivery_location,old.order_instructions) then
  insert into public.notifications(recipient_id,order_id,title,body,notification_type)
  select distinct a.farmer_id,new.id,'Buyer updated order details',new.buyer_name||' updated contact or fulfilment details for order '||left(new.id::text,8)||'. Review the order.','order_update'
  from public.order_allocations a where a.order_id=new.id and a.farmer_id<>new.buyer_id;
 end if;
 return new;
end; $$;
drop trigger if exists notify_buyer_order_details on public.orders;
create trigger notify_buyer_order_details after update of buyer_name,buyer_contact_number,fulfilment_preference,delivery_location,order_instructions on public.orders for each row execute function public.notify_buyer_order_details_change();
