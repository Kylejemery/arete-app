-- Required Reading check-offs: a student marks an assigned reading as read.
-- One row per (student, course, session, reading). reading_key is the row's
-- "<source> || <passage>" text, the same key academy/web/src/data/reading-links.ts
-- uses. Unchecking sets done = false rather than deleting, so the history of
-- when a reading was first finished survives.

create table if not exists public.reading_checkoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  session_id integer not null,
  reading_key text not null,
  done boolean not null default true,
  first_done_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, session_id, reading_key)
);

create index if not exists reading_checkoffs_user_course_idx
  on public.reading_checkoffs (user_id, course_id);

alter table public.reading_checkoffs enable row level security;

create policy "Users read own reading checkoffs"
  on public.reading_checkoffs for select
  using (auth.uid() = user_id);

create policy "Users insert own reading checkoffs"
  on public.reading_checkoffs for insert
  with check (auth.uid() = user_id);

create policy "Users update own reading checkoffs"
  on public.reading_checkoffs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
