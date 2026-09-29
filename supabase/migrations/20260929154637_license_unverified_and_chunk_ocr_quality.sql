-- Two additions for sources whose standing is not settled and whose OCR is
-- uneven within the source (first use: Lutz, Musonius Rufus, 1947).
--
-- 1. license_status 'unverified': a work that may be public domain but has not
--    been confirmed (a US publication of 1931-1963 whose renewal search found
--    nothing but cannot be called conclusive). It is never quotable on air:
--    rag_corpus_quotable_requires_pd_primary_check already requires
--    'public_domain_us' for that.
--
-- 2. corpus_staging_chunks.ocr_quality: a chunk's own OCR quality where it
--    differs from the source's (a page lost from the scan, a clipped margin).
--    promote.js carries it to rag_corpus.ocr_quality in place of the
--    source's value.

alter table public.rag_corpus drop constraint rag_corpus_license_status_check;
alter table public.rag_corpus add constraint rag_corpus_license_status_check
  check (license_status is null or license_status in ('public_domain_us', 'open_license', 'unverified'));

comment on column public.rag_corpus.license_status is
  'public_domain_us: first published in the US in 1930 or earlier, or anywhere before 1931 (translation, not composition). open_license: confirmed, not assumed. unverified: may be public domain (e.g. a 1931-1963 US publication with no renewal found) but not confirmed; never quotable on air. NULL: legacy row, status not recorded.';

alter table public.corpus_staging_chunks
  add column if not exists ocr_quality text
    check (ocr_quality is null or ocr_quality in ('good', 'fair', 'poor'));

comment on column public.corpus_staging_chunks.ocr_quality is
  'This chunk''s OCR quality where it differs from its source''s (lost lines, clipped margin); promote.js uses it for rag_corpus.ocr_quality. NULL: the source''s value applies.';
