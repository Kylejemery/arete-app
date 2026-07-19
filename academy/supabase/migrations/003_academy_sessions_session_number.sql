-- Seminar threads become session-scoped and persistent.
-- Previously getOrCreateSession only reused a thread created the same
-- calendar day, so every date rollover silently started an empty chat and
-- orphaned the previous discussion. Threads are now keyed by
-- (user, course, agent, session_number) and resume indefinitely; legacy rows
-- (session_number null) are adopted into the viewed session on first lookup.

alter table public.academy_sessions
  add column if not exists session_number integer;
