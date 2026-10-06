-- research_sources: a 'quotation_only' licence status, with its rules
-- enforced in the database rather than only named (Kyle, 2026-10-05).
--
-- What the status means. We hold the text privately so that a ledger entry
-- can quote a short passage with full attribution and have the quotation
-- checked against the printed text. That is ordinary scholarly quotation. It
-- does not depend on the US copyright-renewal question for the 1933 and 1935
-- Loeb volumes (Bury's Sextus), which matters only if the full text were
-- loaded into the public corpus. So:
--   * each quotation is at most 60 words (ellipses join fragments; the count
--     covers the whole quotation);
--   * each quotation carries full attribution: author, work, translator and
--     edition year, plus a locator;
--   * the text is never in rag_corpus (triggers on both tables);
--   * the full text is never exported: full_text is no longer readable
--     through the API by any role, for any source. The insert and admin
--     routes never read it back, and the check below runs as the owner.
--     Ledger quotations reach the Themata Machine page only through
--     suite.yaml and rules.yaml, which the nightly auditor and
--     scripts/themata/verify_ledger.py check with this function.
--
-- Both Bury volumes move to the new status: Against the Logicians version 2
-- (ca2d7557) and version 1 (1349a6e0, deprecated). The Outlines volume is
-- stored as quotation_only from the start, after this migration.

ALTER TABLE public.research_sources DROP CONSTRAINT research_sources_licence_status_check;
ALTER TABLE public.research_sources ADD CONSTRAINT research_sources_licence_status_check
  CHECK (licence_status IN ('public_domain', 'open_licence_confirmed', 'licensed_copy', 'quotation_only', 'unconfirmed'));

COMMENT ON TABLE public.research_sources IS
  'Private full texts for research. Service role only, never embedded or retrieved; full_text is not readable through the API. Citable only through research_source_contains, and only when licence_status <> ''unconfirmed''. quotation_only: quotations of at most 60 words with full attribution, never in rag_corpus. See themata/THEMATA_PROJECT.md guardrail 1.';

-- Never exported in full: no API role can read full_text.
REVOKE SELECT ON public.research_sources FROM anon, authenticated, service_role;
GRANT SELECT (id, author, work, volume, translator, edition, edition_year, source_url,
              how_obtained, licence_status, licence_notes, locator_scheme, sha256, notes,
              deprecated, created_at)
  ON public.research_sources TO service_role;

-- The check, with reasons. A passage may join fragments with an ellipsis;
-- every fragment of 8 characters or more must be in the text, whitespace
-- collapsed. quotation_only adds the length and attribution rules.
CREATE FUNCTION public.research_quotation_problems(
  p_source uuid,
  p_passage text,
  p_attribution text DEFAULT NULL,
  p_locator text DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s        research_sources%ROWTYPE;
  probs    text[] := '{}';
  hay      text;
  frag     text;
  checked  int := 0;
  words    int;
  attr     text;
  surname  text;
BEGIN
  SELECT * INTO s FROM research_sources WHERE id = p_source;
  IF NOT FOUND THEN
    RETURN ARRAY['source not found'];
  END IF;
  IF s.deprecated THEN
    probs := probs || 'source is deprecated'::text;
  END IF;
  IF s.licence_status = 'unconfirmed' THEN
    probs := probs || 'licence unconfirmed: not citable'::text;
  END IF;
  IF p_passage IS NULL OR btrim(p_passage) = '' THEN
    RETURN probs || 'empty passage'::text;
  END IF;

  hay := regexp_replace(s.full_text, '\s+', ' ', 'g');
  FOREACH frag IN ARRAY regexp_split_to_array(p_passage, '…|\.\.\.') LOOP
    frag := btrim(regexp_replace(frag, '\s+', ' ', 'g'));
    CONTINUE WHEN length(frag) < 8;
    checked := checked + 1;
    IF strpos(hay, frag) = 0 THEN
      probs := probs || ('not in the text: ' || left(frag, 60))::text;
    END IF;
  END LOOP;
  IF checked = 0 THEN
    probs := probs || 'no fragment of 8 characters or more to check'::text;
  END IF;

  IF s.licence_status = 'quotation_only' THEN
    words := coalesce(array_length(regexp_split_to_array(
               btrim(regexp_replace(regexp_replace(p_passage, '…|\.\.\.', ' ', 'g'), '\s+', ' ', 'g')),
               ' '), 1), 0);
    IF words > 60 THEN
      probs := probs || format('quotation is %s words; quotation_only allows at most 60', words);
    END IF;

    attr := lower(regexp_replace(coalesce(p_attribution, ''), '\s+', ' ', 'g'));
    IF btrim(attr) = '' THEN
      probs := probs || 'quotation_only: attribution required'::text;
    ELSE
      IF strpos(attr, lower(s.author)) = 0 THEN
        probs := probs || format('attribution must name the author (%s)', s.author);
      END IF;
      IF strpos(attr, lower(s.work)) = 0 THEN
        probs := probs || format('attribution must name the work (%s)', s.work);
      END IF;
      surname := lower(regexp_replace(btrim(coalesce(s.translator, '')), '^.*\s', ''));
      IF surname <> '' AND strpos(attr, surname) = 0 THEN
        probs := probs || format('attribution must name the translator (%s)', s.translator);
      END IF;
      IF strpos(attr, s.edition_year::text) = 0 THEN
        probs := probs || format('attribution must give the edition year (%s)', s.edition_year);
      END IF;
    END IF;
    IF p_locator IS NULL OR btrim(p_locator) = '' THEN
      probs := probs || 'quotation_only: locator required'::text;
    END IF;
  END IF;

  RETURN probs;
END
$$;

-- Guardrail 1's check for a stored-source citation, now with attribution
-- and locator. The two-argument form is kept, so existing callers keep
-- working for the other statuses; it passes no attribution, so it is false
-- for every quotation_only source.
CREATE FUNCTION public.research_source_contains(
  p_source uuid,
  p_passage text,
  p_attribution text,
  p_locator text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cardinality(research_quotation_problems(p_source, p_passage, p_attribution, p_locator)) = 0
$$;

CREATE OR REPLACE FUNCTION public.research_source_contains(p_source uuid, p_passage text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cardinality(research_quotation_problems(p_source, p_passage, NULL, NULL)) = 0
$$;

REVOKE ALL ON FUNCTION public.research_quotation_problems(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.research_source_contains(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.research_source_contains(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.research_quotation_problems(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.research_source_contains(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.research_source_contains(uuid, text) TO service_role;

-- Never in rag_corpus. A row is the same source when it shares the source
-- URL, or the author and the translator's surname.
CREATE FUNCTION public.rag_corpus_refuse_quotation_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hit record;
BEGIN
  -- Only the identifying columns: never load full_text on a corpus write.
  SELECT s.id, s.author, s.translator INTO hit
  FROM research_sources s
  WHERE s.licence_status = 'quotation_only'
    AND (
      (NEW.source_url IS NOT NULL AND s.source_url IS NOT NULL
        AND rtrim(NEW.source_url, '/') = rtrim(s.source_url, '/'))
      OR (lower(NEW.author) = lower(s.author) AND s.translator IS NOT NULL
        AND NEW.translator ILIKE '%' || regexp_replace(btrim(s.translator), '^.*\s', '') || '%')
    )
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'rag_corpus: % (tr. %) is held in research_sources as quotation_only (%) and may not be stored in the corpus',
      hit.author, hit.translator, hit.id;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER rag_corpus_refuse_quotation_only
  BEFORE INSERT OR UPDATE OF author, translator, source_url ON public.rag_corpus
  FOR EACH ROW EXECUTE FUNCTION public.rag_corpus_refuse_quotation_only();

-- And the other direction: a source cannot become quotation_only while the
-- corpus holds rows from it.
CREATE FUNCTION public.research_sources_quotation_only_not_in_corpus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.licence_status = 'quotation_only' AND (
    EXISTS (
      SELECT 1 FROM rag_corpus r
      WHERE NEW.source_url IS NOT NULL
        AND rtrim(r.source_url, '/') = rtrim(NEW.source_url, '/'))
    OR EXISTS (
      SELECT 1 FROM rag_corpus r
      WHERE NEW.translator IS NOT NULL
        AND lower(r.author) = lower(NEW.author)
        AND r.translator ILIKE '%' || regexp_replace(btrim(NEW.translator), '^.*\s', '') || '%')
  ) THEN
    RAISE EXCEPTION 'research_sources: % (tr. %) has rows in rag_corpus; remove them from the corpus before marking it quotation_only',
      NEW.author, NEW.translator;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER research_sources_quotation_only_not_in_corpus
  BEFORE INSERT OR UPDATE OF licence_status, author, translator, source_url ON public.research_sources
  FOR EACH ROW EXECUTE FUNCTION public.research_sources_quotation_only_not_in_corpus();

REVOKE ALL ON FUNCTION public.rag_corpus_refuse_quotation_only() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.research_sources_quotation_only_not_in_corpus() FROM PUBLIC, anon, authenticated;

-- Both Bury volumes of Against the Logicians.
UPDATE public.research_sources
SET licence_status = 'quotation_only',
    licence_notes = 'Bury''s Loeb, 1935. Held as quotation_only (Kyle, 2026-10-05): short quotations (at most 60 words) with full attribution, for the Themata ledger; never in rag_corpus; full text not readable through the API. Short scholarly quotation does not depend on the US renewal question, which matters only for loading the full text into the public corpus. The DLI record labels it Out_of_copyright; that label has not been checked.'
WHERE id IN ('ca2d7557-ef76-49c7-a3d7-bee6c0b78b32', '1349a6e0-dedf-436c-afbb-6fafbc1bfa81')
  AND translator = 'R. G. Bury';
