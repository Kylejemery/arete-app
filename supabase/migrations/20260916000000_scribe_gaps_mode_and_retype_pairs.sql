-- Two additions to the writing surfaces.
--
-- 1. scribe_entries.gaps_mode — an optional posture for an entry. When on,
--    Scribe writes structure, sources, tensions and questions but no finished
--    paragraphs: every paragraph is a [YOUR TURN: ...] gap with its material
--    underneath, and the writer supplies the prose. Off by default; the
--    normal drafting behaviour is unchanged.
--
-- 2. retype_pairs — the highest-signal voice data the system produces. When
--    the writer retypes a sentence in the Composer, the sentence that was
--    there and the sentence they typed over it are a labelled pair: model
--    prose on one side, their own on the other. Stored so the voice pass can
--    learn from how they actually rewrite rather than from a curated style
--    card. Own rows only, under RLS.

alter table public.scribe_entries
  add column if not exists gaps_mode boolean not null default false;

create table if not exists public.retype_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  piece_id uuid references public.writing_pieces(id) on delete set null,
  -- The sentence as it stood before the writer typed over it.
  original text not null,
  -- What they replaced it with. Never equal to the original: an unchanged
  -- sentence teaches nothing and is not recorded.
  retyped text not null,
  -- 'suggestion' when the original was the Interlocutor's rewrite, 'draft'
  -- when it was the writer's own earlier prose or a Scribe draft.
  source text not null default 'draft' check (source in ('draft', 'suggestion', 'voice')),
  created_at timestamptz not null default now()
);

create index if not exists retype_pairs_user_idx
  on public.retype_pairs(user_id, created_at desc);

alter table public.retype_pairs enable row level security;

drop policy if exists "Users manage their own retype pairs" on public.retype_pairs;
create policy "Users manage their own retype pairs"
  on public.retype_pairs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
