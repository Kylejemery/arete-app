-- Playground: multiple saved Kosmopolis worlds per signed-in visitor.
--
-- Supersedes the single-world kosmopolis_worlds table: a visitor can now keep
-- several named worlds and switch between them. Each row is one saved world (the
-- serialized simulation as jsonb). Owner-only RLS: a visitor reads and writes
-- only their own rows, through their cookie session. Anonymous visitors keep
-- their worlds in the browser's localStorage instead.
--
-- kosmopolis_worlds is left in place (unused going forward) rather than dropped,
-- so nothing is lost for anyone who saved in the brief window it was live.

create table if not exists public.kosmopolis_saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  state       jsonb not null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists kosmopolis_saves_owner_idx
  on public.kosmopolis_saves (user_id, updated_at desc);

alter table public.kosmopolis_saves enable row level security;

drop policy if exists "kosmopolis_saves owner read" on public.kosmopolis_saves;
create policy "kosmopolis_saves owner read"
  on public.kosmopolis_saves for select using (auth.uid() = user_id);

drop policy if exists "kosmopolis_saves owner insert" on public.kosmopolis_saves;
create policy "kosmopolis_saves owner insert"
  on public.kosmopolis_saves for insert with check (auth.uid() = user_id);

drop policy if exists "kosmopolis_saves owner update" on public.kosmopolis_saves;
create policy "kosmopolis_saves owner update"
  on public.kosmopolis_saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "kosmopolis_saves owner delete" on public.kosmopolis_saves;
create policy "kosmopolis_saves owner delete"
  on public.kosmopolis_saves for delete using (auth.uid() = user_id);
