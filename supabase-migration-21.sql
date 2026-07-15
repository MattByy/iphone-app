-- migration 21: datasets — the flexible data plane agents and scripts write into.
-- canvas blocks and future widgets read these live; ingest webhooks feed them.

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_by text default 'user',
  created_at timestamptz default now(),
  unique (user_id, name)
);

create table if not exists public.dataset_rows (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  ts timestamptz default now()
);

create index if not exists dataset_rows_dataset_ts_idx on public.dataset_rows(dataset_id, ts desc);

alter table public.datasets enable row level security;
alter table public.dataset_rows enable row level security;

drop policy if exists "datasets: own rows only" on public.datasets;
create policy "datasets: own rows only" on public.datasets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "dataset_rows: own rows only" on public.dataset_rows;
create policy "dataset_rows: own rows only" on public.dataset_rows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- realtime so canvas blocks update the moment new data lands
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'datasets') then
    alter publication supabase_realtime add table public.datasets;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'dataset_rows') then
    alter publication supabase_realtime add table public.dataset_rows;
  end if;
end $$;
