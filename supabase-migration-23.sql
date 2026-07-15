-- migration 23: vars — live named variables for artifacts.
-- an agent or script sets a variable (MCP set_vars or POST /api/vars) and every
-- canvas/component binding it ({{name}}, data-var, tipas.onVar) updates live.

create table if not exists public.vars (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_by text,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

alter table public.vars enable row level security;

drop policy if exists "vars: own rows only" on public.vars;
create policy "vars: own rows only" on public.vars
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'vars') then
    alter publication supabase_realtime add table public.vars;
  end if;
end $$;
