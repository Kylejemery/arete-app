-- The Seminar Track: Academy courses built from works Kyle has gathered,
-- defined in the database rather than in academy/web/src/data/*.ts so the
-- Seminar Builder can create them at runtime. Spec: the Seminar Track build
-- spec, Part 1.
--
-- Course ids are 'sem-NNN'. They never reuse the phil-701 to phil-712
-- identifiers or the stoicism-phd program id. Progress and Proctor sessions
-- reuse academy_sessions and session_progress with course_id = 'sem-NNN'
-- (both key on a free text course_id), so there are no new progress tables.
--
-- Visibility, all tables RLS on:
--   * the service role writes everything (the builder runs server side);
--   * admins (profiles.is_admin) read everything, drafts included;
--   * a signed in member reads a published course whose tier_required their
--     standing meets, its published units, those units' readings and
--     questions, and only approved, active transcripts.
-- Standing follows lib/entitlement.ts: profiles.tier + is_premium mapped onto
-- the Academy's auditor < scholar < fellow.
--
-- Licence never lives here. seminar_readings.access says what the reading
-- pane may show; full texts stay in rag_corpus (public domain) or
-- research_sources (service role only).

-- Academy standing of the signed in user, as an auditor/scholar/fellow rank.
create or replace function public.seminar_member_rank()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
      when lower(coalesce(p.tier, '')) = 'pro' then 2
      when lower(coalesce(p.tier, '')) in ('premium', 'arete', 'scholar') or p.is_premium then 1
      else 0
    end
    from profiles p where p.id = auth.uid()
  ), -1)
$$;

create or replace function public.seminar_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

revoke all on function public.seminar_member_rank() from public, anon;
revoke all on function public.seminar_is_admin() from public, anon;
grant execute on function public.seminar_member_rank() to authenticated;
grant execute on function public.seminar_is_admin() to authenticated;

create table public.seminar_courses (
  id             text primary key check (id ~ '^sem-[0-9]{3}$'),
  title          text not null,
  subtitle       text,
  description    text,
  stance         text not null check (stance in ('aligned', 'counterposition', 'mixed')),
  status         text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  tier_required  text not null default 'scholar' check (tier_required in ('auditor', 'scholar', 'fellow')),
  source_works   jsonb not null default '[]'::jsonb check (jsonb_typeof(source_works) = 'array'),
  objectives     jsonb not null default '[]'::jsonb check (jsonb_typeof(objectives) = 'array'),
  -- Builder state (Part 4): Kyle's one paragraph intent, and the Syllabus
  -- agent's proposal while he edits it. Approval turns the proposal into
  -- seminar_units and seminar_readings rows.
  intent         text,
  syllabus_draft jsonb,
  created_at     timestamptz not null default now(),
  published_at   timestamptz
);

create table public.seminar_units (
  id            uuid primary key default gen_random_uuid(),
  course_id     text not null references public.seminar_courses(id),
  unit_number   integer not null check (unit_number >= 1),
  title         text not null,
  objectives    jsonb not null default '[]'::jsonb check (jsonb_typeof(objectives) = 'array'),
  key_concepts  text[] not null default '{}',
  proctor_brief text,
  status        text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  created_at    timestamptz not null default now(),
  unique (course_id, unit_number)
);

-- `position` is the spec's `order` (a reserved word in SQL).
create table public.seminar_readings (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.seminar_units(id),
  position      integer not null check (position >= 1),
  author        text not null,
  work          text not null,
  locator       text not null,
  role          text not null check (role in ('assigned', 'counter_reading', 'optional')),
  access        text not null check (access in ('full_text_corpus', 'own_copy', 'admin_private')),
  rag_chunk_ids uuid[] not null default '{}',
  -- admin_private readings name the research_sources row and the section of
  -- its locator index; the text itself is fetched server side, admins only.
  research_source_id uuid references public.research_sources(id),
  research_section_key text,
  reading_guide text,
  created_at    timestamptz not null default now(),
  unique (unit_id, position),
  check (access <> 'admin_private' or research_source_id is not null),
  check (access <> 'full_text_corpus' or cardinality(rag_chunk_ids) > 0)
);

create table public.seminar_transcripts (
  id               uuid primary key default gen_random_uuid(),
  unit_id          uuid not null references public.seminar_units(id),
  version          integer not null check (version >= 1),
  is_active        boolean not null default false,
  speakers         jsonb not null default '[{"key":"tutor","display":"Tutor","voice_id":null},{"key":"student","display":"Student","voice_id":null}]'::jsonb,
  turns            jsonb not null default '[]'::jsonb check (jsonb_typeof(turns) = 'array'),
  word_count       integer,
  est_minutes      integer,
  review_status    text not null default 'draft' check (review_status in ('draft', 'approved', 'rejected')),
  review_notes     text,
  -- Part 6 verification results, and the fence classifier's flagged turns
  -- with Kyle's clearances. Approval is refused while a flag is uncleared.
  checks           jsonb not null default '{}'::jsonb,
  -- Part 5, schema only: audio is not built in the first pass.
  audio_status     text not null default 'none' check (audio_status in ('none', 'queued', 'ready', 'failed')),
  audio_url        text,
  audio_duration_s integer,
  generation_model text,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (unit_id, version),
  check (not is_active or review_status = 'approved')
);

create unique index seminar_transcripts_one_active
  on public.seminar_transcripts (unit_id) where is_active;

create table public.seminar_questions (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.seminar_units(id),
  position      integer not null check (position >= 1),
  type          text not null check (type in ('recall', 'analysis', 'cross_examination', 'application')),
  prompt        text not null,
  rubric        jsonb not null default '{}'::jsonb,
  review_status text not null default 'draft' check (review_status in ('draft', 'approved', 'rejected')),
  created_at    timestamptz not null default now(),
  unique (unit_id, position)
);

create index seminar_units_course_idx on public.seminar_units (course_id);
create index seminar_readings_unit_idx on public.seminar_readings (unit_id);
create index seminar_transcripts_unit_idx on public.seminar_transcripts (unit_id);
create index seminar_questions_unit_idx on public.seminar_questions (unit_id);

alter table public.seminar_courses enable row level security;
alter table public.seminar_units enable row level security;
alter table public.seminar_readings enable row level security;
alter table public.seminar_transcripts enable row level security;
alter table public.seminar_questions enable row level security;

-- A course a member may read: published and within their standing.
create or replace function public.seminar_course_visible(p_course text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select seminar_is_admin() or exists (
    select 1 from seminar_courses c
    where c.id = p_course
      and c.status = 'published'
      and seminar_member_rank() >= case c.tier_required when 'auditor' then 0 when 'scholar' then 1 else 2 end
  )
$$;

create or replace function public.seminar_unit_visible(p_unit uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select seminar_is_admin() or exists (
    select 1 from seminar_units u
    where u.id = p_unit and u.status = 'published' and seminar_course_visible(u.course_id)
  )
$$;

revoke all on function public.seminar_course_visible(text) from public, anon;
revoke all on function public.seminar_unit_visible(uuid) from public, anon;
grant execute on function public.seminar_course_visible(text) to authenticated;
grant execute on function public.seminar_unit_visible(uuid) to authenticated;

create policy "Seminar courses: entitled members read published"
  on public.seminar_courses for select to authenticated
  using (seminar_course_visible(id));

create policy "Seminar units: entitled members read published"
  on public.seminar_units for select to authenticated
  using (seminar_unit_visible(id));

create policy "Seminar readings: visible with their unit"
  on public.seminar_readings for select to authenticated
  using (seminar_unit_visible(unit_id));

create policy "Seminar questions: approved, visible with their unit"
  on public.seminar_questions for select to authenticated
  using (seminar_is_admin() or (review_status = 'approved' and seminar_unit_visible(unit_id)));

create policy "Seminar transcripts: approved and active, visible with their unit"
  on public.seminar_transcripts for select to authenticated
  using (seminar_is_admin() or (review_status = 'approved' and is_active and seminar_unit_visible(unit_id)));

revoke insert, update, delete on public.seminar_courses, public.seminar_units, public.seminar_readings,
  public.seminar_transcripts, public.seminar_questions from anon, authenticated;
revoke all on public.seminar_courses, public.seminar_units, public.seminar_readings,
  public.seminar_transcripts, public.seminar_questions from anon;

comment on table public.seminar_courses is
  'Seminar Track courses (sem-NNN). Service role writes; members read published courses within their standing; admins read all.';
comment on table public.seminar_transcripts is
  'Two voice seminar transcripts per unit. Members see only review_status = approved and is_active. checks holds Part 6 verification; audio_* is schema only until Part 5 is built.';
