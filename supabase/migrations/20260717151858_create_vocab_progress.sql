-- Spaced-repetition state for the Academy vocabulary drill (GREK/LATN decks).
-- One row per (user, card); SM-2-lite scheduling fields.
create table public.vocab_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,          -- e.g. 'g-12-3' (greek, session 12, item 3) / 'l-4-0'
  ease numeric not null default 2.5,
  interval_days numeric not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  due_at timestamptz not null default now(),
  last_grade text,                -- again | hard | good | easy
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index vocab_progress_due_idx on public.vocab_progress (user_id, due_at);

alter table public.vocab_progress enable row level security;

create policy "Users manage own vocab progress — select"
  on public.vocab_progress for select using (auth.uid() = user_id);
create policy "Users manage own vocab progress — insert"
  on public.vocab_progress for insert with check (auth.uid() = user_id);
create policy "Users manage own vocab progress — update"
  on public.vocab_progress for update using (auth.uid() = user_id);
create policy "Users manage own vocab progress — delete"
  on public.vocab_progress for delete using (auth.uid() = user_id);
