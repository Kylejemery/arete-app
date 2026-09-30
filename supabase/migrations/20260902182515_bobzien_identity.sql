-- Bobzien identity relabel (physics remediation follow-up, approved by Kyle).
--
-- rag_corpus held Susanne Bobzien under two author strings. The two works
-- under the bare "Bobzien" label are the two-part summary of one handbook
-- chapter on Stoic logic (assertibles and arguments; then syllogistic,
-- indemonstrables, themata, pages 126 to 157), distinct from the three papers
-- under "Susanne Bobzien". Only the author label was defective, so this
-- merges the identity without merging the works. Chapter attribution
-- ("Cambridge Companion") follows the section order and page range of the
-- summary; if the source turns out to be a different handbook, relabel the
-- work again, never the author.

update public.rag_corpus
   set author = 'Susanne Bobzien',
       work = 'Stoic Logic (Cambridge Companion), part 1'
 where author = 'Bobzien' and work = 'Logic Part 1';

update public.rag_corpus
   set author = 'Susanne Bobzien',
       work = 'Stoic Logic (Cambridge Companion), part 2'
 where author = 'Bobzien' and work = 'Logic Part 2';

-- Source-of-record tables follow the live identity where they carry it.
update public.corpus_sources
   set author = 'Susanne Bobzien',
       work = case work when 'Logic Part 1' then 'Stoic Logic (Cambridge Companion), part 1'
                        when 'Logic Part 2' then 'Stoic Logic (Cambridge Companion), part 2'
                        else work end,
       updated_at = now()
 where author = 'Bobzien';

update public.paper_submissions
   set author = 'Susanne Bobzien',
       work = case work when 'Logic Part 1' then 'Stoic Logic (Cambridge Companion), part 1'
                        when 'Logic Part 2' then 'Stoic Logic (Cambridge Companion), part 2'
                        else work end,
       updated_at = now()
 where author = 'Bobzien';

-- Verification: expect one author string and five works.
--   select author, work, count(*) from rag_corpus where author ilike '%bobzien%' group by 1,2 order by 2;
