-- Playground: per-user Kosmopolis worlds, and attribution for the ledger.
--
-- Two things here make Kosmopolis persist for a signed-in visitor:
--
--   1. kosmopolis_worlds — one saved world per user (the serialized simulation
--      as jsonb). Owner-only RLS: a user reads and writes only their own row,
--      through their cookie session. Anonymous visitors never touch this table;
--      their world lives in the browser's localStorage instead.
--
--   2. attribution columns on kosmopolis_lives — a nullable user_id and a
--      display author_name, so an awakening or counsel can be remembered under
--      the name of the signed-in visitor who caused it. Anonymous acts leave
--      both null and read as "a wanderer", exactly as before.

create table if not exists public.kosmopolis_worlds (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.kosmopolis_worlds enable row level security;

-- Owner-only: the signed-in user is the only one who can see or change their world.
drop policy if exists "kosmopolis_worlds owner read" on public.kosmopolis_worlds;
create policy "kosmopolis_worlds owner read"
  on public.kosmopolis_worlds
  for select
  using (auth.uid() = user_id);

drop policy if exists "kosmopolis_worlds owner insert" on public.kosmopolis_worlds;
create policy "kosmopolis_worlds owner insert"
  on public.kosmopolis_worlds
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "kosmopolis_worlds owner update" on public.kosmopolis_worlds;
create policy "kosmopolis_worlds owner update"
  on public.kosmopolis_worlds
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "kosmopolis_worlds owner delete" on public.kosmopolis_worlds;
create policy "kosmopolis_worlds owner delete"
  on public.kosmopolis_worlds
  for delete
  using (auth.uid() = user_id);

-- Attribution for the shared annals (both nullable; anonymous acts stay null).
alter table public.kosmopolis_lives
  add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.kosmopolis_lives
  add column if not exists author_name text;
