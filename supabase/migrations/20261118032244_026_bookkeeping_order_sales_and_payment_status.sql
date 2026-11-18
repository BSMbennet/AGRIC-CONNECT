alter table public.farm_bookkeeping_entries
  add column if not exists entry_source text not null default 'manual'
    check (entry_source in ('manual','fulfilled_order')),
  add column if not exists payment_status text not null default 'paid'
    check (payment_status in ('paid','unpaid')),
  add column if not exists related_allocation_id uuid null references public.order_allocations(id) on delete set null,
  add column if not exists paid_at timestamptz null;

create unique index if not exists farm_bookkeeping_allocation_unique
  on public.farm_bookkeeping_entries(related_allocation_id)
  where related_allocation_id is not null;

drop policy if exists "Farmers manage own bookkeeping entries" on public.farm_bookkeeping_entries;
drop policy if exists "Farmers read own bookkeeping entries" on public.farm_bookkeeping_entries;
drop policy if exists "Farmers insert manual bookkeeping entries" on public.farm_bookkeeping_entries;
drop policy if exists "Farmers update own bookkeeping entries" on public.farm_bookkeeping_entries;
drop policy if exists "Farmers delete manual bookkeeping entries" on public.farm_bookkeeping_entries;

create policy "Farmers read own bookkeeping entries"
on public.farm_bookkeeping_entries for select to authenticated
using (owner_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'farmer'
));

create policy "Farmers insert manual bookkeeping entries"
on public.farm_bookkeeping_entries for insert to authenticated
with check (owner_id = (select auth.uid()) and entry_source = 'manual' and related_allocation_id is null
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'farmer'));

create policy "Farmers update own bookkeeping entries"
on public.farm_bookkeeping_entries for update to authenticated
using (owner_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'farmer'
))
with check (owner_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'farmer'
));

create policy "Farmers delete manual bookkeeping entries"
on public.farm_bookkeeping_entries for delete to authenticated
using (owner_id = (select auth.uid()) and entry_source = 'manual' and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'farmer'
));

create or replace function private.record_fulfilled_allocation_bookkeeping()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_listing_name text; v_order_currency text;
begin
  if new.status = 'fulfilled' and old.status is distinct from 'fulfilled' then
    select pl.produce_name, o.currency into v_listing_name, v_order_currency
    from public.produce_listings pl join public.orders o on o.id = new.order_id
    where pl.id = new.listing_id;
    insert into public.farm_bookkeeping_entries (
      owner_id, entry_type, category, amount, entry_date, description,
      related_order_id, related_allocation_id, entry_source, payment_status
    ) values (
      new.farmer_id, 'income', 'Produce sale',
      round(new.quantity_allocated * new.agreed_unit_price, 2),
      (now() at time zone 'Africa/Johannesburg')::date,
      'Fulfilled order sale: ' || coalesce(v_listing_name, 'produce') ||
        ' · ' || new.quantity_allocated::text || ' units · ' || coalesce(v_order_currency, 'ZAR') ||
        '. Automatically recorded; mark paid when payment is received.',
      new.order_id, new.id, 'fulfilled_order', 'unpaid'
    ) on conflict (related_allocation_id) where related_allocation_id is not null do nothing;
  end if;
  return new;
end;
$function$;
revoke all on function private.record_fulfilled_allocation_bookkeeping() from public, anon, authenticated;
drop trigger if exists record_fulfilled_allocation_bookkeeping on public.order_allocations;
create trigger record_fulfilled_allocation_bookkeeping
after update of status on public.order_allocations
for each row execute function private.record_fulfilled_allocation_bookkeeping();

create or replace function private.guard_bookkeeping_entry_update()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  if old.entry_source = 'fulfilled_order' and (
    new.owner_id is distinct from old.owner_id or
    new.entry_type is distinct from old.entry_type or
    new.category is distinct from old.category or
    new.amount is distinct from old.amount or
    new.entry_date is distinct from old.entry_date or
    new.description is distinct from old.description or
    new.related_order_id is distinct from old.related_order_id or
    new.related_allocation_id is distinct from old.related_allocation_id or
    new.entry_source is distinct from old.entry_source
  ) then raise exception 'Automatically recorded order sales cannot be edited'; end if;
  if new.payment_status is distinct from old.payment_status then
    new.paid_at := case when new.payment_status = 'paid' then now() else null end;
  end if;
  return new;
end;
$function$;
revoke all on function private.guard_bookkeeping_entry_update() from public, anon, authenticated;
drop trigger if exists guard_bookkeeping_entry_update on public.farm_bookkeeping_entries;
create trigger guard_bookkeeping_entry_update before update on public.farm_bookkeeping_entries
for each row execute function private.guard_bookkeeping_entry_update();

insert into public.farm_bookkeeping_entries (
  owner_id, entry_type, category, amount, entry_date, description,
  related_order_id, related_allocation_id, entry_source, payment_status
)
select a.farmer_id, 'income', 'Produce sale',
  round(a.quantity_allocated * a.agreed_unit_price, 2),
  (o.updated_at at time zone 'Africa/Johannesburg')::date,
  'Automatically recorded from previously fulfilled order ' || a.order_id::text || '. Confirm payment status.',
  a.order_id, a.id, 'fulfilled_order', 'unpaid'
from public.order_allocations a join public.orders o on o.id = a.order_id
where a.status = 'fulfilled'
on conflict (related_allocation_id) where related_allocation_id is not null do nothing;
