-- Licensing backfill for Diogenes Laërtius, Lives Book VII (Hicks 1925).
-- Decision 7 of docs/corpus/PUBLIC_DOMAIN_INGESTION_PROPOSAL.md, approved
-- 2026-09-26. These rows came in from Wikisource before the licensing
-- columns existed; the Long 2002 ch. 2 batch cites DL 7.121 from them, so
-- they are made quotable on air rather than ingested a second time.
--
-- license_evidence is the reasoning, not Wikisource's statement: the host
-- was unreachable from the session that wrote this. The page's own notice
-- can replace it when fetched.

update public.rag_corpus
set license_status   = 'public_domain_us',
    license_evidence = 'R. D. Hicks, tr., Diogenes Laertius, Lives of Eminent Philosophers, vol. II (Books VI–X), Loeb Classical Library 185, London: Heinemann; New York: G. P. Putnam''s Sons, 1925. Published 1925, before 1931: public domain in the United States. Source page''s own notice not yet recorded.',
    edition          = 'Loeb Classical Library 185 (Lives, vol. II)',
    quotable_on_air  = true,
    cited_by         = array['Long 2002, ch. 2 further reading']
where author = 'Diogenes Laërtius'
  and work = 'Lives of Eminent Philosophers, Book VII'
  and translator = 'R.D. Hicks'
  and edition_year = 1925
  and text_type = 'primary'
  and deprecated = false;
