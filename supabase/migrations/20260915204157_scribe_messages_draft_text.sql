-- Scribe chat turns can now edit the working draft in place (<edit> blocks)
-- instead of re-emitting the whole essay, so a message's content no longer
-- always carries the draft state it produced. draft_text is that state: the
-- full working draft after the turn's complete <draft> or its edits were
-- applied, null when the turn changed nothing. Kyle's hand revisions carry it
-- too. Older rows keep the draft inside content; readers fall back to that.
alter table public.scribe_messages
  add column if not exists draft_text text;
