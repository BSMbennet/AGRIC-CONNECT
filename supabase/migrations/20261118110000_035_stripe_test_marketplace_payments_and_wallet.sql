-- Marketplace Stripe test payments, buyer delivery confirmation, and farmer wallet ledger.
-- Stripe is used only for buyer Checkout Sessions in test mode. Seller transfers/payouts are not implemented.
alter table public.orders
  add column if not exists delivery_confirmed_at timestamptz,
  add column if not exists delivery_confirmed_by uuid references public.profiles(id);

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  payment_kind text not null check (payment_kind in ('deposit','balance')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  commission_bps integer not null default 500 check (commission_bps between 0 and 10000),
  status text not null default 'pending' check (status in ('pending','paid','failed','expired','refunded')),
  idempotency_key text not null unique,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists order_payments_order_created_idx
  on public.order_payments(order_id, created_at desc);
create index if not exists order_payments_buyer_created_idx
  on public.order_payments(buyer_id, created_at desc);

create table if not exists public.farmer_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  allocation_id uuid not null references public.order_allocations(id) on delete cascade,
  payment_id uuid not null references public.order_payments(id) on delete cascade,
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  commission_bps integer not null default 500 check (commission_bps between 0 and 10000),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  net_amount numeric(12,2) not null check (net_amount >= 0),
  status text not null default 'pending_delivery'
    check (status in ('pending_delivery','delivery_confirmed_unpaid')),
  created_at timestamptz not null default now(),
  unique(payment_id, allocation_id)
);
create index if not exists farmer_wallet_ledger_owner_created_idx
  on public.farmer_wallet_ledger(farmer_id, created_at desc);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.order_payments enable row level security;
alter table public.farmer_wallet_ledger enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "order participants read payment records" on public.order_payments;
create policy "order participants read payment records"
on public.order_payments for select to authenticated
using (
  exists (select 1 from public.orders o where o.id = order_payments.order_id and o.buyer_id = (select auth.uid()))
  or exists (select 1 from public.order_allocations a where a.order_id = order_payments.order_id and a.farmer_id = (select auth.uid()))
);
drop policy if exists "farmers read own wallet ledger" on public.farmer_wallet_ledger;
create policy "farmers read own wallet ledger"
on public.farmer_wallet_ledger for select to authenticated
using (farmer_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'farmer'
));

grant select on public.order_payments, public.farmer_wallet_ledger to authenticated;
revoke insert, update, delete on public.order_payments, public.farmer_wallet_ledger from anon, authenticated;
revoke all on public.stripe_webhook_events from public, anon, authenticated;
grant all on public.order_payments, public.farmer_wallet_ledger, public.stripe_webhook_events to service_role;

create or replace function public.create_order_payment_attempt(
  p_order_id uuid,
  p_payment_kind text
) returns table(payment_id uuid, amount_minor bigint, currency text)
language plpgsql security definer set search_path = ''
as $function$
declare
  v_order public.orders;
  v_payment public.order_payments;
  v_total_minor bigint;
  v_paid_minor bigint;
  v_amount_minor bigint;
  v_deposit_minor bigint;
  v_payment_id uuid;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if p_payment_kind not in ('deposit','balance') then raise exception 'invalid_payment_kind'; end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found or v_order.buyer_id <> auth.uid() then raise exception 'unauthorized'; end if;
  if v_order.status not in ('accepted','fulfilled') then raise exception 'order_not_accepted'; end if;
  if v_order.delivery_confirmed_at is not null then raise exception 'delivery_already_confirmed'; end if;
  if v_order.currency <> 'ZAR' then raise exception 'unsupported_currency'; end if;

  select coalesce(round(sum(a.quantity_allocated * a.agreed_unit_price * 100)),0)::bigint
    into v_total_minor
  from public.order_allocations a
  where a.order_id = p_order_id;
  if v_total_minor <= 0 then raise exception 'order_total_invalid'; end if;

  select coalesce(sum(p.amount_minor),0)::bigint
    into v_paid_minor
  from public.order_payments p
  where p.order_id = p_order_id and p.status = 'paid';

  -- Reuse an existing pending Checkout attempt to avoid duplicate sessions.
  select * into v_payment
  from public.order_payments p
  where p.order_id = p_order_id and p.status = 'pending'
  order by p.created_at desc
  limit 1
  for update;
  if found then
    if v_payment.payment_kind <> p_payment_kind then raise exception 'another_payment_pending'; end if;
    return query select v_payment.id, v_payment.amount_minor, v_payment.currency::text;
    return;
  end if;

  v_deposit_minor := greatest(1, round(v_total_minor * 0.25)::bigint);
  if p_payment_kind = 'deposit' then
    if v_paid_minor > 0 then raise exception 'deposit_already_paid'; end if;
    v_amount_minor := v_deposit_minor;
  else
    if v_paid_minor < v_deposit_minor then raise exception 'deposit_required'; end if;
    v_amount_minor := v_total_minor - v_paid_minor;
    if v_amount_minor <= 0 then raise exception 'order_fully_paid'; end if;
  end if;

  v_payment_id := gen_random_uuid();
  insert into public.order_payments (
    id, order_id, buyer_id, payment_kind, amount_minor, currency,
    commission_bps, status, idempotency_key
  ) values (
    v_payment_id, p_order_id, p_buyer_id, p_payment_kind, v_amount_minor,
    'ZAR', 500, 'pending', 'agricnorthx-order-payment-' || v_payment_id::text
  );

  return query select v_payment_id, v_amount_minor, 'ZAR'::text;
