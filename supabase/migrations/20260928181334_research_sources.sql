-- research_sources: full texts held privately for research, never retrieved.
--
-- The Themata Project needs to read whole texts the corpus cannot hold
-- verbatim (modern translations, scholarship). CLAUDE.md's copyright rule
-- keeps those out of rag_corpus: they enter the corpus only as Mode 2
-- summaries. This table is the other half: the full text, kept where no
-- agent, embedding job or client can reach it, so a ledger entry can cite a
-- locator and a short quotation that is checked against the stored text.
--
-- Rules the schema enforces or records:
--   * RLS on, no policies, execute revoked: service role only.
--   * No embedding column. Nothing here is retrievable or ever will be;
--     a work that should be retrievable goes through the corpus pipeline.
--   * licence_status is required and says how we are entitled to hold the
--     copy. 'unconfirmed' is allowed so a text can be registered while the
--     licence is checked, but nothing may be cited from it until it moves.
--   * sha256 of full_text, unique, so the same file is not stored twice.
--   * Deprecate, never delete.

CREATE TABLE public.research_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author          text NOT NULL,
  work            text NOT NULL,
  volume          text,
  translator      text,
  edition         text NOT NULL,
  edition_year    integer NOT NULL,
  source_url      text,
  how_obtained    text NOT NULL,
  licence_status  text NOT NULL
    CHECK (licence_status IN ('public_domain', 'open_licence_confirmed', 'licensed_copy', 'unconfirmed')),
  licence_notes   text,
  locator_scheme  text NOT NULL,
  full_text       text NOT NULL CHECK (length(full_text) > 0),
  sha256          text NOT NULL UNIQUE CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  notes           text,
  deprecated      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.research_sources IS
  'Private full texts for research. Service role only, never embedded or retrieved. Citable only when licence_status <> ''unconfirmed''. See themata/THEMATA_PROJECT.md guardrail 1.';

ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.research_sources FROM anon, authenticated;

-- Guardrail 1's check for a stored-source citation: the passage is an exact
-- substring of a live, citable source after collapsing whitespace.
CREATE FUNCTION public.research_source_contains(p_source uuid, p_passage text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT strpos(
             regexp_replace(full_text, '\s+', ' ', 'g'),
             regexp_replace(btrim(p_passage), '\s+', ' ', 'g')
           ) > 0
    FROM research_sources
    WHERE id = p_source
      AND NOT deprecated
      AND licence_status <> 'unconfirmed'
  ), false)
$$;

REVOKE ALL ON FUNCTION public.research_source_contains(uuid, text) FROM PUBLIC, anon, authenticated;
