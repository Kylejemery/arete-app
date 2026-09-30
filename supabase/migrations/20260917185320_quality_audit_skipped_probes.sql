-- Record WHICH probes skipped, not just how many.
--
-- The Quality tab's coverage panel listed the run's domains and implied each
-- was checked. On a run started from Railway that reads "repo — migrations,
-- crons, lint, secrets, docs" while all seven repo probes skipped for want of
-- a checkout, which is the opposite of the truth and exactly the kind of quiet
-- overclaim the agent exists to catch.
--
-- The runner already knows: it returns [{ id, reason }] for every skipped
-- probe. Only the count was being persisted. Keep the list so a reader can see
-- what went unchecked and why, and so "clean" and "not looked at" stop being
-- indistinguishable in the report.

alter table public.quality_audit_reports
  add column if not exists skipped jsonb not null default '[]'::jsonb;

comment on column public.quality_audit_reports.skipped is
  'One entry per skipped probe: { id, reason }. A probe whose prerequisites were absent, not a probe that passed.';
