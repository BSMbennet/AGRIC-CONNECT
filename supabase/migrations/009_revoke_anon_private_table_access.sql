-- Keep signed-out marketplace access limited to safe produce-listing columns.
-- Private business and account tables must not be reachable by the anon role.
revoke all privileges on table
  public.profiles,
  public.cooperatives,
  public.buyer_requests,
  public.orders,
  public.order_allocations,
  public.order_events,
  public.consents
from anon;
