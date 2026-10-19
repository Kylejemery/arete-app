-- Playground: ranked Kosmopolis runs, for the daily world and the scenarios.
--
-- Phase 3 of the Kosmopolis game. A daily world (the same planet, towns, and
-- founding souls for every visitor on a given UTC date) and each authored
-- scenario has a board. When the ranked cycle of such a world closes, a
-- signed-in visitor's score is posted here; the board shows each visitor's best.
--
-- Written and read only by the server (the academy API route, with the service
-- role), so RLS is on with no policies: no client reads user_id, and the board
-- returns names and scores only. author_name is the profile handle at posting
-- time, as kosmopolis_lives keeps it.

create table if not exists public.kosmopolis_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  board       text not null check (board ~ '^(daily:[0-9]{4}-[0-9]{2}-[0-9]{2}|scenario:[a-z0-9-]{1,40})$'),
  school      text not null check (school in ('stoa', 'garden', 'lyceum', 'cynic')),
  run_end     text not null check (run_end in ('concord', 'stasis', 'great-year')),
  score       integer not null check (score between 0 and 20000),
  run_years   integer not null check (run_years between 0 and 600),
  created_at  timestamptz not null default now()
);

create index if not exists kosmopolis_runs_board_score_idx
  on public.kosmopolis_runs (board, score desc);

create index if not exists kosmopolis_runs_user_board_idx
  on public.kosmopolis_runs (user_id, board, created_at desc);

alter table public.kosmopolis_runs enable row level security;
