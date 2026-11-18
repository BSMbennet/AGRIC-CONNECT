alter table public.buyer_requests
  add column if not exists buyer_name text,
  add column if not exists contact_number text,
  add column if not exists fulfilment_preference text not null default 'collection'
    check (fulfilment_preference in ('delivery','collection')),
  add column if not exists delivery_location text,
  add column if not exists order_instructions text;
alter table public.buyer_requests
  add constraint buyer_requests_delivery_location_check
  check (fulfilment_preference <> 'delivery' or char_length(trim(coalesce(delivery_location,''))) >= 5);
