-- Private farmer-owned field observations ("Field Truth").
-- Exact coordinates are intentionally not collected in this first release.
create table if not exists public.farm_field_profiles (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  field_name text not null check (char_length(trim(field_name)) between 2 and 80),
  locality text not null check (char_length(trim(locality)) between 2 and 100),
  soil_texture text not null default 'unknown'
    check (soil_texture in ('sandy','sandy_loam','loamy','clay_loam','clay','unknown')),
  drainage text not null default 'unknown'
    check (drainage in ('well_drained','moderate','poor','unknown')),
  soil_ph numeric(3,1) check (soil_ph is null or soil_ph between 3.0 and 10.0),
  soil_ph_source text not null default 'not_tested'
    check (soil_ph_source in ('lab_tested','farmer_estimate','not_tested')),
  soil_test_date date,
  previous_crop text check (previous_crop is null or char_length(previous_crop) <= 80),
  field_notes text check (field_notes is null or char_length(field_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_ph_source_consistent check (
    (soil_ph is null and soil_ph_source = 'not_tested')
    or (soil_ph is not null and soil_ph_source in ('lab_tested','farmer_estimate'))
  )
);

create index if not exists farm_field_profiles_farmer_created_idx
  on public.farm_field_profiles (farmer_id, created_at desc);

alter table public.farm_field_profiles enable row level security;

drop policy if exists "Farmers read own field profiles" on public.farm_field_profiles;
create policy "Farmers read own field profiles"
  on public.farm_field_profiles for select to authenticated
  using (farmer_id = (select auth.uid()));

drop policy if exists "Farmers create own field profiles" on public.farm_field_profiles;
create policy "Farmers create own field profiles"
  on public.farm_field_profiles for insert to authenticated
  with check (
    farmer_id = (select auth.uid())
    and public.current_role_name() = 'farmer'
  );

drop policy if exists "Farmers update own field profiles" on public.farm_field_profiles;
create policy "Farmers update own field profiles"
  on public.farm_field_profiles for update to authenticated
  using (farmer_id = (select auth.uid()))
  with check (
    farmer_id = (select auth.uid())
    and public.current_role_name() = 'farmer'
  );

drop policy if exists "Farmers delete own field profiles" on public.farm_field_profiles;
create policy "Farmers delete own field profiles"
  on public.farm_field_profiles for delete to authenticated
  using (farmer_id = (select auth.uid()));

-- Supabase Data API exposure is explicit; RLS still governs every row.
revoke all on table public.farm_field_profiles from anon, public;
grant select, insert, update, delete on table public.farm_field_profiles to authenticated;
