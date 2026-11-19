-- Removes the rows created by demo_farm_seed.sql for one farmer. Edit v_email, then run.
-- Sample listings that already have orders are paused instead of deleted (orders keep their history).
do $clean$
declare v_email text := 'CHANGE-ME@example.com'; v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(v_email);
  if v_id is null then raise exception 'No account found for %', v_email; end if;
  delete from public.farm_bookkeeping_entries where owner_id = v_id and entry_source = 'manual' and description like '[Sample data]%';
  update public.produce_listings set status = 'paused', updated_at = now()
   where farmer_id = v_id and quality_notes like '[Sample data]%'
     and exists (select 1 from public.order_allocations a where a.listing_id = produce_listings.id);
  delete from public.produce_listings
   where farmer_id = v_id and quality_notes like '[Sample data]%'
     and not exists (select 1 from public.order_allocations a where a.listing_id = produce_listings.id);
end
$clean$;
