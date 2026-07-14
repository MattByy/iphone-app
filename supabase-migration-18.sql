-- migration 18: tipas core tables (user_config, spaces, blocks, messages)

create table if not exists public.user_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nav jsonb default '{}'::jsonb,
  theme jsonb default '{}'::jsonb,
  settings jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  "order" integer default 0,
  created_by text default 'user',
  created_at timestamptz default now()
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete cascade,
  type text not null,
  props jsonb default '{}'::jsonb,
  "order" integer default 0,
  parent_id uuid,
  visible boolean default true,
  created_by text default 'user',
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- indexes
create index if not exists blocks_user_space_idx on public.blocks(user_id, space_id);
create index if not exists messages_user_created_idx on public.messages(user_id, created_at);
create index if not exists spaces_user_order_idx on public.spaces(user_id, "order");

-- RLS
alter table public.user_config enable row level security;
alter table public.spaces enable row level security;
alter table public.blocks enable row level security;
alter table public.messages enable row level security;

-- policies: users can only see and modify their own rows
create policy "user_config: own rows only" on public.user_config
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "spaces: own rows only" on public.spaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "blocks: own rows only" on public.blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages: own rows only" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- realtime
alter publication supabase_realtime add table public.spaces;
alter publication supabase_realtime add table public.blocks;
alter publication supabase_realtime add table public.messages;
