-- Run after migrations 001-006. This is a read-only structural security check.
do $$
declare
  v_unprotected text;
  v_unsecured_definer text;
begin
  select string_agg(c.relname, ', ') into v_unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    and c.relname in ('profiles','cooperatives','produce_listings','buyer_requests','orders','order_allocations','order_events','consents');
  if v_unprotected is not null then
    raise exception 'RLS is not enabled on: %', v_unprotected;
  end if;

  select string_agg(p.proname, ', ') into v_unsecured_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and p.proname in ('current_role_name','current_cooperative_id','current_created_by_agent_id','accept_buyer_request','reject_buyer_request','create_aggregate_order')
    and p.prosrc not ilike '%auth.uid()%';
  if v_unsecured_definer is not null then
    raise exception 'SECURITY DEFINER functions missing auth.uid() checks: %', v_unsecured_definer;
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'produce_listings' and policyname = 'read active listings') then
    raise exception 'Expected active listing read policy is missing';
  end if;
end;
$$;
