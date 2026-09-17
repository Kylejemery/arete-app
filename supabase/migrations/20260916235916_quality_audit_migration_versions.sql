-- Expose the applied migration list to the Quality Audit Agent.
--
-- The convention is that a migration is committed to supabase/migrations/ and
-- applied to this project in the same session, with the file and the applied
-- SQL identical — never SQL that is not also committed. Nothing enforced it,
-- and nothing could: supabase_migrations is not a PostgREST-exposed schema, so
-- the agent cannot read the applied list directly.
--
-- This returns version + name only. No SQL bodies cross the boundary; the
-- agent compares names against the filenames in the checkout and reports drift
-- in both directions.

create or replace function public.quality_audit_migration_versions()
returns table (version text, name text)
language sql
stable
security definer
set search_path = supabase_migrations, public
as $$
  select version, name from supabase_migrations.schema_migrations order by version
$$;

revoke all on function public.quality_audit_migration_versions() from public, anon, authenticated;

comment on function public.quality_audit_migration_versions() is
  'Applied migration versions and names, for the nightly Quality Audit Agent drift check. Service role only.';