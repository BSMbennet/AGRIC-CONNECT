create or replace function public.get_bookkeeping_dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
with mine as (
  select entry_type, amount, entry_date, category, payment_status
  from public.farm_bookkeeping_entries
  where owner_id = (select auth.uid())
),
totals as (
  select
    coalesce(sum(amount) filter (where entry_type='income'),0) as total_income,
    coalesce(sum(amount) filter (where entry_type='expense'),0) as total_expenses,
    coalesce(sum(amount) filter (where entry_type='income' and payment_status='unpaid'),0) as unpaid_income,
    coalesce(sum(amount) filter (where entry_type='income' and payment_status='paid'),0) as paid_income,
    coalesce(sum(amount) filter (where entry_type='expense' and payment_status='paid'),0) as paid_expenses
  from mine
),
monthly as (
  select date_trunc('month',entry_date)::date as month_start,
    coalesce(sum(amount) filter(where entry_type='income'),0) as income,
    coalesce(sum(amount) filter(where entry_type='expense'),0) as expenses
  from mine
  where entry_date >= (date_trunc('month',current_date) - interval '11 months')::date
  group by date_trunc('month',entry_date)::date
),
categories as (
  select category, sum(amount) as amount
  from mine where entry_type='expense'
  group by category order by sum(amount) desc limit 6
)
select jsonb_build_object(
  'total_income', totals.total_income,
  'total_expenses', totals.total_expenses,
  'net_profit', totals.total_income - totals.total_expenses,
  'unpaid_income', totals.unpaid_income,
  'cash_position', totals.paid_income - totals.paid_expenses,
  'months', coalesce((
    select jsonb_agg(jsonb_build_object('key',to_char(gs.month_start,'YYYY-MM'),'label',to_char(gs.month_start,'Mon'),'income',coalesce(monthly.income,0),'expenses',coalesce(monthly.expenses,0)) order by gs.month_start)
    from generate_series(date_trunc('month',current_date)-interval '11 months',date_trunc('month',current_date),interval '1 month') as gs(month_start)
    left join monthly on monthly.month_start=gs.month_start::date
  ),'[]'::jsonb),
  'expense_categories',coalesce((
    select jsonb_agg(jsonb_build_object('category',category,'amount',amount) order by amount desc)
    from categories
  ),'[]'::jsonb)
)
from totals;
$function$;
revoke all on function public.get_bookkeeping_dashboard_stats() from public,anon;
grant execute on function public.get_bookkeeping_dashboard_stats() to authenticated;
