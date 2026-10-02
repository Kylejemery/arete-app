-- Stoic Life mode of the Synthesis Agent (part 3): what the topic proposer
-- reads, and the seed topics.
--
-- thin_cabinet_questions   Cabinet and counselor turns whose best retrieved
--                          passage scored below a threshold, internal and
--                          admin accounts excluded (CLAUDE.md measurement
--                          rule). The proposer clusters these, keeps only
--                          clusters spanning several members, and stores
--                          counts, never question text.
-- sample_primary_passages  A random sample of embedded primary passages from
--                          named works, for finding themes no topic covers.
--
-- Seeds: the nine topics from Kyle's two documents. They enter as
-- 'proposed', so each still needs his approval before anything is drafted.

begin;

create or replace function public.thin_cabinet_questions(
  p_since     timestamptz,
  p_threshold double precision,
  p_limit     integer default 200
)
returns table (
  request_id     uuid,
  student_id     uuid,
  query_text     text,
  top_similarity double precision,
  asked_at       timestamptz
)
language sql
stable
set search_path = public
as $$
  with turns as (
    select l.request_id,
           (array_agg(l.student_id))[1]                 as student_id,
           (array_agg(l.query_text order by l.rank))[1] as query_text,
           max(l.similarity)                            as top_similarity,
           min(l.created_at)                            as asked_at
      from retrieval_log l
     where l.created_at >= p_since
       and (l.agent = 'cabinet' or l.agent like 'counselor:%')
       and l.student_id is not null
       and l.similarity is not null
     group by l.request_id
    having max(l.similarity) < p_threshold
  )
  select t.request_id, t.student_id, t.query_text, t.top_similarity, t.asked_at
    from turns t
    join measured_profiles mp on mp.id = t.student_id
   where not coalesce(mp.is_internal, false)
     and not coalesce(mp.is_admin, false)
   order by t.asked_at desc
   limit greatest(p_limit, 0);
$$;

revoke all on function public.thin_cabinet_questions(timestamptz, double precision, integer) from public, anon, authenticated;

create or replace function public.sample_primary_passages(p_works jsonb, p_n integer default 40)
returns table (
  id            uuid,
  author        text,
  work          text,
  section_label text,
  chunk_text    text,
  embedding     text
)
language sql
volatile
set search_path = public
as $$
  select r.id, r.author, r.work, r.section_label, r.chunk_text, r.embedding::text
    from rag_corpus r
    join jsonb_to_recordset(p_works) as w(author text, work text)
      on w.author = r.author and w.work = r.work
   where r.text_type = 'primary'
     and not r.deprecated
     and r.embedding is not null
   order by random()
   limit greatest(p_n, 0);
$$;

revoke all on function public.sample_primary_passages(jsonb, integer) from public, anon, authenticated;

insert into public.synthesis_topics (mode, title, status, source, rationale, evidence)
values
  ('stoic_life', 'Practical wisdom: telling the good from the indifferent', 'proposed', 'seed',
   'From The Virtues of Socrates, "Wisdom": the virtue that governs the others, and the Stoic test of what is good, bad and indifferent applied to ordinary choices.',
   '{"document": "virtues-of-socrates", "section": "Wisdom"}'),
  ('stoic_life', 'Courage: fearing only what is shameful', 'proposed', 'seed',
   'From The Virtues of Socrates, "Courage": Socrates at Potidaea and at his trial, and what the Stoics took from him about fear, death and speaking plainly.',
   '{"document": "virtues-of-socrates", "section": "Courage"}'),
  ('stoic_life', 'Justice: how to treat the people around you', 'proposed', 'seed',
   'From The Virtues of Socrates, "Justice: how he treated people" and "The Stoic widening": justice as the virtue of living with others, widened by the Stoics to the whole human community.',
   '{"document": "virtues-of-socrates", "section": "Justice: how he treated people"}'),
  ('stoic_life', 'Self-control: wanting less and enjoying it more', 'proposed', 'seed',
   'From The Virtues of Socrates, "Self-discipline and temperance": the virtue of measure in appetite, comfort and pleasure.',
   '{"document": "virtues-of-socrates", "section": "Self-discipline and temperance"}'),
  ('stoic_life', 'Diet: eating as a Stoic', 'proposed', 'seed',
   'From The Virtues of Socrates, "A Socratic life in modern terms > Diet", with Musonius Rufus''s lectures on food (Lutz XVIIIA and XVIIIB) now in the corpus.',
   '{"document": "virtues-of-socrates", "section": "A Socratic life in modern terms > Diet"}'),
  ('stoic_life', 'Small habits: the daily practice of a Stoic life', 'proposed', 'seed',
   'From The Virtues of Socrates, "Small habits" and "A daily rhythm": the small repeated acts through which the virtues are trained.',
   '{"document": "virtues-of-socrates", "section": "A Socratic life in modern terms > Small habits"}'),
  ('stoic_life', 'Rules for living: what Musonius, Epictetus, Seneca and Marcus told their students to do', 'proposed', 'seed',
   'From The Virtues of Socrates, "Rules for living": the concrete precepts the four Roman Stoics gave, and how they hold together.',
   '{"document": "virtues-of-socrates", "section": "Rules for living"}'),
  ('stoic_life', 'Assent and impressions: what to do with a first reaction', 'proposed', 'seed',
   'From Stoic Logic: A Summary, "Impressions, assent, and the criterion of truth": the Stoic account of how judgment works, and the practice of withholding assent from impressions that have not been tested.',
   '{"document": "stoic-logic-summary", "section": "Impressions, assent, and the criterion of truth"}'),
  ('stoic_life', 'Dialectic as a discipline against error', 'proposed', 'seed',
   'From Stoic Logic: A Summary, "Why logic mattered": why the Stoics held that the wise person must be a dialectician, and what careful reasoning protects a life from.',
   '{"document": "stoic-logic-summary", "section": "Why logic mattered"}')
on conflict do nothing;

commit;
