-- Stoic Life mode of the Synthesis Agent (part 2c): the config row for the
-- mode, tunable without a redeploy (server/synthesis/modes/stoic-life.js
-- holds the same defaults for any key missing here).
--
-- Plain ASCII on purpose. Diogenes La\u00ebrtius is written as a JSON
-- escape, which jsonb stores as the same letter.

begin;

-- ---------------------------------------------------------------------------
-- Config, tunable from the admin page without a redeploy.
-- ---------------------------------------------------------------------------
insert into public.agent_config (agent_name, config)
values (
  'synthesis_stoic_life',
  '{
    "enabled": true,
    "model": "claude-sonnet-4-6",
    "check_model": "claude-haiku-4-5-20251001",
    "target_word_count": 2000,
    "authors": ["Seneca", "Epictetus", "Marcus Aurelius", "Musonius Rufus", "Diogenes La\u00ebrtius"],
    "author_works": {"Diogenes La\u00ebrtius": ["Lives of Eminent Philosophers, Book VII"]},
    "passages_per_author": 4,
    "max_passages": 18,
    "world_observation_max_age_days": 21,
    "review_by_months": 12,
    "min_approved_topics": 5,
    "max_pending_proposals": 8,
    "topic_dedup_similarity": 0.85,
    "gap_similarity_threshold": 0.30,
    "gap_window_days": 60,
    "gap_min_members": 3,
    "gap_min_words": 6,
    "gap_cluster_similarity": 0.80,
    "gap_max_questions": 200,
    "journal_window_days": 30,
    "journal_min_members": 3,
    "primary_works": [
      {"author": "Epictetus", "work": "Discourses"},
      {"author": "Epictetus", "work": "Enchiridion"},
      {"author": "Seneca", "work": "Letters"},
      {"author": "Marcus Aurelius", "work": "Meditations"}
    ],
    "primary_sample_size": 40
  }'::jsonb
)
on conflict (agent_name) do nothing;

commit;
