-- The composer's working copy lives in the database, not only in the browser.
--
-- Until now a piece existed in Supabase only once it had been submitted for
-- markup; the text being written sat in localStorage under a per-piece key,
-- which meant a draft written on one machine was invisible on another and a
-- cleared browser lost it. The composer now autosaves the working copy a
-- moment after each pause in typing (and creates the piece row on the first
-- save, so a long draft is in the database well before its first markup).
--
-- piece_drafts stays what it was: immutable snapshots, one per submission,
-- that annotations anchor to. working_copy is the live text between them.
-- working_copy_saved_at lets a client reconcile against its own local copy
-- and keep whichever is newer.

alter table public.writing_pieces
  add column if not exists working_copy text,
  add column if not exists working_copy_saved_at timestamptz;

comment on column public.writing_pieces.working_copy is
  'The live text between submissions; autosaved by the composer. Not a snapshot.';
comment on column public.writing_pieces.working_copy_saved_at is
  'When working_copy was last written; used to reconcile with a client''s local copy.';
