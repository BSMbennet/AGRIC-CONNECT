-- Expects a farmer 'aaaaaaaa-…a' owning listing 1111… and another user 'bbbbbbbb-…b' owning 2222…
begin;
create temp table r(name text, ok boolean);
do $$ declare f boolean; begin
  begin insert into public.buyer_requests(listing_id,buyer_id) values ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-00000000000a'); f:=false; exception when insufficient_privilege then f:=true; end;
  insert into r values ('owner cannot request own listing', f);
  begin insert into public.buyer_requests(listing_id,buyer_id) values ('11111111-1111-1111-1111-111111111111','bbbbbbbb-0000-0000-0000-00000000000b'); f:=true; exception when others then f:=false; end;
  insert into r values ('another user can request it', f);
end $$;
select name, case when ok then 'PASS' else 'FAIL' end result from r order by name;
do $$ begin if exists (select 1 from r where not ok) then raise exception 'own-listing tests failed'; end if; end $$;
rollback;
