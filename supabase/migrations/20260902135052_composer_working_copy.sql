alter table public.writing_pieces
  add column if not exists working_copy text,
  add column if not exists working_copy_saved_at timestamptz;

comment on column public.writing_pieces.working_copy is
  'The live text between submissions; autosaved by the composer. Not a snapshot.';
comment on column public.writing_pieces.working_copy_saved_at is
  'When working_copy was last written; used to reconcile with a client''s local copy.';