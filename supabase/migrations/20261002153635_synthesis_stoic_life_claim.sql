-- Stoic Life mode of the Synthesis Agent (part 2b): the atomic claim a
-- drafting run makes. The topics table came first; the config row is its own
-- migration. server/synthesis/modes/stoic-life.js.
--
-- claim_stoic_life_topic: the oldest approved topic, marked drafting, or no
-- row when a draft is in review or another run is already drafting. A claim
-- older than p_stale_minutes is assumed dead (the run crashed) and returned
-- to approved first. The advisory lock makes concurrent runs take turns.
--
-- A SQL function, and no semicolon inside any string: the remote migration
-- tool hung on every earlier version of this file, which carried one in a
-- string literal.

begin;

create or replace function public.claim_stoic_life_topic(p_stale_minutes integer default 60)
returns setof public.synthesis_topics
language sql
volatile
set search_path = public
as $$
  select pg_advisory_xact_lock(hashtext('claim_stoic_life_topic'));

  update synthesis_topics
     set status = 'approved', claimed_at = null,
         last_error = coalesce(last_error, 'a drafting run did not finish and was returned to approved'),
         updated_at = now()
   where mode = 'stoic_life' and status = 'drafting'
     and claimed_at < now() - p_stale_minutes * interval '1 minute';

  update synthesis_topics t
     set status = 'drafting', claimed_at = now(), last_error = null, updated_at = now()
   where t.id = (select id from synthesis_topics
                  where mode = 'stoic_life' and status = 'approved'
                  order by approved_at nulls last, created_at
                  limit 1
                  for update)
     and not exists (select 1 from synthesis_drafts
                      where mode = 'stoic_life' and status in ('pending_review', 'edited'))
     and not exists (select 1 from synthesis_topics
                      where mode = 'stoic_life' and status = 'drafting')
  returning t.*;
$$;

revoke all on function public.claim_stoic_life_topic(integer) from public, anon, authenticated;

commit;
