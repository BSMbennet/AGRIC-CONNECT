create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;

create or replace function private.is_order_participant(p_order_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.orders o where o.id=p_order_id and
 (o.buyer_id=(select auth.uid()) or exists(select 1 from public.order_allocations a where a.order_id=o.id and a.farmer_id=(select auth.uid()))));
$$;
revoke all on function private.is_order_participant(uuid) from public,anon;
grant execute on function private.is_order_participant(uuid) to authenticated;

drop policy if exists "order participants read comments" on public.order_comments;
drop policy if exists "order participants write comments" on public.order_comments;
create policy "order participants read comments" on public.order_comments for select to authenticated
 using(private.is_order_participant(order_id));
create policy "order participants write comments" on public.order_comments for insert to authenticated
 with check(author_id=(select auth.uid()) and private.is_order_participant(order_id));

drop policy if exists "order participants read schedule events" on public.order_schedule_events;
create policy "order participants read schedule events" on public.order_schedule_events for select to authenticated
 using(private.is_order_participant(order_id));

drop function if exists public.is_order_participant(uuid);
