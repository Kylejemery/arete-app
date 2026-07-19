-- Learning System Phase B — the Hebbian graph.
--
-- concept_edges: undirected chunk-to-chunk edges over rag_corpus, strengthened
-- when two chunks are used together in a response with a good outcome and
-- decayed when they stop firing. Written ONLY by the nightly Consolidation
-- Agent (server/agents/consolidation-agent.js) — never inline at retrieval
-- time, so retrieval latency stays clean and every update is auditable.
--
-- consolidation_runs: one audit row per pass of each nightly run.

create table if not exists concept_edges (
  chunk_a uuid not null,
  chunk_b uuid not null,
  weight float not null default 0,
  co_retrievals int not null default 0,
  successful_co_retrievals int not null default 0,
  last_fired timestamptz,
  created_at timestamptz not null default now(),
  primary key (chunk_a, chunk_b),
  check (chunk_a < chunk_b)            -- canonical ordering, undirected edge
);
create index if not exists concept_edges_weight_idx on concept_edges (weight desc);
create index if not exists concept_edges_chunk_b_idx on concept_edges (chunk_b);

alter table concept_edges enable row level security;

create table if not exists consolidation_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  pass text not null,                  -- 'hebbian' | 'decay' (Phase C adds 'synthesis' | 'prune' | 'report')
  stats jsonb,
  artifacts jsonb
);

alter table consolidation_runs enable row level security;

-- One pair-event: EMA the edge weight toward the outcome score. Insert-or-
-- update atomically so the agent can apply events sequentially without a
-- read-modify-write race. a/b may arrive in either order.
create or replace function apply_hebbian_edge(
  p_a uuid,
  p_b uuid,
  p_score float,
  p_learning_rate float default 0.1
)
returns void
language sql
as $$
  insert into concept_edges (chunk_a, chunk_b, weight, co_retrievals, successful_co_retrievals, last_fired)
  values (
    least(p_a, p_b),
    greatest(p_a, p_b),
    p_learning_rate * p_score,        -- EMA from weight 0
    1,
    case when p_score >= 0.5 then 1 else 0 end,
    now()
  )
  on conflict (chunk_a, chunk_b) do update set
    weight = concept_edges.weight + p_learning_rate * (p_score - concept_edges.weight),
    co_retrievals = concept_edges.co_retrievals + 1,
    successful_co_retrievals = concept_edges.successful_co_retrievals
      + case when p_score >= 0.5 then 1 else 0 end,
    last_fired = now();
$$;

-- Nightly decay + prune (spec B3). Returns counts for the audit row.
create or replace function decay_concept_edges(
  p_decay float default 0.995,
  p_stale_days int default 7,
  p_min_weight float default 0.02,
  p_min_co int default 3
)
returns jsonb
language plpgsql
as $$
declare
  decayed int;
  pruned int;
begin
  update concept_edges
  set weight = weight * p_decay
  where last_fired < now() - make_interval(days => p_stale_days);
  get diagnostics decayed = row_count;

  delete from concept_edges
  where weight < p_min_weight and co_retrievals < p_min_co;
  get diagnostics pruned = row_count;

  return jsonb_build_object('decayed', decayed, 'pruned', pruned);
end;
$$;

-- Agent config row — lets the admin dashboard tune without a redeploy.
INSERT INTO agent_config (agent_name, config) VALUES (
  'consolidation-agent',
  '{
    "enabled": true,
    "learning_rate": 0.1,
    "decay": 0.995,
    "stale_days": 7,
    "min_weight": 0.02,
    "min_co_retrievals": 3,
    "window_hours_first_run": 168
  }'
) ON CONFLICT (agent_name) DO NOTHING;
