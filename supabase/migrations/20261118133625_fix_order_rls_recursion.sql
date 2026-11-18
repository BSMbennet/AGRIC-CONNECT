-- Break the recursive RLS dependency between orders and order_allocations.
--
-- The previous farmer-orders SELECT policy queried order_allocations. The
-- buyer-allocations SELECT policy queries orders, so Postgres could recursively
-- evaluate orders -> order_allocations -> orders. Use the existing private
-- SECURITY DEFINER participant helper instead. It is owned by postgres
-- (BYPASSRLS) and is executable by authenticated users only.

drop policy if exists "farmer sees orders on own listings" on public.orders;

create policy "order participants see their orders"
  on public.orders
  for select
  to authenticated
  using (private.is_order_participant(id));
