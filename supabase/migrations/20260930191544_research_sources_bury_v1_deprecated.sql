-- Bury's Against the Logicians (Loeb 1935) in research_sources: version 2
-- (ca2d7557-ef76-49c7-a3d7-bee6c0b78b32) adds the proofreading of pp. 465 and
-- 471 and is otherwise identical. Version 1 is deprecated, never deleted.
-- The guard on sha256 makes this a no-op if the row is not the one expected.
update public.research_sources
set deprecated = true
where id = '1349a6e0-dedf-436c-afbb-6fafbc1bfa81'
  and sha256 = '7771f74397d334039ebe518daa8e432165a112ece14c75a09846eab86de991a3'
  and exists (
    select 1 from public.research_sources
    where id = 'ca2d7557-ef76-49c7-a3d7-bee6c0b78b32' and deprecated = false
  );
