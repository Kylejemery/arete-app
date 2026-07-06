// ---------------------------------------------------------------------------
// One-time concept consolidation — Observatory repair Part 1.
//
// Gathers every raw concept label in the system (concept_passage_map +
// retrieval_events), embeds each label (text-embedding-3-small), clusters by
// cosine similarity at CONCEPT_MERGE_THRESHOLD (default 0.80, tune by
// inspecting the printed pair report), names each cluster with ONE batched
// claude-haiku call, and writes canonical_concepts + concept_aliases.
//
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY,
// CLAUDE_API_KEY (or ANTHROPIC_API_KEY). Refuses to run over an already
// populated canonical_concepts unless --force is passed.
//
//   node scripts/consolidate-concepts.js [--dry-run] [--force]
// ---------------------------------------------------------------------------
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const {
  MERGE_THRESHOLD, embedLabel, cosine, nameClusters,
} = require('../lib/canonical-concepts');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY required to embed labels');

  const { count: existing } = await supabase
    .from('canonical_concepts').select('id', { count: 'exact', head: true });
  if ((existing || 0) > 0 && !FORCE) {
    throw new Error(`canonical_concepts already holds ${existing} rows — pass --force to re-run`);
  }

  // 1. Every raw label in the system, weighted by how deep it runs.
  const [{ data: cpm }, { data: rev }] = await Promise.all([
    supabase.from('concept_passage_map').select('concept'),
    supabase.from('retrieval_events').select('concept'),
  ]);
  const weight = new Map();
  for (const r of [...(cpm || []), ...(rev || [])]) {
    const c = (r.concept || '').trim();
    if (c) weight.set(c, (weight.get(c) || 0) + 1);
  }
  const labels = [...weight.keys()].sort((a, b) => weight.get(b) - weight.get(a));
  console.log(`${labels.length} distinct raw labels`);

  // 2. Embed every label.
  const embs = new Map();
  for (const label of labels) embs.set(label, await embedLabel(label));

  // 3. Greedy agglomerative clustering, heaviest labels seed first. A label
  //    joins the first cluster whose centroid it clears the threshold with.
  const clusters = []; // { labels: string[], centroid: number[] }
  for (const label of labels) {
    const e = embs.get(label);
    let placed = false;
    for (const cl of clusters) {
      if (cosine(e, cl.centroid) >= MERGE_THRESHOLD) {
        cl.labels.push(label);
        const n = cl.labels.length;
        cl.centroid = cl.centroid.map((v, i) => (v * (n - 1) + e[i]) / n);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ labels: [label], centroid: [...e] });
  }
  console.log(`→ ${clusters.length} clusters at threshold ${MERGE_THRESHOLD}`);
  for (const [i, cl] of clusters.entries()) {
    console.log(`  ${i + 1}. ${cl.labels.join('  |  ')}`);
  }

  // 4. One batched haiku call names every cluster.
  const named = await nameClusters(clusters.map(c => c.labels));

  // De-duplicate names haiku may have repeated across clusters: repeats merge
  // into the first cluster with that name (same name = same concept).
  const byName = new Map();
  for (const [i, cl] of clusters.entries()) {
    const key = named[i].name.toLowerCase();
    if (byName.has(key)) byName.get(key).labels.push(...cl.labels);
    else byName.set(key, { ...named[i], labels: cl.labels, centroid: cl.centroid });
  }
  const finals = [...byName.values()];
  console.log(`\n${labels.length} raw labels → ${finals.length} canonical concepts:`);
  for (const f of finals) console.log(`  ${f.name} ← ${f.labels.length} labels`);

  if (DRY_RUN) { console.log('\n(dry run — nothing written)'); return; }

  // 5. Write canonical concepts (embedding = the name/description, the same
  //    thing resolveConcept compares future labels against) + aliases,
  //    including a self-alias per canonical name.
  for (const f of finals) {
    const nameEmb = await embedLabel(f.description ? `${f.name} — ${f.description}` : f.name);
    const { data: row, error } = await supabase
      .from('canonical_concepts')
      .insert({ name: f.name, description: f.description || null, embedding: nameEmb })
      .select('id')
      .single();
    if (error) throw new Error(`insert ${f.name}: ${error.message}`);
    const aliasRows = [...new Set([f.name, ...f.labels])].map(raw => ({
      raw_label: raw, canonical_id: row.id,
    }));
    const { error: aErr } = await supabase.from('concept_aliases')
      .upsert(aliasRows, { onConflict: 'raw_label', ignoreDuplicates: true });
    if (aErr) throw new Error(`aliases for ${f.name}: ${aErr.message}`);
  }
  console.log('\nDone.');
}

main().catch(err => { console.error(err.message); process.exit(1); });
