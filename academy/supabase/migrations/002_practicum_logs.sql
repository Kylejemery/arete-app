-- PHIL 706 anger practicum + PHIL 707 digital fast log.
-- One row per logged event; the event payload lives in `episode` jsonb with a
-- `type` discriminator:
--   'episode'        — anger practicum episode (706): flash, judgment,
--                      offenders_good, corrected_response, assent
--   'evening_review' — nightly Sextius audit (706)
--   'fast_scheduled' — fast protocol scheduled (707): form, start/end dates,
--                      exceptions, substitutions
--   'fast_day'       — daily fast log (707): reaches, weather, collisions
--   'fast_review'    — fast completion review (707) — gates the 707 capstone
-- Aggregate trends surface on /dashboard/practicum; recent entries are
-- injected into the Proctor's context on the PHIL 706 course page.

create table if not exists public.practicum_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  episode jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.practicum_logs enable row level security;

create policy "practicum_logs_select_own" on public.practicum_logs
  for select using (auth.uid() = user_id);

create policy "practicum_logs_insert_own" on public.practicum_logs
  for insert with check (auth.uid() = user_id);

create policy "practicum_logs_update_own" on public.practicum_logs
  for update using (auth.uid() = user_id);

create policy "practicum_logs_delete_own" on public.practicum_logs
  for delete using (auth.uid() = user_id);

create policy "practicum_logs_admin_select" on public.practicum_logs
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create index if not exists practicum_logs_user_course_idx
  on public.practicum_logs (user_id, course_id, created_at desc);
