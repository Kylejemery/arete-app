-- ============================================================
-- Stoic Life essays join the Observatory journal as a sixth kind, 'essay'.
--
-- An essay is a synthesis_drafts row (mode 'stoic_life') that Kyle approved
-- and that has been exported to academy/corpus-ingestion/synthesis/: status
-- 'exported' or 'ingested'. Readers only ever see text committed to the
-- repo, never a draft. The same rule is in server/lib/observatory-journal.js
-- and the piece loader in server/index.js; change all three together.
--
-- Comments may now be written on an essay, with the same rules as every
-- other kind (observatory_comments, 20261001165829 and 20261002153630).
-- ============================================================

ALTER TABLE observatory_comments
  DROP CONSTRAINT observatory_comments_piece_kind_check;
ALTER TABLE observatory_comments
  ADD CONSTRAINT observatory_comments_piece_kind_check
  CHECK (piece_kind IN ('tension', 'inquiry', 'dream', 'convergence', 'world', 'essay'));

CREATE OR REPLACE FUNCTION public.observatory_piece_is_public(p_kind text, p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_kind
    WHEN 'tension' THEN EXISTS (SELECT 1 FROM philosophical_tensions
      WHERE id = p_id AND status = 'approved' AND observatory_visible)
    WHEN 'inquiry' THEN EXISTS (SELECT 1 FROM open_inquiries
      WHERE id = p_id AND status = 'approved' AND observatory_visible)
    WHEN 'dream' THEN EXISTS (SELECT 1 FROM corpus_dreams
      WHERE id = p_id AND status IN ('approved', 'starred') AND observatory_visible)
    WHEN 'convergence' THEN EXISTS (SELECT 1 FROM convergences
      WHERE id = p_id AND status IN ('approved', 'starred'))
    WHEN 'world' THEN EXISTS (SELECT 1 FROM world_observations
      WHERE id = p_id AND status IN ('approved', 'auto_approved') AND observatory_visible)
    WHEN 'essay' THEN EXISTS (SELECT 1 FROM synthesis_drafts
      WHERE id = p_id AND mode = 'stoic_life' AND status IN ('exported', 'ingested'))
    ELSE false
  END;
$$;
