// ---------------------------------------------------------------------------
// Canonical concept layer — the ONE place raw theme labels become Observatory
// concepts. Raw labels (journal analysis themes via the gap agent, synthesis
// concepts, retrieval logs) arrive as long near-duplicate phrases; each maps
// through concept_aliases to a single canonical_concepts row with a short
// noun-form name (Greek where one is standard: askēsis, prosochē, prohairesis).
//
// Ongoing rule, enforced here and nowhere else:
//   resolveConcept(rawLabel) → alias hit, else embed the label and map it to
//   the nearest canonical concept at cosine ≥ CONCEPT_MERGE_THRESHOLD (0.80),
//   else name a new canonical concept via one claude-haiku call.
//
// Write paths call this directly where they run in-process (gap agent); entry
// paths that cannot (the Vercel admin twin writes raw themes straight to
// concept_passage_map) are covered by lazy resolution in the Observatory read
// path — any unmapped raw label found while building the constellation is
// resolved fire-and-forget and joins the sky on the next build.
// ---------------------------------------------------------------------------
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MERGE_THRESHOLD = parseFloat(process.env.CONCEPT_MERGE_THRESHOLD || '0.80');

// ---- embeddings (text-embedding-3-small, same model as the rest of Arete) ----
async function embedLabel(text) {
  if (!process.env.OPENAI_API_KEY) return null;
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`embedding failed: ${res.status}`);
  const data = await res.json();
  return data.data?.[0]?.embedding || null;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

// pgvector columns come back as strings ("[0.1,0.2,…]") through PostgREST.
function parseVector(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
  return null;
}

// ---- naming (one batched claude-haiku call for any number of clusters) ----
const NAMING_SYSTEM = `You name philosophical concepts for a public star map of a Stoic-centered corpus.
For each numbered cluster of raw theme labels you receive, return ONE canonical name:
- A noun or noun phrase, 1 to 3 words. Never a sentence, never a gerund phrase longer than three words.
- Prefer the standard Greek term when one exists (Askēsis, Prosochē, Prohairesis, Apatheia, Philanthrōpia, Elenchus).
- Title Case. No punctuation except diacritics.
Also return a one-sentence plain description of the concept.
Return ONLY a JSON array, one object per cluster, in the same order:
[{"name": "...", "description": "..."}]`;

async function nameClusters(clusters) {
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('CLAUDE_API_KEY missing — cannot name concepts');
  const user = clusters.map((labels, i) => `${i + 1}. ${labels.join(' | ')}`).join('\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: NAMING_SYSTEM,
      messages: [{ role: 'user', content: `Clusters:\n${user}` }],
    }),
  });
  if (!res.ok) throw new Error(`naming failed: ${res.status}`);
  const data = await res.json();
  let raw = (data.content?.find(b => b.type === 'text')?.text || '').trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const m = raw.match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(m ? m[0] : raw);
  if (!Array.isArray(parsed) || parsed.length !== clusters.length) {
    throw new Error('naming returned wrong shape');
  }
  return parsed.map(x => ({
    name: String(x.name || '').trim().slice(0, 60),
    description: String(x.description || '').trim().slice(0, 300),
  }));
}

// ---- cached alias map (raw_label → { id, name }) ----
let aliasCache = null; // { map: Map, at: number }
const ALIAS_TTL = 5 * 60 * 1000;

async function getAliasMap(force = false) {
  if (!force && aliasCache && Date.now() - aliasCache.at < ALIAS_TTL) return aliasCache.map;
  const [{ data: aliases }, { data: canonicals }] = await Promise.all([
    supabase.from('concept_aliases').select('raw_label, canonical_id'),
    supabase.from('canonical_concepts').select('id, name'),
  ]);
  const byId = new Map((canonicals || []).map(c => [c.id, c]));
  const map = new Map();
  for (const a of aliases || []) {
    const c = byId.get(a.canonical_id);
    if (c) map.set(a.raw_label, { id: c.id, name: c.name });
  }
  aliasCache = { map, at: Date.now() };
  return map;
}

function invalidateAliasCache() { aliasCache = null; }

