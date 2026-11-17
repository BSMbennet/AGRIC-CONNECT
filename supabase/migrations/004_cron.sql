create extension if not exists pg_cron;
select cron.schedule('expire-listings', '0 * * * *', $job$
  update public.produce_listings
  set status = 'expired', updated_at = now()
  where status = 'active' and expires_at is not null and expires_at < now();
$job$);
