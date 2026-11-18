create table if not exists public.farm_bookkeeping_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('income','expense')),
  category text not null check (char_length(trim(category)) between 2 and 60),
  amount numeric(12,2) not null check (amount > 0 and amount <= 9999999999.99),
  entry_date date not null default current_date,
  description text not null default '' check (char_length(description) <= 500),
  related_order_id uuid null references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists farm_bookkeeping_owner_date_idx on public.farm_bookkeeping_entries(owner_id, entry_date desc);
alter table public.farm_bookkeeping_entries enable row level security;
revoke all on public.farm_bookkeeping_entries from anon, public;
grant select, insert, update, delete on public.farm_bookkeeping_entries to authenticated;
drop policy if exists "Farmers manage own bookkeeping entries" on public.farm_bookkeeping_entries;
create policy "Farmers manage own bookkeeping entries"
on public.farm_bookkeeping_entries for all to authenticated
using (owner_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'farmer'
))
with check (owner_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'farmer'
));