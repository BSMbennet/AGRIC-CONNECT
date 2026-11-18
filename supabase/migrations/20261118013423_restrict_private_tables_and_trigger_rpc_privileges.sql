
-- Restrict newly added and private tables to the intended API roles.
revoke all on table public.farmer_subscriptions from anon, public;
grant select on table public.farmer_subscriptions to authenticated;
revoke all on table public.farmer_product_content from anon, public;
grant select on table public.farmer_product_content to authenticated;
revoke all on table public.order_comments from anon, public;
grant select, insert on table public.order_comments to authenticated;
revoke all on table public.order_schedule_events from anon, public;
grant select on table public.order_schedule_events to authenticated;
revoke all on table public.notifications from anon, public;
grant select on table public.notifications to authenticated;
grant update(read_at) on table public.notifications to authenticated;

-- Trigger-only SECURITY DEFINER functions must not be callable as RPCs.
revoke all on function public.enforce_farmer_listing_limit() from public, anon, authenticated;
revoke all on function public.notify_buyer_order_details_change() from public, anon, authenticated;
revoke all on function public.notify_farmer_of_buyer_request() from public, anon, authenticated;
revoke all on function public.notify_order_comment_participants() from public, anon, authenticated;
revoke all on function public.notify_order_status_change() from public, anon, authenticated;
revoke all on function public.set_order_comment_author() from public, anon, authenticated;
