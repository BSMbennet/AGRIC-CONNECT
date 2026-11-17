-- Preserve legacy listings as unknown instead of implying they were declared non-organic.
alter table public.produce_listings alter column is_organic drop default;
alter table public.produce_listings alter column is_organic drop not null;
update public.produce_listings set is_organic = null;

-- Pause public listings when a farmer switches into buyer mode.
create or replace function public.switch_account_role(p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.user_role;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if p_role not in ('farmer'::public.user_role, 'buyer'::public.user_role) then
    raise exception 'role_not_allowed';
  end if;
  select role into v_current from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'profile_not_found'; end if;
  if v_current not in ('farmer'::public.user_role, 'buyer'::public.user_role) then
    raise exception 'role_not_switchable';
  end if;
  if v_current = 'farmer'::public.user_role and p_role = 'buyer'::public.user_role then
    update public.produce_listings set status = 'paused', updated_at = now()
    where farmer_id = auth.uid() and status = 'active';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = auth.uid();
end;
$$;
revoke all on function public.switch_account_role(public.user_role) from public, anon;
grant execute on function public.switch_account_role(public.user_role) to authenticated;
