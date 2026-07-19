-- migration 27: connectors as data — the feeds table. each row declares an
-- external JSON API + a mapping into vars/dataset rows; the generic runner
-- (/api/feeds, called by the migration-26 cron) executes whatever is
-- configured. agents manage rows via add_feed/list_feeds/delete_feed MCP
-- tools. connecting a new API never touches production code.

create table if not exists public.feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  url text not null,
  interval_minutes int not null default 10 check (interval_minutes between 5 and 1440),
  map jsonb not null default '[]',
  dataset jsonb,
  expand jsonb,
  enabled boolean not null default true,
  created_by text,
  last_run_at timestamptz,
  last_status text,
  created_at timestamptz not null default now(),
  unique (user_id, name),
  constraint feeds_name_charset check (name ~ '^[a-z0-9][a-z0-9-_]{0,39}$')
);

alter table public.feeds enable row level security;

drop policy if exists "feeds own rows" on public.feeds;
create policy "feeds own rows" on public.feeds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- the runner picks due feeds itself, so tick more often than the smallest
-- allowed interval (upserts the migration-26 job by name)
select cron.schedule('refresh-feeds', '*/5 * * * *', 'select public.refresh_feeds()');
