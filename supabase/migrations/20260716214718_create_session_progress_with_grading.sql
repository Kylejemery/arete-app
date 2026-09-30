-- Quiz progress + AI grading for Arete Academy course sessions.
-- The web app has been upserting to this table since the quiz feature shipped,
-- but it was never created; this migration creates it with the grading columns.
create table public.session_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  session_id integer not null,
  -- not_started | completed (legacy: awaiting manual review) | passed | failed
  status text not null default 'not_started',
  submitted_answers jsonb,
  -- Per-question AI grading: [{index, verdict, feedback}] (verdict: correct|partial|incorrect)
  grading jsonb,
  -- Percentage score 0-100 from the graded submission
  score numeric,
  admin_notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, session_id)
);

alter table public.session_progress enable row level security;

create policy "Users can read own progress"
  on public.session_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.session_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.session_progress for update
  using (auth.uid() = user_id);

-- Admins (profiles.is_admin) can read and update all rows for faculty review
create policy "Admins can read all progress"
  on public.session_progress for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "Admins can update all progress"
  on public.session_progress for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
