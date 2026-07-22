-- The Interlocutor — a teacher of philosophical writing.
--
-- Two tables. `critique_history` is the raw record: one row per critique, written
-- at critique time by /api/interlocutor/critique. `writing_profile` is derived
-- FROM that history on a schedule (the Longitudinal User Model pattern), one row
-- per student, rewritten in place. Nothing writes the profile inline at critique
-- time: the derivation job holds the service role key and bypasses RLS, so no
-- client-side write policy exists for it.
--
-- The profile is what makes the agent a teacher rather than a critic. It is
-- injected into the system prompt before the student's submission so the agent
-- can name patterns ("the fourth time in six weeks") instead of correcting
-- instances.

create table if not exists public.critique_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- The passage actually submitted: a selection or a whole draft.
  excerpt       text not null,
  -- Rubric dimensions the critique cited: thesis, validity, soundness,
  -- charity, economy, fidelity. Free text array rather than an enum so the
  -- rubric can grow without a migration.
  dimensions_flagged text[] not null default '{}',
  -- The full agent response, markdown.
  critique      text not null,
  piece_title   text,
  created_at    timestamptz not null default now()
);

create table if not exists public.writing_profile (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  -- [{ dimension, description, first_seen, last_seen, count }]
  recurring_failures jsonb not null default '[]',
  -- Dimensions the student has demonstrably solved. A cleared standard is
  -- assumed, not praised, and never allowed to slip back unremarked.
  cleared_standards  jsonb not null default '[]',
  -- [{ strength, evidence }]
  strengths          jsonb not null default '[]',
  -- The one thing to press on now.
  current_edge       text,
  pieces_reviewed    int not null default 0,
  updated_at         timestamptz not null default now()
);

alter table public.critique_history enable row level security;
alter table public.writing_profile  enable row level security;

-- Critique history: the student owns their record and may browse it.
create policy "critique_history_select_own" on public.critique_history
  for select using (auth.uid() = user_id);

create policy "critique_history_insert_own" on public.critique_history
  for insert with check (auth.uid() = user_id);

create policy "critique_history_delete_own" on public.critique_history
  for delete using (auth.uid() = user_id);

-- No update policy: a critique is a record of what was said, not a document.

create policy "critique_history_admin_select" on public.critique_history
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Writing profile: read-only to the student. Written only by the derivation
-- job (service role).
create policy "writing_profile_select_own" on public.writing_profile
  for select using (auth.uid() = user_id);

create policy "writing_profile_admin_select" on public.writing_profile
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create index if not exists critique_history_user_created_idx
  on public.critique_history (user_id, created_at desc);
