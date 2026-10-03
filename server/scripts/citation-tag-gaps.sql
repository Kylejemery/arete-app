-- server/scripts/citation-tag-gaps.sql
--
-- How strong a citation tag each live, counselor-visible rag_corpus row would
-- produce (server/lib/citation-tag.js), grouped by author and work. Read only.
-- The section-label test mirrors LOCATOR_LIKE there; change both together.
--
--   locator    locator filled                       → [DL 7.179]
--   section    no locator, section_label is a place → [Musonius, Lecture XXI]
--   weak       author and work only                 → [Cicero, De Finibus, no locator]
--   empty      author or work missing
--   synthesis  Arete synthesis, labelled by status

with r as (
  select
    author, work, text_type, locator,
    regexp_replace(regexp_replace(trim(work), '\s*\([^)]*\)\s*$', ''), ',\s*Book\s+[IVXLC0-9]+\s*$', '', 'i') as wbase,
    regexp_replace(regexp_replace(trim(coalesce(section_label, '')), '\s+', ' ', 'g'), '\s*\(\d+/\d+\)$', '') as sl
  from rag_corpus
  where not coalesce(deprecated, false)
    and coalesce(text_type, '') not in ('concordance', 'modern_primary', 'modern_summary')
), c as (
  select *,
    case
      when text_type = 'synthesis' or author ~* '^arete (synthesis|\(ai-assisted\))$' then 'synthesis'
      when coalesce(trim(author), '') = '' or coalesce(wbase, '') = '' then 'empty'
      when coalesce(trim(locator), '') <> '' then 'locator'
      when trim(regexp_replace(case when wbase <> '' then replace(sl, wbase, '') else sl end, '\s*([–-])\s*', '\1', 'g'))
           ~* '^((book|bk\.?|letter|ep\.?|epistle|lecture|chapter|ch\.?|fragment|fr\.?|section|sect\.?|§|pp?\.)\s*)?[0-9ivxlc]+[a-f]?([.,:]\s?[0-9ivxlc]+[a-f]?)*(\s?[–-]\s?[0-9ivxlc]+[a-f]?([.,:][0-9ivxlc]+[a-f]?)*)?$'
        then 'section'
      else 'weak'
    end as strength
  from r
)
select author, work, text_type,
  count(*) as rows,
  count(*) filter (where strength = 'locator') as locator,
  count(*) filter (where strength = 'section') as section,
  count(*) filter (where strength = 'weak') as weak,
  count(*) filter (where strength = 'empty') as empty
from c
where strength <> 'synthesis'
group by author, work, text_type
having count(*) filter (where strength in ('weak', 'empty')) > 0
order by count(*) filter (where strength in ('weak', 'empty')) desc, author, work;
