
-- Restore the runtime tables used by dashboard notifications and order conversations.
create table if not exists public.order_comments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  author_display_name text not null,
  author_role text not null,
  created_at timestamptz not null default now()
);
create index if not exists order_comments_order_created_idx
  on public.order_comments(order_id, created_at);
alter table public.order_comments enable row level security;
create or replace function public.is_order_participant(p_order_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id and (
      o.buyer_id = (select auth.uid())
      or exists (
        select 1 from public.order_allocations a
        where a.order_id = o.id and a.farmer_id = (select auth.uid())
      )
    )
  );
$function$;
revoke all on function public.is_order_participant(uuid) from public, anon;
grant execute on function public.is_order_participant(uuid) to authenticated;
drop policy if exists "order participants read comments" on public.order_comments;
create policy "order participants read comments" on public.order_comments
  for select to authenticated using (public.is_order_participant(order_id));
drop policy if exists "order participants write comments" on public.order_comments;
create policy "order participants write comments" on public.order_comments
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_order_participant(order_id));
create or replace function public.set_order_comment_author()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  select p.display_name, p.role::text
    into new.author_display_name, new.author_role
  from public.profiles p where p.id = new.author_id;
  if new.author_display_name is null then
    raise exception 'comment_author_profile_missing';
  end if;
  return new;
end;
$function$;
drop trigger if exists set_order_comment_author_before_insert on public.order_comments;
create trigger set_order_comment_author_before_insert
  before insert on public.order_comments
  for each row execute function public.set_order_comment_author();
grant select, insert on public.order_comments to authenticated;
revoke update, delete on public.order_comments from anon, authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
grant select on public.notifications to authenticated;
revoke insert, update, delete on public.notifications from anon, authenticated;
grant update(read_at) on public.notifications to authenticated;

create or replace function public.notify_farmer_of_buyer_request()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_farmer uuid; v_crop text;
begin
  select l.farmer_id, l.produce_name into v_farmer, v_crop
  from public.produce_listings l where l.id = new.listing_id;
  if v_farmer is not null then
    insert into public.notifications(recipient_id, title, body, notification_type)
    values (
      v_farmer,
      'New buyer order request',
      coalesce(new.buyer_name, 'A buyer') || ' requested ' ||
        new.quantity_requested::text || ' units of ' || coalesce(v_crop, 'produce') || '.',
      'order_request'
    );
  end if;
  return new;
end;
$function$;
drop trigger if exists notify_farmer_new_request on public.buyer_requests;
create trigger notify_farmer_new_request
  after insert on public.buyer_requests
  for each row execute function public.notify_farmer_of_buyer_request();

create or replace function public.notify_order_comment_participants()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_buyer uuid; v_author text;
begin
  select o.buyer_id into v_buyer from public.orders o where o.id = new.order_id;
  select p.display_name into v_author from public.profiles p where p.id = new.author_id;
  if new.author_id = v_buyer then
    insert into public.notifications(recipient_id, order_id, title, body, notification_type)
    select distinct a.farmer_id, new.order_id, 'New order comment',
      coalesce(v_author, 'The buyer') || ' commented on order ' ||
      left(new.order_id::text, 8) || '.', 'order_comment'
    from public.order_allocations a
    where a.order_id = new.order_id and a.farmer_id <> new.author_id;
  else
    insert into public.notifications(recipient_id, order_id, title, body, notification_type)
    values (v_buyer, new.order_id, 'New order comment',
      coalesce(v_author, 'A farmer') || ' commented on your order ' ||
      left(new.order_id::text, 8) || '.', 'order_comment');
  end if;
  return new;
end;
$function$;
drop trigger if exists notify_order_comment on public.order_comments;
create trigger notify_order_comment
  after insert on public.order_comments
  for each row execute function public.notify_order_comment_participants();

create or replace function public.notify_order_status_change()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if new.status is distinct from old.status then
    insert into public.notifications(recipient_id, order_id, title, body, notification_type)
    values (new.buyer_id, new.id, 'Order status updated',
      'Your order status is now ' || new.status::text || '.', 'order_update');
    insert into public.notifications(recipient_id, order_id, title, body, notification_type)
    select distinct a.farmer_id, new.id, 'Order status updated',
      'Order ' || left(new.id::text, 8) || ' status is now ' || new.status::text || '.', 'order_update'
    from public.order_allocations a
    where a.order_id = new.id and a.farmer_id <> new.buyer_id;
  end if;
  return new;
end;
$function$;
drop trigger if exists notify_order_status on public.orders;
create trigger notify_order_status
  after update of status on public.orders
  for each row execute function public.notify_order_status_change();

create or replace function public.notify_buyer_order_details_change()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if (new.buyer_name, new.buyer_contact_number, new.fulfilment_preference,
      new.delivery_location, new.order_instructions)
     is distinct from
     (old.buyer_name, old.buyer_contact_number, old.fulfilment_preference,
      old.delivery_location, old.order_instructions) then
    insert into public.notifications(recipient_id, order_id, title, body, notification_type)
    select distinct a.farmer_id, new.id, 'Buyer updated order details',
      coalesce(new.buyer_name, 'The buyer') ||
      ' updated contact or fulfilment details for order ' ||
      left(new.id::text, 8) || '.', 'order_update'
    from public.order_allocations a
    where a.order_id = new.id and a.farmer_id <> new.buyer_id;
  end if;
  return new;
end;
$function$;
drop trigger if exists notify_buyer_order_details on public.orders;
create trigger notify_buyer_order_details
  after update of buyer_name, buyer_contact_number, fulfilment_preference,
    delivery_location, order_instructions on public.orders
  for each row execute function public.notify_buyer_order_details_change();

-- Enforce listing caps in PostgreSQL, not only in the UI.
create or replace function public.enforce_farmer_listing_limit()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_limit integer := 10; v_plan text;
begin
  if new.status <> 'active' then return new; end if;
  if tg_op = 'INSERT' and new.client_submission_id is not null and exists (
    select 1 from public.produce_listings l
    where l.farmer_id = new.farmer_id
      and l.client_submission_id = new.client_submission_id
  ) then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.farmer_id::text, 0));
  select s.plan into v_plan
  from public.farmer_subscriptions s
  where s.farmer_id = new.farmer_id
    and s.status in ('active', 'trialing')
    and s.current_period_end > now()
  order by case s.plan when 'premium' then 2 else 1 end desc
  limit 1;
  if v_plan = 'pro' then v_limit := 50;
  elsif v_plan = 'premium' then v_limit := 200;
  end if;
  if (
    select count(*) from public.produce_listings l
    where l.farmer_id = new.farmer_id and l.status = 'active'
      and (tg_op = 'INSERT' or l.id <> new.id)
  ) >= v_limit then
    raise exception using errcode = 'P0001',
      message = 'farmer_listing_limit_reached',
      detail = format('Your current plan allows %s active listings.', v_limit);
  end if;
  return new;
end;
$function$;
drop trigger if exists farmer_listing_limit_guard on public.produce_listings;
create trigger farmer_listing_limit_guard
  before insert or update of status, farmer_id on public.produce_listings
  for each row execute function public.enforce_farmer_listing_limit();
