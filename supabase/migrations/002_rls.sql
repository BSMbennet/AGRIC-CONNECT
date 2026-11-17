alter table profiles enable row level security;
alter table cooperatives enable row level security;
alter table produce_listings enable row level security;
alter table buyer_requests enable row level security;
alter table orders enable row level security;
alter table order_allocations enable row level security;
alter table order_events enable row level security;
alter table consents enable row level security;

-- SECURITY DEFINER is narrowly scoped to the caller's own auth.uid() profile.
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where (select auth.uid()) is not null and p.id = (select auth.uid());
$$;
revoke all on function public.current_role_name() from public, anon;
grant execute on function public.current_role_name() to authenticated;

create or replace function public.current_cooperative_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.cooperative_id from public.profiles p where p.id = (select auth.uid());
$$;
revoke all on function public.current_cooperative_id() from public, anon;
grant execute on function public.current_cooperative_id() to authenticated;

create or replace function public.current_created_by_agent_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.created_by_agent_id from public.profiles p where (select auth.uid()) is not null and p.id = (select auth.uid());
$$;
revoke all on function public.current_created_by_agent_id() from public, anon;
grant execute on function public.current_created_by_agent_id() to authenticated;

create policy "read own profile" on profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "read coop members manager" on profiles for select to authenticated
  using (public.current_role_name() = 'cooperative_manager'
    and cooperative_id = public.current_cooperative_id());
create policy "read all profiles admin" on profiles for select to authenticated
  using (public.current_role_name() = 'admin');
create policy "update own profile" on profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = public.current_role_name() and cooperative_id is not distinct from public.current_cooperative_id() and created_by_agent_id is not distinct from public.current_created_by_agent_id());

create policy "read cooperatives" on cooperatives for select to authenticated using (true);

create policy "read active listings" on produce_listings for select to authenticated using (status = 'active');
create policy "read own listings" on produce_listings for select to authenticated using (farmer_id = (select auth.uid()));
create policy "read coop listings" on produce_listings for select to authenticated
  using (public.current_role_name() = 'cooperative_manager'
    and cooperative_id = (select p.cooperative_id from public.profiles p where p.id = (select auth.uid())));
create policy "read all listings admin" on produce_listings for select to authenticated
  using (public.current_role_name() = 'admin');
create policy "insert own listing" on produce_listings for insert to authenticated
  with check (farmer_id = (select auth.uid()));
create policy "update own listing" on produce_listings for update to authenticated
  using (farmer_id = (select auth.uid())) with check (farmer_id = (select auth.uid()));
create policy "admin moderate listing" on produce_listings for update to authenticated
  using (public.current_role_name() = 'admin') with check (public.current_role_name() = 'admin');

create policy "buyer sees own requests" on buyer_requests for select to authenticated
  using (buyer_id = (select auth.uid()));
create policy "farmer sees requests on own listings" on buyer_requests for select to authenticated
  using (exists (select 1 from produce_listings l where l.id = listing_id and l.farmer_id = (select auth.uid())));
create policy "buyer inserts request" on buyer_requests for insert to authenticated
  with check (buyer_id = (select auth.uid()) and public.current_role_name() = 'buyer');

create policy "buyer sees own orders" on orders for select to authenticated
  using (buyer_id = (select auth.uid()));
create policy "farmer sees orders on own listings" on orders for select to authenticated
  using (exists (select 1 from order_allocations a where a.order_id = orders.id and a.farmer_id = (select auth.uid())));
create policy "admin sees orders" on orders for select to authenticated
  using (public.current_role_name() = 'admin');

create policy "farmer sees own allocations" on order_allocations for select to authenticated
  using (farmer_id = (select auth.uid()));
create policy "buyer sees allocations on own orders" on order_allocations for select to authenticated
  using (exists (select 1 from orders o where o.id = order_id and o.buyer_id = (select auth.uid())));

create policy "participants see events" on order_events for select to authenticated
  using (exists (
    select 1 from orders o where o.id = order_id
      and (o.buyer_id = (select auth.uid())
        or exists (select 1 from order_allocations a where a.order_id = o.id and a.farmer_id = (select auth.uid())))
  ));

create policy "read own consents" on consents for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "insert own consent" on consents for insert to authenticated
  with check (profile_id = (select auth.uid()));
