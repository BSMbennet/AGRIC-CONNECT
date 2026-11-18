revoke all on table public.listing_private_details from anon, public;
grant select, insert, update on table public.listing_private_details to authenticated;
revoke all on function public.confirm_preorder_request(uuid) from anon, public;
grant execute on function public.confirm_preorder_request(uuid) to authenticated;
revoke all on function public.update_buyer_order_details(uuid,text,text,text,text,text) from anon, public;
grant execute on function public.update_buyer_order_details(uuid,text,text,text,text,text) to authenticated;
