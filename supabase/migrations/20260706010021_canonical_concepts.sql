-- Canonical concept layer — Observatory repair Part 1.
--
-- Raw theme labels (journal analysis themes via the gap agent, retrieval
-- logs, synthesis concepts) fragment into near-duplicate phrasings
-- ("discipline of daily routine as embodied stoic practice", "disciplined
-- daily routine as stoic askesis", …). The Observatory must render ONE star
-- per concept, so every raw label maps through concept_aliases to a single
-- canonical_concepts row with a short noun-form name (Greek where standard).
--
-- Raw labels stay where they are (concept_passage_map is the gap agent's
-- learning layer and is keyed by raw theme); this layer is a mapping on top,
-- never a rewrite underneath.

CREATE TABLE IF NOT EXISTS canonical_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  embedding vector(1536),          -- text-embedding-3-small of the name/description
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exact-duplicate canonical names are impossible, case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS canonical_concepts_name_key
  ON canonical_concepts (lower(name));

-- Every raw label that has ever entered the system maps to one canonical
-- concept. Each canonical name is also self-aliased so labels already in
-- canonical form (new retrieval_events rows) resolve through the same path.
CREATE TABLE IF NOT EXISTS concept_aliases (
  raw_label TEXT PRIMARY KEY,
  canonical_id UUID NOT NULL REFERENCES canonical_concepts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS concept_aliases_canonical_idx
  ON concept_aliases (canonical_id);

-- Backend-only, same posture as concept_passage_map: RLS on, no policies.
ALTER TABLE canonical_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_aliases ENABLE ROW LEVEL SECURITY;

-- The Observatory aggregates now speak canonical names only. Raw labels with
-- no alias yet are EXCLUDED (never shown raw); the server resolves unmapped
-- labels lazily and they appear once canonicalized.
create or replace function observatory_corpus_stats()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'totalChunks', (select count(*) from rag_corpus),
    'authorCount', (select count(distinct author) from rag_corpus where author is not null),
    'byAuthor', (
      select coalesce(jsonb_object_agg(author, cnt), '{}'::jsonb)
      from (select author, count(*) as cnt from rag_corpus where author is not null group by author) a
    ),
    'byConcept', (
      select coalesce(jsonb_object_agg(name, cnt), '{}'::jsonb)
      from (
        select cc.name, count(*) as cnt
        from concept_passage_map cpm
        join concept_aliases ca on ca.raw_label = cpm.concept
        join canonical_concepts cc on cc.id = ca.canonical_id
        group by cc.name
      ) c
    ),
    'births', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'author', author, 'work', work, 'firstChunkAt', first_at
      ) order by first_at desc), '[]'::jsonb)
      from (
        select author, work, min(created_at) as first_at
        from rag_corpus
        group by author, work
        having min(created_at) > now() - interval '48 hours'
      ) b
    )
  );
$$;

create or replace function observatory_retrieval_counts()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'day', (
      select coalesce(jsonb_object_agg(name, cnt), '{}'::jsonb)
      from (
        select cc.name, count(*) as cnt
        from retrieval_events re
        join concept_aliases ca on ca.raw_label = re.concept
        join canonical_concepts cc on cc.id = ca.canonical_id
        where re.created_at > now() - interval '24 hours'
        group by cc.name
      ) d
    ),
    'week', (
      select coalesce(jsonb_object_agg(name, cnt), '{}'::jsonb)
      from (
        select cc.name, count(*) as cnt
        from retrieval_events re
        join concept_aliases ca on ca.raw_label = re.concept
        join canonical_concepts cc on cc.id = ca.canonical_id
        where re.created_at > now() - interval '7 days'
        group by cc.name
      ) w
    ),
    'weekByAuthor', (
      select coalesce(jsonb_object_agg(author, cnt), '{}'::jsonb)
      from (
        select author, count(*) as cnt from retrieval_events
        where created_at > now() - interval '7 days' and author is not null
        group by author
      ) wa
    )
  );
$$;
