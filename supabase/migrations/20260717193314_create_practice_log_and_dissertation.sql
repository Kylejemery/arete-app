-- Practice log: one row per day per practice assignment checked in.
-- Streaks are computed client-side from log_date rows.
create table public.practice_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  session_id integer not null,
  log_date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, course_id, session_id, log_date)
);
create index practice_log_user_date_idx on public.practice_log (user_id, log_date desc);
alter table public.practice_log enable row level security;
create policy "own practice select" on public.practice_log for select using (auth.uid() = user_id);
create policy "own practice insert" on public.practice_log for insert with check (auth.uid() = user_id);
create policy "own practice delete" on public.practice_log for delete using (auth.uid() = user_id);

-- Dissertation track: one dissertation per user, with chaptered drafts.
create table public.dissertations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  title text,
  abstract text,
  -- proposal | proposal_approved | writing | defense | completed
  status text not null default 'proposal',
  proposal_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dissertations enable row level security;
create policy "own dissertation select" on public.dissertations for select using (auth.uid() = user_id);
create policy "own dissertation insert" on public.dissertations for insert with check (auth.uid() = user_id);
create policy "own dissertation update" on public.dissertations for update using (auth.uid() = user_id);

create table public.dissertation_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_number integer not null,
  title text not null default '',
  content text not null default '',
  -- draft | reviewed | approved
  status text not null default 'draft',
  feedback text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, chapter_number)
);
alter table public.dissertation_chapters enable row level security;
create policy "own chapters select" on public.dissertation_chapters for select using (auth.uid() = user_id);
create policy "own chapters insert" on public.dissertation_chapters for insert with check (auth.uid() = user_id);
create policy "own chapters update" on public.dissertation_chapters for update using (auth.uid() = user_id);
create policy "own chapters delete" on public.dissertation_chapters for delete using (auth.uid() = user_id);
