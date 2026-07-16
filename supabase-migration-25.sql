-- migration 25: event push gateway — webhooks per agent.
-- a trigger on events POSTs each new row to /api/dispatch, which forwards it
-- (hmac-signed) to the webhook of the agent the event targets.
--
-- NOTE: the X-Dispatch-Secret value below is a placeholder. the applied
-- version uses the real secret matching the DISPATCH_SECRET env var on
-- vercel — set it there and substitute before running this by hand.

alter table public.agents add column if not exists webhook_url text;
alter table public.agents add column if not exists webhook_secret text;

create extension if not exists pg_net;

create or replace function public.dispatch_event() returns trigger
language plpgsql security definer as $$
begin
  perform net.http_post(
    url := 'https://iphone-app-five.vercel.app/api/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Dispatch-Secret', '__DISPATCH_SECRET__'
    ),
    body := to_jsonb(new)
  );
  return new;
end $$;

drop trigger if exists events_dispatch on public.events;
create trigger events_dispatch after insert on public.events
  for each row execute function public.dispatch_event();
