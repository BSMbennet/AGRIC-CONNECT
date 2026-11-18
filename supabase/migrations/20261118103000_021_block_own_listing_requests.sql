-- Defence in depth: a user can never create a buyer request for their own listing,
-- even by calling the API directly (the app also checks this in server actions).
create or replace function public.block_own_listing_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.produce_listings l where l.id = new.listing_id and l.farmer_id = new.buyer_id) then
    raise exception 'You cannot request your own listing' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.block_own_listing_request() from public, anon, authenticated;

drop trigger if exists block_own_listing_request on public.buyer_requests;
create trigger block_own_listing_request before insert on public.buyer_requests
  for each row execute function public.block_own_listing_request();
