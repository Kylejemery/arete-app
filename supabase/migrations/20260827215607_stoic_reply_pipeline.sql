-- Stoic Reply Pipeline v0.1
-- Discovery -> safety gate -> scoring -> drafting -> human review queue.
-- Nothing in these tables is ever surfaced to users or posted automatically:
-- the only consumer is the admin review UI, and posting is a manual paste.

-- One row per discovered post. The unique index doubles as the dedupe ledger
-- ("seen_posts" in the source spec): a re-run can never resurface a post that
-- was already fetched, whatever its status ended up being.
create table if not exists reply_candidates (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('hn', 'bluesky', 'reddit')),
  platform_post_id text not null,
  author_handle text not null,
  permalink text not null,
  body text not null,
  parent_context text,
  comment_count integer,
  matched_query text,
  posted_at timestamptz not null,
  fetched_at timestamptz not null default now(),

  -- raw            -> fetched, not yet triaged
  -- rejected_safety -> Haiku gate said EXIT; terminal, never re-evaluated
  -- rejected_score  -> scored below the promotion threshold; terminal
  -- promoted        -> passed both gates, awaiting a draft
  -- drafted         -> a reply_drafts row exists
  -- declined        -> the drafter honestly had nothing Stoic to offer; terminal
  status text not null default 'raw'
    check (status in ('raw', 'rejected_safety', 'rejected_score', 'promoted', 'drafted', 'declined')),

  -- Safety gate (stage 2a). exit_reason doubles as the rejection reason for
  -- rejected_score rows and the decline reason for declined rows.
  exit_reason text,

  -- Relevance scoring (stage 2b)
  stoic_fit smallint check (stoic_fit between 0 and 10),
  doctrine text,
  openness smallint check (openness between 0 and 10),
  already_answered boolean,
  triage_reasoning text,
  triaged_at timestamptz,

  unique (platform, platform_post_id)
);

create index if not exists reply_candidates_status_idx on reply_candidates (status);
-- Supports the never-reply-twice-to-an-author-within-30-days rule.
create index if not exists reply_candidates_author_idx on reply_candidates (author_handle);

-- One row per drafted reply, pending Kyle's approval. Posting is manual on
-- purpose: Approve copies final_text to the clipboard and opens the permalink.
create table if not exists reply_drafts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references reply_candidates (id) on delete cascade,
  draft_text text not null,
  doctrine text,
  passages jsonb,      -- the retrieved passages shown to the drafter
  passage_used text,   -- the drafter's note on which passage grounded the reply
  model text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'edited', 'rejected')),
  final_text text,
  -- The fixed reject list is the training signal for triage-prompt revisions.
  reject_reason text
    check (reject_reason in ('not_relevant', 'bad_draft', 'wrong_tone', 'too_late', 'unsafe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  posted_at timestamptz
);

create index if not exists reply_drafts_status_idx on reply_drafts (status);
create index if not exists reply_drafts_candidate_idx on reply_drafts (candidate_id);

-- Service-role only (the Railway agents and the admin API). No public policies.
alter table reply_candidates enable row level security;
alter table reply_drafts enable row level security;
