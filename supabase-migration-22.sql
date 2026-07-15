-- migration 22: components — each user's own component library (shadcn-for-tipas).
-- agents define a component once (code + props schema), then instance it across
-- pages with a 'component' block. updating the component updates every instance.

create table if not exists public.components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  props_schema jsonb default '{}'::jsonb,
  code text not null,
  created_by text default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, name)
);

alter table public.components enable row level security;

drop policy if exists "components: own rows only" on public.components;
create policy "components: own rows only" on public.components
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- realtime so component edits hot-swap every rendered instance
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'components') then
    alter publication supabase_realtime add table public.components;
  end if;
end $$;
