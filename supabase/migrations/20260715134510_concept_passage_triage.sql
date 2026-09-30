-- Gap-agent passage triage: an advisory model pass that argues relevance so
-- Kyle judges instead of cold-reading. For each candidate passage the model
-- records a verdict (strong / partial / off_topic) and a one-line "bridge" —
-- the conceptual link between the user-phrased theme and the passage's
-- philosophical register ("habituation as repeated daily acts forming
-- character — the classical account of routine as practice"). Advisory only:
-- nothing writes `approved`; that column stays exclusively human.

ALTER TABLE concept_passage_map
  ADD COLUMN IF NOT EXISTS triage_verdict TEXT
    CHECK (triage_verdict IN ('strong', 'partial', 'off_topic')),
  ADD COLUMN IF NOT EXISTS triage_note TEXT;
