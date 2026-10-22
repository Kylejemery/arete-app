-- research_source_section_text(): read one indexed section as the function
-- owner, so the server can serve it. Kyle's decision of 2026-10-22.
--
-- Migration 20261005184546 revoked SELECT on research_sources.full_text from
-- every API role, service_role included: the full text is never exported in
-- full. The Seminar Track (spec Part 2) needs the server to read one indexed
-- section at a time: the Syllabus, Outline and Draft agents build from it,
-- and the reading pane shows it to the admin account only. This function is
-- that one door, and it stays narrow:
--   * one live section of a live, citable source, never the whole text;
--   * execute for service_role only; anon and authenticated (every member)
--     cannot call it, and full_text stays unreadable through the API;
--   * the 60 word quotation limit still holds on everything written from it
--     (server/seminar/verify.js).

create or replace function public.research_source_section_text(p_source uuid, p_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select substr(r.full_text, s.char_start + 1, s.char_end - s.char_start)
  from research_source_sections s
  join research_sources r on r.id = s.source_id
  where s.source_id = p_source and s.key = p_key
    and not s.deprecated and not r.deprecated and r.licence_status <> 'unconfirmed'
$$;

revoke all on function public.research_source_section_text(uuid, text) from public, anon, authenticated;
grant execute on function public.research_source_section_text(uuid, text) to service_role;
