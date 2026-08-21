-- Playground: the Kosmopolis ledger — a shared mythology of one world.
--
-- Kosmopolis is a simulated world whose physics reward virtue. Most of it runs
-- in the browser and leaves no trace. But two acts are worth remembering across
-- every visitor, so a named history accrues over time:
--
--   * an AWAKENING — a soul is given reason by the Oracle and deliberates its
--     way to a virtuous act (author_role of the reflection is the corpus);
--   * a COUNSEL — a visitor advises a soul through one of the Cabinet voices,
--     and that voice answers.
--
-- Each row is one remembered life-moment. The world itself is ephemeral; this
-- table is the annals that outlast any single world.
--
-- RLS mirrors playground_comments: anyone may READ (it is a public surface),
-- and only the server writes, via the service-role key which bypasses RLS.
-- There is deliberately no anon INSERT policy — the browser can never write a
-- life directly, which keeps the Oracle reflection and the shared rate limit
-- under server control.

create table if not exists public.kosmopolis_lives (
  id            uuid primary key default gen_random_uuid(),
  -- what kind of moment this was
  kind          text not null default 'awakening'
                check (kind in ('awakening', 'counsel')),
  -- the soul it happened to
  soul_name     text not null check (char_length(soul_name) between 1 and 80),
  -- the age of the world it happened in, and the soul's standing then
  epoch         text,
  world_year    integer,
  arete         real,           -- the soul's overall virtue at the moment (0..1)
  virtue        text            -- the cardinal virtue exercised / strengthened
                check (virtue in ('wisdom', 'justice', 'courage', 'temperance')),
  -- for a counsel: who advised (a Cabinet voice), and what they urged
  counselor     text,
  advice        text check (advice is null or char_length(advice) <= 2000),
  -- the reflection the Oracle / counselor spoke
  reflection    text not null check (char_length(reflection) between 1 and 8000),
  created_at    timestamptz not null default now()
);

create index if not exists kosmopolis_lives_recent_idx
  on public.kosmopolis_lives (created_at desc);

alter table public.kosmopolis_lives enable row level security;

drop policy if exists "kosmopolis_lives public read" on public.kosmopolis_lives;
create policy "kosmopolis_lives public read"
  on public.kosmopolis_lives
  for select
  using (true);
