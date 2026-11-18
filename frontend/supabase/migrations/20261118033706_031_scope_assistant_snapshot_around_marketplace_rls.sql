-- 031: use a private, explicitly owner-scoped snapshot to avoid recursive order RLS policies
create or replace function private.get_assistant_marketplace_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_plan text;
begin
  if v_user is null then
    return null;
  end if;

  select s.plan into v_plan
  from public.farmer_subscriptions s
  where s.farmer_id = v_user
    and s.status in ('active','trialing')
    and (s.current_period_end is null or s.current_period_end > now())
  order by s.current_period_end desc nulls last
  limit 1;

  return jsonb_build_object(
    'as_of', now(),
    'profile', (select jsonb_build_object('role',p.role,'locality',p.locality,'municipality',p.municipality,'district',p.district) from public.profiles p where p.id=v_user),
    'subscription', (select jsonb_build_object('plan',s.plan,'status',s.status,'current_period_end',s.current_period_end) from public.farmer_subscriptions s where s.farmer_id=v_user and s.status in ('active','trialing') and (s.current_period_end is null or s.current_period_end>now()) order by s.current_period_end desc nulls last limit 1),
    'listings', jsonb_build_object(
      'total',(select count(*) from public.produce_listings l where l.farmer_id=v_user),
      'active',(select count(*) from public.produce_listings l where l.farmer_id=v_user and l.status='active'),
      'limit',case coalesce(v_plan,'free') when 'premium' then 200 when 'pro' then 50 else 10 end
    ),
    'seller', jsonb_build_object(
      'allocation_count',(select count(*) from public.order_allocations a where a.farmer_id=v_user),
      'fulfilled_allocations',(select count(*) from public.order_allocations a where a.farmer_id=v_user and a.status='fulfilled'),
      'fulfilled_sales_value',(select coalesce(sum(a.quantity_allocated*a.agreed_unit_price),0) from public.order_allocations a where a.farmer_id=v_user and a.status='fulfilled'),
      'open_allocations',(select count(*) from public.order_allocations a where a.farmer_id=v_user and a.status not in ('fulfilled','rejected','cancelled')),
      'delivery_orders',(select count(*) from public.order_allocations a join public.orders o on o.id=a.order_id where a.farmer_id=v_user and o.fulfilment_method='delivery'),
      'scheduled_deliveries',(select count(*) from public.order_allocations a join public.orders o on o.id=a.order_id where a.farmer_id=v_user and o.fulfilment_method='delivery' and o.fulfilment_state in ('scheduled_for_delivery','out_for_delivery'))
    ),
    'buyer', jsonb_build_object(
      'order_count',(select count(*) from public.orders o where o.buyer_id=v_user),
      'fulfilled_orders',(select count(*) from public.orders o where o.buyer_id=v_user and o.status='fulfilled'),
      'fulfilled_spend',(select coalesce(sum(o.quantity_agreed*o.unit_price+coalesce(o.delivery_fee,0)),0) from public.orders o where o.buyer_id=v_user and o.status='fulfilled'),
      'open_orders',(select count(*) from public.orders o where o.buyer_id=v_user and o.status not in ('fulfilled','rejected','cancelled'))
    ),
    'bookkeeping', jsonb_build_object(
      'income',(select coalesce(sum(e.amount),0) from public.farm_bookkeeping_entries e where e.owner_id=v_user and e.entry_type='income'),
      'expenses',(select coalesce(sum(e.amount),0) from public.farm_bookkeeping_entries e where e.owner_id=v_user and e.entry_type='expense'),
      'unpaid_income',(select coalesce(sum(e.amount),0) from public.farm_bookkeeping_entries e where e.owner_id=v_user and e.entry_type='income' and e.payment_status='unpaid')
    )
  );
end;
$$;

revoke all on function private.get_assistant_marketplace_snapshot() from public, anon, authenticated;
grant execute on function private.get_assistant_marketplace_snapshot() to authenticated;

create or replace function public.get_assistant_marketplace_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_assistant_marketplace_snapshot();
$$;

revoke all on function public.get_assistant_marketplace_snapshot() from public, anon;
grant execute on function public.get_assistant_marketplace_snapshot() to authenticated;
