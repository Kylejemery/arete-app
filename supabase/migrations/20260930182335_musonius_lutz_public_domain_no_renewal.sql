-- Musonius Rufus, Lectures (Lutz 1947): public domain, no renewal found.
--
-- Lutz's translation was admitted on 2026-09-29 as license_status
-- 'unverified' (20260929154637): a US publication of 1947 is public domain
-- only if its copyright was not renewed in its 28th year, and the first
-- search, of the Catalog of Copyright Entries for 1974 and 1975, found no
-- renewal but did not cover 1976 or the publisher. The renewal search was
-- widened on 2026-09-30 (evidence below, and
-- docs/corpus/ADMISSIONS_2026-09-29_MUSONIUS_LUTZ.md) and again found none.
--
-- 'public_domain_us' is defined as a work first published in 1930 or
-- earlier, which Lutz is not, so this adds a value of its own:
-- 'public_domain_no_renewal', a 1931-1963 US publication whose renewal
-- search, recorded in license_evidence, found no renewal. It is not
-- quotable on air: rag_corpus_quotable_requires_pd_primary_check still
-- allows that only for 'public_domain_us', and quotable_on_air stays false.
--
-- The rows changed are the 89 Lutz rows: the 85 live English chunks and the
-- four deprecated originals kept by 20260930182106. The migration aborts
-- unless exactly those 89 are 'unverified' when it runs.

alter table public.rag_corpus drop constraint rag_corpus_license_status_check;
alter table public.rag_corpus add constraint rag_corpus_license_status_check
  check (license_status is null or license_status in ('public_domain_us', 'public_domain_no_renewal', 'open_license', 'unverified'));

comment on column public.rag_corpus.license_status is
  'public_domain_us: first published in the US in 1930 or earlier, or anywhere before 1931 (translation, not composition). public_domain_no_renewal: a 1931-1963 US publication whose copyright renewal search, recorded in license_evidence, found no renewal; not quotable on air. open_license: confirmed, not assumed. unverified: may be public domain (e.g. a 1931-1963 US publication with no renewal found) but not confirmed; never quotable on air. NULL: legacy row, status not recorded.';

do $$
declare
  n integer;
  evidence constant text := $ev$Cora E. Lutz, "Musonius Rufus: The Roman Socrates," Yale Classical Studies 10 (New Haven: Yale University Press, 1947). A US publication of 1947 is in the public domain unless its copyright was renewed in its 28th year (1974-1975). No renewal found. Searched 2026-09-29, and again more widely 2026-09-30, in the Copyright Office's Catalog of Copyright Entries, Third Series (archive.org OCR of the printed volumes): Part 1, Books and Pamphlets, Jan-Jun and Jul-Dec of 1974, 1975 and 1976, index and registration sections (vols. 28-30, twelve volumes), and Part 2, Periodicals, 1974, 1975 and 1976. Terms: "Lutz", "Musonius", "Roman Socrates", "Socrates", "Rufus", "Yale Classical", "Classical Studies", and every renewal entry naming Yale, Yale University Press as claimant included, that cites a 1946 or 1947 original (28 entries, read one by one). No entry renews the Musonius or Yale Classical Studies 10. The only Cora Lutz entry is a new 1975 registration of her Essays on Manuscripts and Rare Books (A652121, 30 Jun 1975), not a renewal. Yale University Press did renew other books of 1946-47 in these volumes (The Influence of Sea Power in World War 2, R613520; the Yale Shakespeare, R602998-R602999), so its renewals are present there and the search finds them. Not searched: the Stanford Copyright Renewal Database and the Copyright Office's online records, which the searching environment could not reach. Source: every row comes from the scan of the 1947 volume (archive.org MUSONIUSRUFUSSTOICFRAGMENTS, uploaded 2014), which holds the lectures only, with no front matter and nothing from the 2020 reissue.$ev$;
begin
  select count(*) into n from public.rag_corpus
   where author = 'Musonius Rufus' and work = 'Lectures' and translator = 'Cora E. Lutz';
  if n <> 89 then raise exception 'expected 89 Lutz rows, found %', n; end if;

  update public.rag_corpus
     set license_status = 'public_domain_no_renewal', license_evidence = evidence
   where author = 'Musonius Rufus' and work = 'Lectures' and translator = 'Cora E. Lutz'
     and license_status = 'unverified';
  get diagnostics n = row_count;
  if n <> 89 then raise exception 'expected to relabel 89 Lutz rows, relabelled %', n; end if;

  update public.corpus_staging_sources
     set license_status = 'public_domain_no_renewal', license_evidence = evidence
   where slug = 'musonius-lectures-lutz-1947';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'staging source musonius-lectures-lutz-1947 not found'; end if;
end
$$;
