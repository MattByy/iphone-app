-- migration 24: agent token lifecycle + input hygiene
-- tokens become revocable and expirable; agent names get a DB-level charset
-- guarantee (they are interpolated into PostgREST or-filters).

alter table public.agents add column if not exists revoked_at timestamptz;
alter table public.agents add column if not exists expires_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agents_name_charset') then
    alter table public.agents
      add constraint agents_name_charset check (name ~ '^[a-z0-9][a-z0-9_-]{1,39}$');
  end if;
end $$;
