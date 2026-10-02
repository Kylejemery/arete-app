-- Stoic Life mode of the Synthesis Agent (part 2a): the topic backlog and
-- the one-draft-in-review rule. Part 2b adds the atomic claim a drafting run
-- makes and the config row for the mode.
--
-- Every topic needs approval from Kyle before a draft is written, and every
-- draft needs it before it is exported (synthesis_drafts). The agent drafts
-- when an approved topic is waiting and no Stoic Life draft is in review;
-- server/synthesis/modes/stoic-life.js.
--
-- Split from one file because the remote migration tool timed out on the
-- whole (the same SQL ran in milliseconds through a plain query).

begin;

create table if not exists public.synthesis_topics (
  id                   uuid primary key default gen_random_uuid(),
  mode                 text not null default 'stoic_life' check (mode in ('stoic_life')),
  title                text not null,
  original_title       text,                     -- what was proposed, when Kyle edits the title
  status               text not null default 'proposed'
                         check (status in ('proposed', 'approved', 'rejected', 'drafting', 'drafted')),
  source               text not null
                         check (source in ('seed', 'corpus_gap', 'primary_text', 'follow_on', 'journal_theme')),
  rationale            text not null,            -- one or two sentences: why this topic
  -- Counts, passage ids, the parent draft. Never the words of a member: corpus-gap
  -- and journal proposals carry counts only.
  evidence             jsonb not null default '{}'::jsonb,
  -- The latest approved world observation, noted for context. Never a reason
  -- for the topic.
  world_context        text,
  title_embedding      vector(1536),             -- for near-duplicate checks
  proposed_by_draft_id uuid references public.synthesis_drafts (id),
  review_notes         text,
  last_error           text,
  approved_at          timestamptz,
  reviewed_at          timestamptz,
  claimed_at           timestamptz,
  drafted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- A title is proposed once. A rejected title stays rejected rather than
-- coming back next week.
create unique index if not exists synthesis_topics_title_key
  on public.synthesis_topics (mode, lower(title));
create index if not exists synthesis_topics_status_idx
  on public.synthesis_topics (mode, status, approved_at);

comment on table public.synthesis_topics is
  'Topic backlog for the Synthesis Agent''s Stoic Life mode. Kyle approves, rejects, or retitles each proposal; only approved topics are drafted.';

alter table public.synthesis_topics enable row level security;
revoke all on public.synthesis_topics from anon, authenticated;

alter table public.synthesis_drafts
  drop constraint if exists synthesis_drafts_topic_id_fkey;
alter table public.synthesis_drafts
  add constraint synthesis_drafts_topic_id_fkey
  foreign key (topic_id) references public.synthesis_topics (id);

-- One Stoic Life draft in review at a time, so drafts do not pile up.
create unique index if not exists synthesis_drafts_one_stoic_life_in_review
  on public.synthesis_drafts (mode)
  where mode = 'stoic_life' and status in ('pending_review', 'edited');

commit;