// ---- resolution ----
// Canonical rows created before OPENAI_API_KEY was reachable may lack an
// embedding; backfill from name + description on first use.
async function loadCanonicalsWithEmbeddings() {
  const { data } = await supabase
    .from('canonical_concepts').select('id, name, description, embedding');
  const rows = data || [];
  for (const row of rows) {
    row.embedding = parseVector(row.embedding);
    if (!row.embedding) {
      const emb = await embedLabel(row.description ? `${row.name} — ${row.description}` : row.name);
      if (emb) {
        await supabase.from('canonical_concepts').update({ embedding: emb }).eq('id', row.id);
        row.embedding = emb;
      }
    }
  }
  return rows;
}

async function insertAlias(rawLabel, canonicalId) {
  await supabase.from('concept_aliases')
    .upsert({ raw_label: rawLabel, canonical_id: canonicalId }, { onConflict: 'raw_label', ignoreDuplicates: true });
  invalidateAliasCache();
}

// Map one raw label to its canonical concept, creating the mapping (and, when
// nothing is close enough, the concept) as needed. Returns { id, name } or
// null when resolution is impossible right now (no embedding key); callers
// treat null as "leave unmapped, try again later" — a raw label is never
// surfaced publicly.
async function resolveConcept(rawLabel) {
  const label = String(rawLabel || '').trim();
  if (!label) return null;

  const aliases = await getAliasMap();
  if (aliases.has(label)) return aliases.get(label);

  const emb = await embedLabel(label);
  if (!emb) return null; // no OPENAI_API_KEY here — stays unmapped, never shown raw

  const canonicals = await loadCanonicalsWithEmbeddings();
  let best = null, bestSim = 0;
  for (const c of canonicals) {
    if (!c.embedding) continue;
    const sim = cosine(emb, c.embedding);
    if (sim > bestSim) { bestSim = sim; best = c; }
  }
  if (best && bestSim >= MERGE_THRESHOLD) {
    await insertAlias(label, best.id);
    return { id: best.id, name: best.name };
  }

  // Nothing close enough — a genuinely new concept. Name it, guarding the
  // unique canonical name: if haiku lands on an existing name, that IS the
  // same concept; merge into it instead of duplicating.
  const [named] = await nameClusters([[label]]);
  const existing = canonicals.find(c => c.name.toLowerCase() === named.name.toLowerCase());
  if (existing) {
    await insertAlias(label, existing.id);
    return { id: existing.id, name: existing.name };
  }
  const nameEmb = await embedLabel(named.description ? `${named.name} — ${named.description}` : named.name);
  const { data: inserted, error } = await supabase
    .from('canonical_concepts')
    .insert({ name: named.name, description: named.description || null, embedding: nameEmb })
    .select('id, name')
    .single();
  if (error || !inserted) {
    // Unique-name race: someone else inserted it; alias into theirs.
    const { data: again } = await supabase
      .from('canonical_concepts').select('id, name').ilike('name', named.name).limit(1);
    if (again && again[0]) {
      await insertAlias(label, again[0].id);
      return { id: again[0].id, name: again[0].name };
    }
    throw new Error(`canonical insert failed: ${error?.message}`);
  }
  await insertAlias(inserted.name, inserted.id); // self-alias
  await insertAlias(label, inserted.id);
  return { id: inserted.id, name: inserted.name };
}

// Fire-and-forget batch resolution for read paths that discover unmapped raw
// labels. De-duped in-process so a hot endpoint never queues the same label
// twice; failures are silent (the label just stays unmapped and unshown).
const inFlight = new Set();
function resolveConceptsLazily(rawLabels) {
  for (const label of rawLabels || []) {
    const l = String(label || '').trim();
    if (!l || inFlight.has(l)) continue;
    inFlight.add(l);
    resolveConcept(l)
      .catch(err => console.warn('[canonical-concepts] lazy resolve failed:', l, err.message))
      .finally(() => inFlight.delete(l));
  }
}

module.exports = {
  MERGE_THRESHOLD,
  embedLabel,
  cosine,
  parseVector,
  nameClusters,
  getAliasMap,
  invalidateAliasCache,
  resolveConcept,
  resolveConceptsLazily,
};
