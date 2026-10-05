-- Themata guardrail 1 in one place (Kyle, 2026-10-05). The ledger check used
-- to live twice, in scripts/themata/verify_ledger.py and in the nightly
-- auditor's repo.themata_ledger probe, and the two had to be kept in step by
-- hand. Both now parse the ledger YAML, send the entries here, and only print
-- or report what comes back.
--
-- For each entry (the YAML object, as JSON) it returns what was checked and
-- the problems found; an entry passes when problems is empty.
--   * corpus_ref: the chunk exists in rag_corpus and is not deprecated, and
--     every fragment of `passage` (split at … or ..., fragments of 8
--     characters or more, whitespace collapsed) is in its chunk_text.
--   * research_ref (one ref with `passage`, or a list with
--     `passages: [{ref, text}]`): each quotation goes whole to
--     research_quotation_problems with the entry's `source` line as the
--     attribution and the ref's locator, so a quotation_only source's limits
--     apply here too.
--   * A cited passage with nothing left to check fails.
-- An entry with neither ref comes back with nothing checked and no problems;
-- the callers list it as uncited.

CREATE FUNCTION public.themata_ledger_problems(p_entries jsonb)
RETURNS TABLE (entry_id text, checked text[], problems text[])
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  e        jsonb;
  refs     jsonb;
  texts    jsonb;
  t        jsonb;
  ref      jsonb;
  probs    text[];
  chk      text[];
  chunk    record;
  hay      text;
  frag     text;
  nfr      int;
  qp       text[];
  has_text boolean;
  uuid_re  constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  FOR e IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
    probs := '{}';
    chk := '{}';

    IF coalesce(e->>'corpus_ref', '') <> '' THEN
      chk := chk || ('corpus_ref ' || (e->>'corpus_ref'));
      IF (e->>'corpus_ref') !~ uuid_re THEN
        probs := probs || format('corpus_ref %s is not a chunk id', e->>'corpus_ref');
      ELSE
        SELECT r.chunk_text, r.deprecated INTO chunk
        FROM rag_corpus r WHERE r.id = (e->>'corpus_ref')::uuid;
        IF NOT FOUND THEN
          probs := probs || format('corpus_ref %s is not in rag_corpus', e->>'corpus_ref');
        ELSE
          IF chunk.deprecated THEN
            probs := probs || format('corpus_ref %s is deprecated', e->>'corpus_ref');
          END IF;
          hay := btrim(regexp_replace(chunk.chunk_text, '\s+', ' ', 'g'));
          nfr := 0;
          FOREACH frag IN ARRAY regexp_split_to_array(coalesce(e->>'passage', ''), '…|\.\.\.') LOOP
            frag := btrim(regexp_replace(frag, '\s+', ' ', 'g'));
            CONTINUE WHEN length(frag) < 8;
            nfr := nfr + 1;
            IF strpos(hay, frag) = 0 THEN
              probs := probs || ('not in the chunk: ' || left(frag, 80));
            END IF;
          END LOOP;
          IF nfr = 0 THEN
            probs := probs || 'the passage has nothing left to check'::text;
          END IF;
        END IF;
      END IF;
    END IF;

    IF jsonb_typeof(e->'research_ref') IN ('object', 'array') THEN
      IF jsonb_typeof(e->'research_ref') = 'object' THEN
        refs := jsonb_build_array(e->'research_ref');
        texts := jsonb_build_array(jsonb_build_object('ref', 0, 'text', e->'passage'));
      ELSE
        refs := e->'research_ref';
        texts := CASE WHEN jsonb_typeof(e->'passages') = 'array' THEN e->'passages' ELSE '[]'::jsonb END;
      END IF;
      has_text := false;
      FOR t IN SELECT value FROM jsonb_array_elements(texts) LOOP
        ref := CASE WHEN (t->>'ref') ~ '^\d+$' THEN refs->((t->>'ref')::int) END;
        IF ref IS NULL THEN
          probs := probs || format('passage points at research_ref %s, which does not exist', coalesce(t->>'ref', '(none)'));
          CONTINUE;
        END IF;
        CONTINUE WHEN NOT EXISTS (
          SELECT 1 FROM unnest(regexp_split_to_array(coalesce(t->>'text', ''), '…|\.\.\.')) f
          WHERE length(btrim(regexp_replace(f, '\s+', ' ', 'g'))) >= 8);
        has_text := true;
        chk := chk || ('research_ref ' || coalesce(ref->>'locator', '(no locator)'));
        IF coalesce(ref->>'source_id', '') !~ uuid_re THEN
          probs := probs || format('%s: source_id %s is not a research_sources id',
                                   coalesce(ref->>'locator', '(no locator)'), coalesce(ref->>'source_id', '(none)'));
          CONTINUE;
        END IF;
        qp := research_quotation_problems((ref->>'source_id')::uuid, t->>'text', e->>'source', ref->>'locator');
        IF cardinality(qp) > 0 THEN
          probs := probs || (coalesce(ref->>'locator', '(no locator)') || ': ' || array_to_string(qp, '; '));
        END IF;
      END LOOP;
      IF NOT has_text THEN
        probs := probs || 'research_ref has no passage to check'::text;
      END IF;
    END IF;

    entry_id := e->>'id';
    checked := chk;
    problems := probs;
    RETURN NEXT;
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public.themata_ledger_problems(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.themata_ledger_problems(jsonb) TO service_role;
