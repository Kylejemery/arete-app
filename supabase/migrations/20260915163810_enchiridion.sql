-- ============================================================
-- The Enchiridion — 2026-09-15
--
-- A member's own handbook: a book-length document assembled from what they
-- have written into Arete (journal, Cabinet conversations, goals, scrolls,
-- Know Thyself answers) and set beside the passages from the corpus their
-- writing keeps circling. Generated on the Railway server
-- (server/enchiridion-agent.js), reviewed on the admin Enchiridion tab, and
-- printed on request from the Progress screen.
--
-- Two tables:
--   enchiridion_documents  one generated manuscript. Chapters are stored as
--                          JSON so the admin page can preview them and the
--                          print pipeline can lay them out later. Never
--                          overwritten: a regeneration is a new row, the old
--                          one is kept for the record.
--   enchiridion_requests   a member's request for a printed copy, with the
--                          price quoted at the moment they asked. Fulfilment
--                          is manual for now; status moves by hand on the
--                          admin tab.
--
-- Price and formats live in agent_config ('enchiridion-agent') so they can
-- be changed from the admin tab without a deploy.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.enchiridion_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text NOT NULL DEFAULT 'Enchiridion',
  subtitle       text,
  status         text NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued', 'generating', 'ready', 'failed')),
  -- [{ key, title, body, sources: [{ kind, id, label }] }] in reading order.
  chapters       jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- How much of each source fed the manuscript: { journal, cabinet, goals,
  -- scrolls, checkins, corpus }.
  source_counts  jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Every corpus passage quoted: [{ chunk_id, author, work }]. Attribution
  -- for the printed page; also the audit trail for the copyright rule.
  corpus_citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  word_count     integer NOT NULL DEFAULT 0,
  model_used     text,
  error          text,
  -- Admin who triggered it, or NULL when the member asked from the app.
  generated_by   uuid,
  generated_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enchiridion_documents_user
  ON public.enchiridion_documents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enchiridion_documents_status
  ON public.enchiridion_documents (status);

CREATE TABLE IF NOT EXISTS public.enchiridion_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id    uuid REFERENCES public.enchiridion_documents(id) ON DELETE SET NULL,
  format         text NOT NULL DEFAULT 'hardcover'
                 CHECK (format IN ('hardcover', 'softcover', 'journal')),
  -- Quoted at request time so a later price change never reprices an order.
  price_cents    integer NOT NULL CHECK (price_cents >= 0),
  currency       text NOT NULL DEFAULT 'usd',
  status         text NOT NULL DEFAULT 'requested'
                 CHECK (status IN (
                   'requested',        -- member asked; manuscript may not exist yet
                   'generating',       -- manuscript being assembled
                   'proofing',         -- manuscript ready, awaiting admin review
                   'awaiting_payment', -- checkout link sent
                   'paid',
                   'printing',
                   'shipped',
                   'delivered',
                   'cancelled'
                 )),
  shipping_name    text,
  -- { line1, line2, city, region, postal_code, country }
  shipping_address jsonb,
  -- Anything the member wanted to say: a dedication, a date range, a title.
  notes            text,
  payment_provider text,
  payment_ref      text,
  admin_notes      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enchiridion_requests_user
  ON public.enchiridion_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enchiridion_requests_status
  ON public.enchiridion_requests (status, created_at DESC);

-- updated_at upkeep
CREATE OR REPLACE FUNCTION public.enchiridion_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enchiridion_documents_touch ON public.enchiridion_documents;
CREATE TRIGGER trg_enchiridion_documents_touch
  BEFORE UPDATE ON public.enchiridion_documents
  FOR EACH ROW EXECUTE FUNCTION public.enchiridion_touch_updated_at();

DROP TRIGGER IF EXISTS trg_enchiridion_requests_touch ON public.enchiridion_requests;
CREATE TRIGGER trg_enchiridion_requests_touch
  BEFORE UPDATE ON public.enchiridion_requests
  FOR EACH ROW EXECUTE FUNCTION public.enchiridion_touch_updated_at();

-- RLS. Members read their own rows; every write goes through the Railway
-- server with the service role (the request endpoint quotes the price
-- server-side, so the app can never set its own).
ALTER TABLE public.enchiridion_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enchiridion_requests  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enchiridion_documents_select_own" ON public.enchiridion_documents;
CREATE POLICY "enchiridion_documents_select_own"
  ON public.enchiridion_documents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "enchiridion_requests_select_own" ON public.enchiridion_requests;
CREATE POLICY "enchiridion_requests_select_own"
  ON public.enchiridion_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Price and formats, editable from the admin tab. price_cents is the
-- hardcover price; the other formats are offsets so one number moves all.
INSERT INTO public.agent_config (agent_name, config)
VALUES (
  'enchiridion-agent',
  '{
    "enabled": true,
    "model": "claude-opus-5",
    "price_cents": 8900,
    "currency": "usd",
    "formats": {
      "hardcover": { "label": "Hardcover", "price_cents": 8900 },
      "softcover": { "label": "Softcover", "price_cents": 5900 },
      "journal":   { "label": "Journal edition", "price_cents": 6900 }
    },
    "min_journal_entries": 5,
    "max_journal_entries": 400,
    "max_cabinet_messages": 600,
    "max_scrolls": 40,
    "corpus_passages_per_chapter": 3,
    "target_words_per_chapter": 1400
  }'::jsonb
)
ON CONFLICT (agent_name) DO NOTHING;
