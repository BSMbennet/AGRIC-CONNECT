alter table public.produce_listings
  add column if not exists is_organic boolean not null default false;

grant select (is_organic) on public.produce_listings to anon, authenticated;

create or replace function public.switch_account_role(p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.user_role;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;
  if p_role not in ('farmer'::public.user_role, 'buyer'::public.user_role) then
    raise exception 'role_not_allowed';
  end if;
  select role into v_current from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'profile_not_found'; end if;
  if v_current not in ('farmer'::public.user_role, 'buyer'::public.user_role) then
    raise exception 'role_not_switchable';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = auth.uid();
end;
$$;

revoke all on function public.switch_account_role(public.user_role) from public, anon;
grant execute on function public.switch_account_role(public.user_role) to authenticated;
