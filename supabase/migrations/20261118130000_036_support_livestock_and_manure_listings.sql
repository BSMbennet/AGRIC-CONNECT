-- Support livestock sold by head and manure sold by weight or bag.
alter table public.produce_listings
  drop constraint if exists produce_listings_unit_check;
alter table public.produce_listings
  add constraint produce_listings_unit_check
  check (unit in ('kg', 'bunch', 'crate', 'bag', 'head', 'ton'));
alter table public.produce_listings
  drop constraint if exists produce_listings_price_unit_check;
alter table public.produce_listings
  add constraint produce_listings_price_unit_check
  check (price_unit in ('kg', 'bunch', 'crate', 'bag', 'head', 'ton'));
