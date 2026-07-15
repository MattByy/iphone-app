-- migration 20: agents + events (the MCP surface)
-- agents: external MCP clients allowed to write to this surface.
-- raw tokens are never stored — only their sha256 hash.

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  created_at timestamptz default now(),
  last_seen_at timestamptz,
  unique (user_id, name)
);

alter table public.agents enable row level security;

drop policy if exists "agents: own rows only" on public.agents;
create policy "agents: own rows only" on public.agents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- events: human interactions (button taps, toggles, input submits) flowing
-- back to agents. agent = null means broadcast to every agent of that user.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent text,
  type text not null,
  payload jsonb default '{}'::jsonb,
  block_id uuid references public.blocks(id) on delete set null,
  created_at timestamptz default now(),
  acked_at timestamptz
);

create index if not exists events_unacked_idx
  on public.events(user_id, agent, created_at) where acked_at is null;

alter table public.events enable row level security;

drop policy if exists "events: own rows only" on public.events;
create policy "events: own rows only" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'events') then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;
