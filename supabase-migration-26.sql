-- migration 26: scheduled live feeds — pg_cron POSTs to /api/feeds every 10
-- minutes; the endpoint pulls public APIs (weather, air, crypto, fx,
-- polymarket, hackernews) and writes vars + dataset rows, which stream to the
-- phone over the existing realtime channels.
--
-- auth reuses the vault 'dispatch_secret' (created for migration 25) so no new
-- secret material is introduced.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.refresh_feeds() returns void
language plpgsql security definer
set search_path = public, net, vault as $$
declare
  secret text;
begin
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'dispatch_secret' limit 1;
  if secret is null then
    return; -- gateway secret not provisioned; feeds stay manual
  end if;
  perform net.http_post(
    url := 'https://iphone-app-five.vercel.app/api/feeds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Dispatch-Secret', secret
    ),
    body := '{}'::jsonb
  );
end $$;

-- cron.schedule upserts by job name, so re-running is safe
select cron.schedule('refresh-feeds', '*/10 * * * *', 'select public.refresh_feeds()');
