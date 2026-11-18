-- Run in a transaction; rolls back. Fails (raises) on any broken expectation.
begin;
create temp table t_results(name text, ok boolean);
grant all on t_results to authenticated, anon;
do $$ begin
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',true);
end $$;
set local role authenticated;

-- farmer A can insert own entry
insert into public.farm_transactions(owner_id,kind,category,amount,occurred_on) values ('00000000-0000-0000-0000-00000000000a','income','produce_sale',100,'2026-11-01');

do $$
declare n int; failed boolean;
begin
  -- A cannot insert as B
  begin insert into public.farm_transactions(owner_id,kind,category,amount,occurred_on) values ('00000000-0000-0000-0000-00000000000b','expense','seeds',5,'2026-11-01'); failed:=false;
  exception when others then failed:=true; end;
  insert into t_results values ('cannot insert for another owner', failed);

  -- constraints
  begin insert into public.farm_transactions(owner_id,kind,category,amount,occurred_on) values ('00000000-0000-0000-0000-00000000000a','expense','produce_sale',5,'2026-11-01'); failed:=false; exception when check_violation then failed:=true; end;
  insert into t_results values ('category must match kind', failed);
  begin insert into public.farm_transactions(owner_id,kind,category,amount,occurred_on) values ('00000000-0000-0000-0000-00000000000a','expense','seeds',0,'2026-11-01'); failed:=false; exception when check_violation then failed:=true; end;
  insert into t_results values ('zero amount rejected', failed);
  begin insert into public.farm_transactions(owner_id,kind,category,amount,amount_settled,occurred_on) values ('00000000-0000-0000-0000-00000000000a','expense','seeds',10,11,'2026-11-01'); failed:=false; exception when check_violation then failed:=true; end;
  insert into t_results values ('settled cannot exceed amount', failed);
  begin insert into public.farm_transactions(owner_id,kind,category,amount,occurred_on,receipt_path) values ('00000000-0000-0000-0000-00000000000a','expense','seeds',10,'2026-11-01','00000000-0000-0000-0000-00000000000b/x.pdf'); failed:=false; exception when check_violation then failed:=true; end;
  insert into t_results values ('receipt must be in own folder', failed);

  -- idempotent client submission
  insert into public.farm_transactions(owner_id,kind,category,amount,occurred_on,client_submission_id) values ('00000000-0000-0000-0000-00000000000a','expense','seeds',10,'2026-11-02','11111111-1111-1111-1111-111111111111');
  begin insert into public.farm_transactions(owner_id,kind,category,amount,occurred_on,client_submission_id) values ('00000000-0000-0000-0000-00000000000a','expense','seeds',10,'2026-11-02','11111111-1111-1111-1111-111111111111'); failed:=false; exception when unique_violation then failed:=true; end;
  insert into t_results values ('duplicate submission id rejected', failed);

  select count(*) into n from public.farm_transactions; insert into t_results values ('A sees own 2 rows', n=2);
end $$;

-- farmer B sees nothing of A's and cannot change it
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',true);
do $$
declare n int;
begin
  select count(*) into n from public.farm_transactions; insert into t_results values ('B sees 0 of A rows', n=0);
  update public.farm_transactions set amount=1; get diagnostics n = row_count; insert into t_results values ('B cannot update A rows', n=0);
  delete from public.farm_transactions; get diagnostics n = row_count; insert into t_results values ('B cannot delete A rows', n=0);
end $$;

-- buyer cannot create entries
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',true);
do $$
declare failed boolean;
begin
  begin insert into public.farm_transactions(owner_id,kind,category,amount,occurred_on) values ('00000000-0000-0000-0000-00000000000c','expense','seeds',5,'2026-11-01'); failed:=false; exception when others then failed:=true; end;
  insert into t_results values ('buyer role cannot create entries', failed);
end $$;

-- anon has no access
reset role; set local role anon;
do $$
declare failed boolean;
begin
  begin perform 1 from public.farm_transactions; failed:=false; exception when insufficient_privilege then failed:=true; end;
  insert into t_results values ('anon has no table access', failed);
end $$;

reset role;
select name, case when ok then 'PASS' else 'FAIL' end as result from t_results order by ok, name;
do $$ begin if exists (select 1 from t_results where not ok) then raise exception 'bookkeeping RLS tests failed'; end if; end $$;
rollback;
