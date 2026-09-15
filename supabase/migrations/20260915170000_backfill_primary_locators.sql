-- Locator backfill for the primary layer.
--
-- Older ingests wrote the passage reference into section_label ("1.18",
-- "7.24–7.26", "97") and left locator null, so retrieval surfaces that read
-- the locator column (the Cabinet probe, the Scribe's references, the
-- citation work to come) saw no reference on 1,635 rows that carry one. Where
-- the label is nothing but a reference (numbers, dots, an en-dash range) it
-- is the locator; copy it. Labels that name a treatise ("On Clemency 2.7",
-- "ch. 1.12", "Paradox 6") need per-work parsing and are left for a later
-- pass. Deprecated rows are left as they are.

update public.rag_corpus
set locator = section_label
where deprecated = false
  and text_type = 'primary'
  and locator is null
  and section_label ~ '^[0-9]+(\.[0-9]+)*(–[0-9]+(\.[0-9]+)*)?$';
