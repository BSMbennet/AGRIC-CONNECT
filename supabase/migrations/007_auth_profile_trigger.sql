-- Create a least-privilege profile and consent when a new Auth user signs up.
-- Public signup is restricted to farmer/buyer roles; elevated roles must be assigned by an administrator.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  v_role := case
    when v_metadata->>'role' = 'buyer' then 'buyer'::public.user_role
    else 'farmer'::public.user_role
  end;

  insert into public.profiles (
    id, role, display_name, phone_e164, district, locality, preferred_language
  ) values (
    new.id,
    v_role,
    coalesce(nullif(trim(v_metadata->>'display_name'), ''), 'New user'),
    nullif(trim(v_metadata->>'phone_e164'), ''),
    nullif(trim(v_metadata->>'district'), ''),
    nullif(trim(v_metadata->>'locality'), ''),
    coalesce(nullif(trim(v_metadata->>'preferred_language'), ''), 'en')
  );

  if v_metadata->>'account_consent' = 'true' then
    insert into public.consents (
      profile_id, consent_type, consent_version, granted, method
    ) values (
      new.id, 'account', 'v1', true, 'web_form'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_agriconnect on auth.users;
create trigger on_auth_user_created_agriconnect
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