end;
$function$;
revoke all on function public.create_order_payment_attempt(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.create_order_payment_attempt(uuid,text,uuid) to service_role;

create or replace function public.record_order_payment_success(
  p_payment_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_event_id text,
  p_event_type text,
  p_amount_minor bigint,
  p_currency text
) returns void
language plpgsql security definer set search_path = ''
as $function$
declare
  v_payment public.order_payments;
  v_order public.orders;
  v_total numeric(14,2);
begin
  if coalesce(trim(p_event_id),'') = '' then raise exception 'stripe_event_id_required'; end if;
  insert into public.stripe_webhook_events(event_id,event_type)
  values(p_event_id,p_event_type)
  on conflict(event_id) do nothing;
  if not found then return; end if;

  select * into v_payment
  from public.order_payments
  where id = p_payment_id
  for update;
  if not found then raise exception 'order_payment_not_found'; end if;
  if v_payment.amount_minor <> p_amount_minor or lower(v_payment.currency::text) <> lower(p_currency) then
    raise exception 'stripe_amount_or_currency_mismatch';
  end if;
  if v_payment.status = 'paid' then return; end if;
  if v_payment.status <> 'pending' then raise exception 'order_payment_not_pending'; end if;

  update public.order_payments
  set status = 'paid',
      stripe_checkout_session_id = coalesce(nullif(p_stripe_checkout_session_id,''),stripe_checkout_session_id),
      stripe_payment_intent_id = coalesce(nullif(p_stripe_payment_intent_id,''),stripe_payment_intent_id),
      paid_at = now(),
      updated_at = now()
  where id = p_payment_id;

  select * into v_order from public.orders where id = v_payment.order_id;
  select coalesce(sum(a.quantity_allocated * a.agreed_unit_price),0)::numeric(14,2)
    into v_total
  from public.order_allocations a where a.order_id = v_payment.order_id;
  if v_total <= 0 then raise exception 'order_total_invalid'; end if;

  with allocation_values as (
    select
      a.id,
      a.order_id,
      a.farmer_id,
      (a.quantity_allocated * a.agreed_unit_price)::numeric as allocation_total,
      sum(a.quantity_allocated * a.agreed_unit_price) over ()::numeric as all_allocations_total,
      row_number() over (order by (a.quantity_allocated * a.agreed_unit_price) desc, a.id) as allocation_number
    from public.order_allocations a
    where a.order_id = v_payment.order_id
  ),
  rounded_shares as (
    select *,
      round(v_payment.amount_minor::numeric * allocation_total / nullif(all_allocations_total, 0), 0)::bigint as share_minor
    from allocation_values
  ),
  balanced_shares as (
    select *,
      share_minor + case
        when allocation_number = 1 then v_payment.amount_minor - sum(share_minor) over ()
        else 0
      end as gross_minor
    from rounded_shares
  ),
  commissioned as (
    select *,
      round(gross_minor * v_payment.commission_bps::numeric / 10000, 0)::bigint as commission_minor
    from balanced_shares
  )
  insert into public.farmer_wallet_ledger (
    farmer_id, order_id, allocation_id, payment_id, currency,
    gross_amount, commission_bps, commission_amount, net_amount, status
  )
  select
    farmer_id,
    order_id,
    id,
    v_payment.id,
    'ZAR',
    gross_minor::numeric / 100,
    v_payment.commission_bps,
    commission_minor::numeric / 100,
    (gross_minor - commission_minor)::numeric / 100,
    case when v_order.delivery_confirmed_at is null
      then 'pending_delivery' else 'delivery_confirmed_unpaid' end
  from commissioned
  on conflict(payment_id,allocation_id) do nothing;
end;
$function$;
revoke all on function public.record_order_payment_success(uuid,text,text,text,text,bigint,text) from public, anon, authenticated;
grant execute on function public.record_order_payment_success(uuid,text,text,text,text,bigint,text) to service_role;

create or replace function public.record_order_payment_failure(
  p_payment_id uuid,
  p_event_id text,
  p_event_type text,
  p_failure_status text
) returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  if p_failure_status not in ('failed','expired') then raise exception 'invalid_failure_status'; end if;
  if coalesce(trim(p_event_id),'') = '' then raise exception 'stripe_event_id_required'; end if;
  insert into public.stripe_webhook_events(event_id,event_type)
  values(p_event_id,p_event_type)
  on conflict(event_id) do nothing;
  if not found then return; end if;

  update public.order_payments
  set status = p_failure_status, updated_at = now()
  where id = p_payment_id and status = 'pending';
end;
$function$;
revoke all on function public.record_order_payment_failure(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.record_order_payment_failure(uuid,text,text,text) to service_role;

create or replace function public.confirm_order_delivery(p_order_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $function$
declare
  v_order public.orders;
  v_total_minor bigint;
  v_paid_minor bigint;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.buyer_id <> auth.uid() then raise exception 'unauthorized'; end if;
  if v_order.status <> 'fulfilled' then raise exception 'order_not_fulfilled'; end if;
  if exists (
    select 1 from public.order_allocations a
    where a.order_id = p_order_id and a.status <> 'fulfilled'
  ) then raise exception 'allocations_not_fulfilled'; end if;

  select coalesce(round(sum(a.quantity_allocated * a.agreed_unit_price * 100)),0)::bigint
    into v_total_minor
  from public.order_allocations a where a.order_id = p_order_id;
  select coalesce(sum(p.amount_minor),0)::bigint
    into v_paid_minor
  from public.order_payments p
  where p.order_id = p_order_id and p.status = 'paid';
  if v_paid_minor < v_total_minor then raise exception 'order_balance_unpaid'; end if;

  if v_order.delivery_confirmed_at is not null then return; end if;
  update public.orders
  set delivery_confirmed_at = now(), delivery_confirmed_by = auth.uid(), updated_at = now()
  where id = p_order_id;

  update public.farmer_wallet_ledger
  set status = 'delivery_confirmed_unpaid'
  where order_id = p_order_id and status = 'pending_delivery';

  insert into public.order_events(order_id,actor_profile_id,event_type,from_status,to_status,note)
  values(p_order_id,auth.uid(),'buyer_delivery_confirmed','fulfilled','fulfilled',
    'Buyer confirmed receipt. Farmer wallet entries remain unpaid pending an approved payout route.');

  insert into public.notifications(recipient_id,order_id,title,body,notification_type)
  select distinct a.farmer_id,p_order_id,'Buyer confirmed delivery',
    'The buyer confirmed receipt for order ' || left(p_order_id::text,8) || '. Your wallet ledger has been updated.',
    'order_update'
  from public.order_allocations a where a.order_id = p_order_id;
end;
$function$;
revoke all on function public.confirm_order_delivery(uuid,uuid) from public, anon, authenticated;
grant execute on function public.confirm_order_delivery(uuid,uuid) to service_role;
