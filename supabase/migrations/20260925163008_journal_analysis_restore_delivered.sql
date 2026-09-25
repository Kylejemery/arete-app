-- Activation plan, Part 7.2: restore the delivered flag the journal agent
-- wiped. The agent upserted each week's analysis every morning with
-- delivered = false, so an insight a member had already opened went back to
-- undelivered (delivered_at stayed set). The agent no longer rewrites a
-- delivered analysis; this puts back the flag on the rows it reset.
-- Distress-flagged rows are left alone.
UPDATE journal_analysis
   SET delivered = true
 WHERE delivered = false
   AND delivered_at IS NOT NULL
   AND distress_flagged = false;
