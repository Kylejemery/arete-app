-- Scribe chat: add the terminal "final" handoff stage and a place to store the
-- cold outside-reader findings that fire once at that stage.
alter table public.scribe_entry_drafts
  drop constraint scribe_entry_drafts_stage_check;

alter table public.scribe_entry_drafts
  add constraint scribe_entry_drafts_stage_check
  check (stage = any (array['middle'::text, 'full'::text, 'final'::text]));

-- Outside-reader audit for a final snapshot: { model, not_kyle[], unearned[],
-- narrated_over[], error? }. Null for middle/full snapshots.
alter table public.scribe_entry_drafts
  add column if not exists review jsonb;
