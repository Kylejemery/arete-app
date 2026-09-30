-- Which iOS build each user last came in on.
--
-- On 9/28 and 9/29 users on build 94 (v1.4.1, 9/13) got 401s from
-- /api/onboard-web: that build sends no Authorization header, the server
-- began requiring one on 9/24, and the fingerprint runtime policy means no
-- over-the-air update can reach it. Nothing recorded which build anyone was
-- on, so there was no way to find who was still on it.
--
-- The server's lastActiveMiddleware (server/lib/events.js) reads the build
-- from the app's user agent ("Arete/<build> CFNetwork/...") on authenticated
-- requests and stamps it here: at once when it changes, otherwise at most
-- hourly. Web and server callers carry no build and never overwrite it.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_app_build integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_app_build_at timestamptz;

COMMENT ON COLUMN public.profiles.last_app_build IS
  'iOS build number (CFBundleVersion) from the user agent of the user''s most recent authenticated app request. Null until the app has been used since 2026-09-30.';
COMMENT ON COLUMN public.profiles.last_app_build_at IS
  'When last_app_build was last stamped (at most hourly per user while the build is unchanged).';
