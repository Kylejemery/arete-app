-- Socratic Proctor Evaluator architecture.
-- Objective definitions live in code (src/data/objectives.ts, versioned with
-- course content); these tables hold per-student status and the audit trail.

create table public.objective_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_id text not null,       -- e.g. 'phil701-s3-obj2'
  status text not null check (status in ('not_demonstrated','partial','demonstrated')),
  evidence jsonb,                   -- [{student_quote, turn}]
  assessment_note text,
  misconceptions jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, objective_id)
);
alter table public.objective_status enable row level security;
create policy "own objective status select" on public.objective_status for select using (auth.uid() = user_id);
create policy "own objective status insert" on public.objective_status for insert with check (auth.uid() = user_id);
create policy "own objective status update" on public.objective_status for update using (auth.uid() = user_id);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  session_id integer not null,
  raw_response jsonb not null,      -- full evaluator output, audit trail
  turn_count integer,
  created_at timestamptz not null default now()
);
create index evaluations_user_session_idx on public.evaluations (user_id, course_id, session_id, created_at desc);
alter table public.evaluations enable row level security;
create policy "own evaluations select" on public.evaluations for select using (auth.uid() = user_id);
create policy "own evaluations insert" on public.evaluations for insert with check (auth.uid() = user_id);
