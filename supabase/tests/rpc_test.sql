-- Requires the synthetic demo users and listings from: pnpm seed
-- Run in the Supabase SQL editor. The entire test transaction is rolled back.
begin;

do $$
declare
  v_farmer_a uuid;
  v_farmer_b uuid;
  v_buyer uuid;
  v_listing_a uuid;
  v_listing_b uuid;
  v_request uuid;
  v_order public.orders;
  v_before numeric;
  v_after numeric;
begin
  select id into v_farmer_a from auth.users where email = 'farmera@demo.agriconnect.invalid';
  select id into v_farmer_b from auth.users where email = 'farmerb@demo.agriconnect.invalid';
  select id into v_buyer from auth.users where email = 'buyer@demo.agriconnect.invalid';
  select id into v_listing_a from public.produce_listings where farmer_id = v_farmer_a and client_submission_id = '00000000-0000-4000-8000-000000000001';
  select id into v_listing_b from public.produce_listings where farmer_id = v_farmer_b and client_submission_id = '00000000-0000-4000-8000-000000000002';

  if v_farmer_a is null or v_farmer_b is null or v_buyer is null or v_listing_a is null or v_listing_b is null then
    raise exception 'Run pnpm seed before rpc_test.sql';
  end if;

  insert into public.buyer_requests (listing_id, buyer_id, quantity_requested, status)
  values (v_listing_a, v_buyer, 5, 'pending') returning id into v_request;

  perform set_config('request.jwt.claim.sub', v_farmer_a::text, true);
  select reserved_quantity into v_before from public.produce_listings where id = v_listing_a;
  select * into v_order from public.accept_buyer_request(v_request);
  select reserved_quantity into v_after from public.produce_listings where id = v_listing_a;
  if v_after <> v_before + 5 or v_order.status <> 'accepted' then
    raise exception 'accept_buyer_request did not reserve the requested quantity';
  end if;

  begin
    perform public.accept_buyer_request(v_request);
    raise exception 'Expected duplicate acceptance to fail';
  exception when others then
    if sqlerrm not like '%request_not_pending%' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', v_buyer::text, true);
  select * into v_order from public.create_aggregate_order(
    v_buyer,
    jsonb_build_array(
      jsonb_build_object('listing_id', v_listing_a, 'quantity', 2),
      jsonb_build_object('listing_id', v_listing_b, 'quantity', 3)
    )
  );
  if v_order.status <> 'pending' or v_order.quantity_agreed <> 5 then
    raise exception 'Aggregate order was not created with the expected total';
  end if;

  begin
    perform public.create_aggregate_order(
      v_buyer,
      jsonb_build_array(
        jsonb_build_object('listing_id', v_listing_a, 'quantity', 100000),
        jsonb_build_object('listing_id', v_listing_b, 'quantity', 1)
      )
    );
    raise exception 'Expected insufficient stock to fail';
  exception when others then
    if sqlerrm not like '%insufficient_stock%' then raise; end if;
  end;
end;
$$;

rollback;
