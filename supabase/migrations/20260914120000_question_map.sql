-- The question map (docs/corpus/ACQUISITION_PLAN.md, Part 2) as data.
--
-- "Acquire positions, not authors." The plan's rule 4 (Part 5) says every
-- new work is registered against the questions it bears on, with a position
-- and a role. Until now that registration existed only as prose in the plan;
-- nothing in the schema could hold it, so the eight papers ingested on
-- 2026-09-14 (all squarely on Q07, Q02/Q12, Q14, Q15) went in unregistered.
--
-- corpus_questions               the fifteen questions, seeded from Part 2.
-- corpus_question_registrations  one row per (question, work): the position
--                                the work takes and its argumentative role.
-- paper_submissions.question_registrations
--                                the Paper Agent's proposal, edited at review,
--                                written to the registrations table on ingest
--                                and removed on de-ingest.
--
-- Roles are locked by a check constraint; a new role is a migration.

create table if not exists public.corpus_questions (
  id text primary key,                          -- 'Q07'
  question text not null,
  stoic_position text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.corpus_question_registrations (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.corpus_questions(id),
  author text not null,                         -- matches rag_corpus.author
  work text not null,                           -- matches rag_corpus.work
  position text not null,                       -- the work's position, one line
  role text not null check (role in ('states', 'defends', 'attacks', 'complicates')),
  note text,
  source text not null default 'manual',        -- 'paper_agent' | 'manual' | 'corpus_agent'
  created_at timestamptz not null default now(),
  unique (question_id, author, work)
);

create index if not exists corpus_question_registrations_work_idx
  on public.corpus_question_registrations (author, work);

alter table public.corpus_questions enable row level security;
alter table public.corpus_question_registrations enable row level security;
-- No policies: service role only, like paper_submissions.

alter table public.paper_submissions
  add column if not exists question_registrations jsonb;

insert into public.corpus_questions (id, question, stoic_position, sort_order) values
  ('Q01', 'Is the cosmos rational and providentially ordered?', 'Yes; the cosmos is a living rational being', 1),
  ('Q02', 'Is the soul corporeal?', 'Yes; only bodies act', 2),
  ('Q03', 'Can perception deliver certainty?', 'Yes; the cognitive impression is the criterion', 3),
  ('Q04', 'Does virtue suffice for happiness?', 'Yes', 4),
  ('Q05', 'Are emotions mistaken judgments, to be extirpated?', 'Yes', 5),
  ('Q06', 'Can an ought be derived from nature?', 'Yes; physics grounds ethics', 6),
  ('Q07', 'Is moral responsibility compatible with fate?', 'Yes; assent is co-fated', 7),
  ('Q08', 'What is the relation of an individual mind to the whole?', 'A fragment of the divine reason', 8),
  ('Q09', 'Does the good life require fortune or external goods?', 'No', 9),
  ('Q10', 'Should the philosopher engage in politics?', 'Yes, with reservation', 10),
  ('Q11', 'What, if anything, survives death?', 'Dispersal into the elements', 11),
  ('Q12', 'Is mind fundamental or derivative of arrangement?', 'Pneuma is basic and graded', 12),
  ('Q13', 'Is the sage possible, and has anyone been one?', 'In principle yes, in fact almost never', 13),
  ('Q14', 'Is philosophy a body of doctrine or a way of life?', 'A way of life', 14),
  ('Q15', 'Are all wrongdoers acting in ignorance?', 'Yes; Socratic intellectualism', 15)
on conflict (id) do nothing;
