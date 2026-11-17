create index profiles_agent_assignment_idx on public.profiles (created_by_agent_id);

create policy "agent reads assigned farmers" on public.profiles for select to authenticated
  using (public.current_role_name() = 'agent' and created_by_agent_id = (select auth.uid()));

create policy "agent reads assigned farmer listings" on public.produce_listings for select to authenticated
  using (
    public.current_role_name() = 'agent'
    and exists (
      select 1 from public.profiles p
      where p.id = farmer_id and p.created_by_agent_id = (select auth.uid())
    )
  );

create policy "agent inserts assigned farmer listings" on public.produce_listings for insert to authenticated
  with check (
    public.current_role_name() = 'agent'
    and exists (
      select 1 from public.profiles p
      where p.id = farmer_id and p.created_by_agent_id = (select auth.uid())
    )
  );
