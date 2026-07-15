-- migration 19: reconcile the live schema with the code.
-- the original tables were created by hand (title/content/position, no user_id)
-- and migration 18's "create table if not exists" silently no-op'd against them.
-- this renames columns to what the app expects, adds ownership, and replaces
-- the public-read policies with own-rows RLS.

-- 1) renames (guarded so this is idempotent)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='spaces' and column_name='title') then
    alter table public.spaces rename column title to name;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='spaces' and column_name='position') then
    alter table public.spaces rename column position to sort_order;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='blocks' and column_name='content'
               and data_type='jsonb') then
    alter table public.blocks rename column content to props;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='blocks' and column_name='position') then
    alter table public.blocks rename column position to sort_order;
  end if;
end $$;

-- slug predates the code and is unused by it; keep the column but never require it
alter table public.spaces alter column slug drop not null;

-- 2) ownership + missing columns
alter table public.spaces  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.spaces  add column if not exists created_by text default 'user';
alter table public.blocks  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.blocks  add column if not exists parent_id uuid;
alter table public.blocks  add column if not exists visible boolean default true;
alter table public.blocks  add column if not exists created_by text default 'user';
alter table public.messages add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.messages add column if not exists metadata jsonb default '{}'::jsonb;

-- backfill: signup is disabled, there is exactly one user
update public.spaces   set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.blocks   set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.messages set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;

alter table public.spaces   alter column user_id set not null;
alter table public.blocks   alter column user_id set not null;
alter table public.messages alter column user_id set not null;

-- 3) indexes on the reconciled names
create index if not exists spaces_user_sort_idx on public.spaces(user_id, sort_order);
create index if not exists blocks_space_sort_idx on public.blocks(space_id, sort_order);
create index if not exists blocks_user_space_idx on public.blocks(user_id, space_id);
create index if not exists messages_user_created_idx on public.messages(user_id, created_at);

-- 4) replace public-read policies with own-rows RLS
drop policy if exists "public read spaces" on public.spaces;
drop policy if exists "public read blocks" on public.blocks;
drop policy if exists "public read messages" on public.messages;
drop policy if exists "public insert messages" on public.messages;
drop policy if exists "public read config" on public.user_config;

drop policy if exists "spaces: own rows only" on public.spaces;
create policy "spaces: own rows only" on public.spaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "blocks: own rows only" on public.blocks;
create policy "blocks: own rows only" on public.blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages: own rows only" on public.messages;
create policy "messages: own rows only" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
