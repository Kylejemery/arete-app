-- The Interlocutor Studio — inline marked-up feedback + draft iteration.
--
-- Builds on 004_interlocutor.sql. Where 004 gave the agent a one-shot prose
-- critique and a derived writing_profile, this adds the surfaces that let a
-- student iterate: a persisted piece, an immutable snapshot per submission, and
-- annotations anchored to that snapshot.
--
-- Three tables:
--   writing_pieces   — one row per piece the student is working on. `stage` is
--                      reserved for the later guided-flow phase; it defaults to
--                      'draft' and nothing reads it yet.
--   piece_drafts     — one immutable snapshot per submission. Annotations anchor
--                      to a specific version by character offset, so a later edit
--                      never drifts an existing markup: the student revises into a
--                      NEW version instead.
--   draft_annotations— one marked-up span per row: offsets into the draft's
--                      content, the rubric dimension, a severity, the teaching
--                      comment, and an optional concrete rewrite `suggestion`.
--
-- critique_history (from 004) is still written by the annotate route, one row per
-- pass, so the nightly writing_profile derivation keeps working untouched.
--
-- RLS mirrors 004: the student owns their rows; admins may read. Offsets are
-- computed server-side from the model's verbatim quotes, never trusted from the
-- model, so a client never needs to write annotations directly (insert stays
-- server-side under the user's session); the student may still update status
-- (accept / dismiss) and delete their own work.

create table if not exists public.writing_pieces (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  -- Reserved for the guided stage flow (thesis|outline|draft|revise|polish).
  -- Free text with a default rather than an enum so the flow can grow without a
  -- migration; nothing reads it yet.
  stage       text not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.piece_drafts (
  id          uuid primary key default gen_random_uuid(),
  piece_id    uuid not null references public.writing_pieces(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- 1-based, contiguous per piece. Unique so a double-submit cannot fork history.
  version     int not null,
  -- The immutable snapshot the annotations anchor to. Never updated.
  content     text not null,
  word_count  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (piece_id, version)
);

create table if not exists public.draft_annotations (
  id            uuid primary key default gen_random_uuid(),
  draft_id      uuid not null references public.piece_drafts(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- Character offsets into piece_drafts.content [start, end). Located server-side
  -- from `quote`; an annotation the server could not place is stored with both
  -- offsets null and surfaces as a general note rather than an inline highlight.
  start_offset  int,
  end_offset    int,
  quote         text not null,
  -- One of the rubric dimensions (thesis, validity, soundness, charity, economy,
  -- fidelity). Text, not an enum, to match critique_history.dimensions_flagged.
  dimension     text not null,
  severity      text not null default 'note'
                check (severity in ('critical','major','minor','note','strength')),
  -- The diagnosis: names the flaw and why it matters. Always present, even when a
  -- rewrite is offered, so a suggestion still teaches.
  comment       text not null,
  -- The optional concrete rewrite. Null for a pure diagnosis or a strength.
  suggestion    text,
  status        text not null default 'open'
                check (status in ('open','accepted','dismissed')),
  created_at    timestamptz not null default now()
);

alter table public.writing_pieces    enable row level security;
alter table public.piece_drafts       enable row level security;
alter table public.draft_annotations  enable row level security;

-- writing_pieces: the student owns the piece end to end.
create policy "writing_pieces_select_own" on public.writing_pieces
  for select using (auth.uid() = user_id);
create policy "writing_pieces_insert_own" on public.writing_pieces
  for insert with check (auth.uid() = user_id);
create policy "writing_pieces_update_own" on public.writing_pieces
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "writing_pieces_delete_own" on public.writing_pieces
  for delete using (auth.uid() = user_id);
create policy "writing_pieces_admin_select" on public.writing_pieces
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- piece_drafts: read and delete own. No update policy: a version is an immutable
-- record of what was submitted, like critique_history.
create policy "piece_drafts_select_own" on public.piece_drafts
  for select using (auth.uid() = user_id);
create policy "piece_drafts_insert_own" on public.piece_drafts
  for insert with check (auth.uid() = user_id);
create policy "piece_drafts_delete_own" on public.piece_drafts
  for delete using (auth.uid() = user_id);
create policy "piece_drafts_admin_select" on public.piece_drafts
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- draft_annotations: read/insert/delete own, plus update own for the accept /
-- dismiss action the student drives from the review view.
create policy "draft_annotations_select_own" on public.draft_annotations
  for select using (auth.uid() = user_id);
create policy "draft_annotations_insert_own" on public.draft_annotations
  for insert with check (auth.uid() = user_id);
create policy "draft_annotations_update_own" on public.draft_annotations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "draft_annotations_delete_own" on public.draft_annotations
  for delete using (auth.uid() = user_id);
create policy "draft_annotations_admin_select" on public.draft_annotations
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create index if not exists writing_pieces_user_updated_idx
  on public.writing_pieces (user_id, updated_at desc);
create index if not exists piece_drafts_piece_version_idx
  on public.piece_drafts (piece_id, version desc);
create index if not exists draft_annotations_draft_idx
  on public.draft_annotations (draft_id);
