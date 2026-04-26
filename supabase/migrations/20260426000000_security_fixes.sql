-- ============================================================
-- Security fixes — 2026-04-26
-- Addresses two warnings from the Supabase Security Advisor:
--
-- 1. pg_graphql anon introspection
--    The anon role can call graphql.resolve() and use GraphQL
--    introspection queries to enumerate table/column names without
--    authenticating. Revoke execute so unauthenticated requests
--    cannot reach the GraphQL endpoint at all.
--
-- 2. handle_new_user search path mutation
--    SECURITY DEFINER functions inherit the caller's search_path
--    unless pinned. A malicious actor could create a shadow schema
--    with matching object names and redirect the INSERT. Pin the
--    search_path to 'public' so all unqualified names resolve to
--    the correct schema regardless of the caller's session.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Revoke pg_graphql introspection from the anon role
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION graphql.resolve FROM anon;


-- ------------------------------------------------------------
-- 2. Recreate handle_new_user with a fixed search_path
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public          -- ← pins the path; prevents injection
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;
