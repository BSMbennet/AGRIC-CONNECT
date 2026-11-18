-- Farm bookkeeping: private, owner-only ledger of income and expenses.
-- All rows are transactions the user recorded; nothing here is estimated or verified by the platform.
-- Cooperative-wide summaries over members' books are intentionally NOT included: they need
-- explicit per-member consent (see docs/BOOKKEEPING.md).
create table if not exists public.farm_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  amount_settled numeric(12,2) not null default 0,
  currency char(3) not null default 'ZAR',
  occurred_on date not null,
  payment_method text not null default 'cash'
    check (payment_method in ('cash','eft','mobile_money','barter','other')),
  counterparty text check (counterparty is null or char_length(counterparty) <= 120),
  crop text check (crop is null or char_length(crop) <= 80),
  order_id uuid references public.orders(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  receipt_path text,
  client_submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farm_tx_category_matches_kind check (
    (kind = 'income' and category in ('produce_sale','other_income'))
    or (kind = 'expense' and category in ('seeds','fertiliser','pesticides','equipment','labour','transport','irrigation','packaging','livestock','other'))
  ),
  constraint farm_tx_settled_within_amount check (amount_settled >= 0 and amount_settled <= amount),
  constraint farm_tx_receipt_in_owner_folder check (receipt_path is null or receipt_path like owner_id::text || '/%'),
  constraint farm_tx_client_submission_unique unique (owner_id, client_submission_id)
);
create index if not exists farm_transactions_owner_date_idx on public.farm_transactions (owner_id, occurred_on desc);
create index if not exists farm_transactions_owner_crop_idx on public.farm_transactions (owner_id, crop) where crop is not null;

alter table public.farm_transactions enable row level security;

drop policy if exists "owners read own transactions" on public.farm_transactions;
create policy "owners read own transactions" on public.farm_transactions for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists "owners create own transactions" on public.farm_transactions;
create policy "owners create own transactions" on public.farm_transactions for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.current_role_name() in ('farmer','cooperative_manager'));
drop policy if exists "owners update own transactions" on public.farm_transactions;
create policy "owners update own transactions" on public.farm_transactions for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and public.current_role_name() in ('farmer','cooperative_manager'));
drop policy if exists "owners delete own transactions" on public.farm_transactions;
create policy "owners delete own transactions" on public.farm_transactions for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on table public.farm_transactions from anon, public;
grant select, insert, update, delete on table public.farm_transactions to authenticated;

-- Private receipt storage; first path segment must be the owner's user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('farm-receipts', 'farm-receipts', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "owners upload own receipts" on storage.objects;
create policy "owners upload own receipts" on storage.objects for insert to authenticated
  with check (bucket_id = 'farm-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "owners read own receipts" on storage.objects;
create policy "owners read own receipts" on storage.objects for select to authenticated
  using (bucket_id = 'farm-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "owners delete own receipts" on storage.objects;
create policy "owners delete own receipts" on storage.objects for delete to authenticated
  using (bucket_id = 'farm-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
