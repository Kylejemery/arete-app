// server/agents/convergence-agent.js
//
// Convergence Agent — the fork of the Inquiry Agent that runs the other
// direction. Where Inquiry finds the QUESTION the corpus cannot answer, the
// Convergence Agent finds the ANSWER the corpus already contains but has never
// assembled. It samples passages that sit FAR APART in embedding space, holds
// them together, and states the one conclusion that follows from all of them
// and is written in none of them. That conclusion is the sumperasma: the thing
// gathered at the end of a chain of premises.
//
// The agent supplies VALIDITY and NOVELTY. It never judges SIGNIFICANCE — a
// valid, novel conclusion can be philosophically worthless, and the agent has
// no sense of which conclusions are worth wanting. Significance is the human
// review gate (convergences.significance_note, written by Kyle, never here).
//
// Two-pass design, mirroring the Inquiry Agent so it slots into the same wave:
//   Pass 1 — Assemble: rotate a seed theme, pull a wide loose pool (~40), then
//            greedily select 4-6 passages that MAXIMIZE minimum pairwise
//            embedding distance subject to >=3 authors and >=2 traditions. Ask
//            Claude for the one conclusion that follows and that none states.
//   Pass 2 — Test: novelty (already_stated is discarded), validity (weaker than
//            suggestive is discarded), and a 400-600 word pursuit that names the
//            sumperasma and the single breakpoint premise.
//
// Every survivor is stored in `convergences` as `pending_review`. Convergence
// output is NEVER ingested into rag_corpus — it is the corpus's conjecture about
// its own contents, authored by the corpus as a whole, never any one counselor.
//
// Runs weekly (its own Railway cron, Mondays ~06:30 UTC, after Inquiry). Built
// to be invokable manually for testing, exactly like the other agents.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DEFAULT_MODEL = 'claude-sonnet-4-6';

// The corpus's own syntheses are authored under this name — convergence selects
// across PRIMARY texts, never the corpus's own conjecture.
const SYNTHESIS_AUTHOR = 'Arete Synthesis';

// --- Dash sanitizer --------------------------------------------------------
//
// No em dashes and no en dashes may reach a stored row. This is a code-level
// strip on the agent's output before insert, NOT a prompt instruction the model
// can drift past. Applied deeply to every string in the row (including the
// jsonb arrays) right before the insert. There is no existing sanitizer on the
// Inquiry or Dreaming write path to reuse, so this is the canonical one.
//
// U+2012 figure dash, U+2013 en dash, U+2014 em dash, U+2015 horizontal bar.
function stripDashes(value) {
  if (typeof value !== 'string') return value;
  return value
    // dash sitting between two digits is a numeric range → hyphen
    .replace(/(\d)\s*[‒–—―]\s*(\d)/g, '$1-$2')
    // any remaining dash (spaced or not) → comma + space, then tidy doubles
    .replace(/\s*[‒–—―]\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Walk an arbitrary value and strip dashes from every string within it.
function sanitizeDeep(value) {
  if (typeof value === 'string') return stripDashes(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeDeep(v);
    return out;
  }
  return value;
}

// --- Tradition map (copied from the Inquiry Agent, same source of truth) -----
// A convergence set must span >=2 traditions, not just >=2 authors, so the
// conclusion genuinely reaches across worldviews. Unknown authors → 'other'.
const TRADITION_BY_AUTHOR = {
  'marcus aurelius': 'stoic', 'epictetus': 'stoic', 'seneca': 'stoic',
  'zeno of citium': 'stoic', 'cleanthes': 'stoic', 'chrysippus': 'stoic',
  'musonius rufus': 'stoic', 'gaius musonius rufus': 'stoic', 'hierocles': 'stoic',
  'cicero': 'stoic', 'marcus tullius cicero': 'stoic',
  'plato': 'greek', 'aristotle': 'greek', 'socrates': 'greek',
  'heraclitus': 'greek', 'epicurus': 'greek', 'diogenes': 'greek',
  'plutarch': 'greek', 'plotinus': 'greek', 'pythagoras': 'greek',
  'confucius': 'eastern', 'laozi': 'eastern', 'lao tzu': 'eastern',
  'mencius': 'eastern', 'zhuangzi': 'eastern', 'chuang tzu': 'eastern',
  'sun tzu': 'eastern', 'buddha': 'eastern', 'the buddha': 'eastern',
  'gautama buddha': 'eastern', 'bodhidharma': 'eastern', 'nagarjuna': 'eastern',
  'montaigne': 'modern', 'michel de montaigne': 'modern',
  'nietzsche': 'modern', 'friedrich nietzsche': 'modern',
  'schopenhauer': 'modern', 'arthur schopenhauer': 'modern',
  'kant': 'modern', 'immanuel kant': 'modern', 'spinoza': 'modern',
  'emerson': 'modern', 'ralph waldo emerson': 'modern',
  'thoreau': 'modern', 'henry david thoreau': 'modern',
  'kierkegaard': 'modern', 'william james': 'modern', 'hume': 'modern',
  'thomas a kempis': 'christian', 'augustine': 'christian', 'boethius': 'christian',
  'aquinas': 'christian', 'pascal': 'christian', 'blaise pascal': 'christian',
};

function traditionFor(author) {
  if (!author) return 'other';
  const key = author.toLowerCase().trim();
  if (TRADITION_BY_AUTHOR[key]) return TRADITION_BY_AUTHOR[key];
  for (const [name, trad] of Object.entries(TRADITION_BY_AUTHOR)) {
    if (key.includes(name) || name.includes(key)) return trad;
  }
  return 'other';
}

// Perennial themes — the in-code rotation the theme selection degrades to when
// no theme-source table is present. Broad enough that each seeds a coherent
// pool across traditions.
const CANONICAL_THEMES = [
  'the good life and what it requires',
  'death and how to face it',
  'what is and is not within our control',
  'virtue and whether it is sufficient for happiness',
  'desire, its satisfaction, and its cost',
  'friendship and what we owe to others',
  'time, its passage, and the present moment',
  'the self, identity, and what persists',
  'suffering and its place in a life',
  'freedom, fate, and necessity',
  'duty and the demands of the whole',
  'nature and living in accordance with it',
  'reason, emotion, and their government',
  'wealth, fame, and external goods',
  'habit, discipline, and the shaping of character',
  'justice and how to treat one another',
  'wisdom and the limits of knowledge',
  'change, permanence, and the flux of things',
];

// Monday (UTC) of the current week, as YYYY-MM-DD — matches the other agents.
function getMondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

// Graceful degradation: run a query that may reference a table which does not
// exist yet. Never throws — logs and returns the fallback.
async function guarded(label, fn, fallback = null) {
  try {
    return await fn();
  } catch (e) {
    console.warn(`[convergence-agent] soft-fail (${label}): ${e.message}`);
    return fallback;
  }
}

// Embed a short string with text-embedding-3-small. Returns the vector or null.
async function embed(text) {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) {
      console.error(`  embedding failed (${res.status})`);
      return null;
    }
    return (await res.json()).data[0].embedding;
  } catch (e) {
    console.error('  embedding error:', e.message);
    return null;
  }
}

async function callClaude(model, system, userMessage, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: maxTokens || 2000,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const block = (json.content || []).find(b => b.type === 'text');
  const raw = block ? block.text : '';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// --- Config ----------------------------------------------------------------

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'convergence-agent')
    .maybeSingle();

  return data?.config || {
    enabled: true,
    run_hour_utc: 6,
    run_minute_utc: 30,
    run_day: 'monday',
    model: DEFAULT_MODEL,
    convergences_per_run: 3,
    pool_size: 40,             // wide loose pool related to the seed theme
    set_min: 4,                // selected-set size bounds
    set_max: 6,
    min_authors: 3,            // hard constraint on a selected set
    min_traditions: 2,         // hard constraint on a selected set
    max_set_attempts: 6,       // sets to try before giving up on this run
    pursuit_min_words: 400,
    pursuit_max_words: 600,
    novelty_similarity_threshold: 0.82, // >= this AND Claude confirms → already_stated
  };
}

// --- Pass 1a. Seed theme (rotation, with graceful degradation) --------------

// Rotate a seed theme per run. Primary source is the approved-synthesis titles
// (the themes the corpus has recently worked over); degrade to the in-code
// CANONICAL_THEMES rotation if that table is absent or empty. Never throws.
async function getSeedTheme() {
  const fromSynthesis = await guarded('synthesis theme source', async () => {
    const { data, error } = await supabase
      .from('synthesis_documents')
      .select('title, status')
      .limit(200);
    if (error) throw new Error(error.message);
    const titles = (data || [])
      .filter(r => r.title && (!r.status || ['approved', 'starred', 'published', 'visible'].includes(r.status)))
      .map(r => r.title);
    if (titles.length === 0) return null;
    return titles[Math.floor(Math.random() * titles.length)];
  });

  if (fromSynthesis) {
    return { text: fromSynthesis, source: 'approved_synthesis' };
  }
  const theme = CANONICAL_THEMES[Math.floor(Math.random() * CANONICAL_THEMES.length)];
  return { text: theme, source: 'canonical_rotation' };
}

// --- Pass 1b. Loose pool ----------------------------------------------------

// Wide, loosely-topical pool related to the seed theme. The far-apart selection
// happens next; this just narrows 12k passages to a coherent ~40 the conclusion
// can plausibly be ABOUT.
async function getThemePool(themeText, config) {
  const embedding = await embed(themeText);
  if (!embedding) throw new Error('theme embedding failed (OPENAI_API_KEY?)');
  const poolSize = config.pool_size || 40;
  const { data, error } = await supabase.rpc('convergence_seed_pool', {
    theme_embedding: embedding,
    pool_size: poolSize,
  });
  if (error) throw new Error(`convergence_seed_pool failed: ${error.message}`);
  return (data || [])
    .filter(p => p.author && p.author !== SYNTHESIS_AUTHOR && p.chunk_text)
    .map(p => ({
      id: p.id,
      author: p.author,
      work: p.work,
      chunk_text: p.chunk_text,
      text_type: p.text_type,
      tradition: traditionFor(p.author),
      theme_similarity: p.similarity,
    }));
}

// Pairwise cosine-distance matrix for the pool, keyed id->id->distance. Vectors
// stay server-side; we run the greedy selection over this small matrix.
async function getDistanceMatrix(pool) {
  const ids = pool.map(p => p.id);
  const { data, error } = await supabase.rpc('convergence_pairwise_distances', { chunk_ids: ids });
  if (error) throw new Error(`convergence_pairwise_distances failed: ${error.message}`);
  const dist = {};
  for (const id of ids) dist[id] = {};
  for (const row of data || []) {
    dist[row.a][row.b] = row.distance;
    dist[row.b][row.a] = row.distance;
  }
  return dist;
}

function distanceBetween(dist, a, b) {
  if (a === b) return 0;
  const d = dist[a] && dist[a][b];
  return typeof d === 'number' ? d : 0;
}

// Mean of all unordered pairwise distances within a set of passages.
function meanPairwiseDistance(dist, passages) {
  const ids = passages.map(p => p.id);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      sum += distanceBetween(dist, ids[i], ids[j]);
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

// Minimum distance from a candidate passage to any passage already selected.
function minDistanceToSet(dist, candidateId, selected) {
  let min = Infinity;
  for (const s of selected) {
    const d = distanceBetween(dist, candidateId, s.id);
    if (d < min) min = d;
  }
  return min === Infinity ? 0 : min;
}

// --- Pass 1c. The selection rule (the whole agent) --------------------------
//
// Greedy max-min diversity (farthest-point sampling): seed with the single
// farthest-apart pair in the pool, then repeatedly add the passage whose
// MINIMUM distance to the current set is largest — biased to introduce a new
// author or tradition when the set still lacks the required diversity, and to
// avoid a third passage from an author already twice present. Enforces the hard
// constraints (>=3 authors, >=2 traditions); returns null if the pool cannot
// satisfy them (correct: this theme's neighborhood is too homogeneous).
function selectDivergentSet(pool, dist, usedIds, config) {
  const available = pool.filter(p => !usedIds.has(p.id));
  if (available.length < (config.min_authors || 3)) return null;

  const minAuthors = config.min_authors || 3;
  const minTraditions = config.min_traditions || 2;
  const targetSize = Math.min(
    config.set_max || 6,
    Math.max(config.set_min || 4, Math.floor(Math.random() * ((config.set_max || 6) - (config.set_min || 4) + 1)) + (config.set_min || 4))
  );

  // Seed with the farthest-apart available pair.
  let best = null;
  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const d = distanceBetween(dist, available[i].id, available[j].id);
      if (!best || d > best.d) best = { a: available[i], b: available[j], d };
    }
  }
  if (!best) return null;

  const selected = [best.a, best.b];
  const authorCount = {};
  const traditions = new Set();
  for (const p of selected) {
    authorCount[p.author] = (authorCount[p.author] || 0) + 1;
    traditions.add(p.tradition);
  }

  while (selected.length < targetSize) {
    const selectedIds = new Set(selected.map(p => p.id));
    const distinctAuthors = Object.keys(authorCount).length;

    let pick = null;
    let pickScore = -Infinity;
    for (const cand of available) {
      if (selectedIds.has(cand.id)) continue;
      // Never a third passage from one author — it steals a slot from a voice.
      if ((authorCount[cand.author] || 0) >= 2) continue;

      let score = minDistanceToSet(dist, cand.id, selected);
      // Diversity bias: prefer candidates that repair a missing constraint.
      const needAuthors = distinctAuthors < minAuthors;
      const needTraditions = traditions.size < minTraditions;
      if (needAuthors && !authorCount[cand.author]) score += 0.15;
      if (needTraditions && !traditions.has(cand.tradition)) score += 0.15;
      // Mild penalty for a second passage from an already-present author.
      if (authorCount[cand.author]) score -= 0.05;

      if (score > pickScore) { pickScore = score; pick = cand; }
    }
    if (!pick) break;
    selected.push(pick);
    authorCount[pick.author] = (authorCount[pick.author] || 0) + 1;
    traditions.add(pick.tradition);
  }

  // Hard constraints. If unmet, one repair pass: swap the least-contributing
  // passage for the pool candidate that best adds the missing diversity.
  const ok = () =>
    Object.keys(authorCount).length >= minAuthors && traditions.size >= minTraditions;

  if (!ok()) {
    const selectedIds = new Set(selected.map(p => p.id));
    const repaired = tryRepair(selected, available, dist, selectedIds, minAuthors, minTraditions);
    if (repaired) return repaired;
    return null; // pool too homogeneous for this theme — a correct rejection
  }

  return selected;
}

// One-shot repair: find a pool candidate that introduces a missing author or
// tradition and swap it in for the selected passage contributing the least
// spread, if doing so satisfies both constraints.
function tryRepair(selected, available, dist, selectedIds, minAuthors, minTraditions) {
  const authorsIn = selected.map(p => p.author);
  const traditionsIn = new Set(selected.map(p => p.tradition));
  const distinctAuthors = new Set(authorsIn).size;

  const needTradition = traditionsIn.size < minTraditions;
  const candidates = available.filter(c =>
    !selectedIds.has(c.id) &&
    (needTradition ? !traditionsIn.has(c.tradition) : !authorsIn.includes(c.author))
  );
  if (candidates.length === 0) return null;

  // Passage least essential to spread: lowest mean distance to the rest.
  let weakestIdx = 0;
  let weakestScore = Infinity;
  for (let i = 0; i < selected.length; i++) {
    const rest = selected.filter((_, k) => k !== i);
    const meanD = rest.reduce((s, r) => s + distanceBetween(dist, selected[i].id, r.id), 0) / rest.length;
    // Removing a passage that is a duplicate author is preferable.
    const dupPenalty = authorsIn.filter(a => a === selected[i].author).length > 1 ? -0.2 : 0;
    const score = meanD + dupPenalty;
    if (score < weakestScore) { weakestScore = score; weakestIdx = i; }
  }

  const best = candidates.reduce((acc, c) => {
    const d = minDistanceToSet(dist, c.id, selected.filter((_, k) => k !== weakestIdx));
    return !acc || d > acc.d ? { c, d } : acc;
  }, null);
  if (!best) return null;

  const next = selected.slice();
  next[weakestIdx] = best.c;
  const okAuthors = new Set(next.map(p => p.author)).size >= minAuthors;
  const okTraditions = new Set(next.map(p => p.tradition)).size >= minTraditions;
  return okAuthors && okTraditions ? next : null;
}

// --- Pass 1d. Conclusion generation ----------------------------------------

const CONCLUDE_SYSTEM_PROMPT = `You are working with a corpus of primary philosophical texts. You are given a set of passages that sit FAR APART from one another: different authors, different traditions, different centuries. Your single job is to find the one conclusion that follows if all of these passages are true, and that NONE of them states on its own.

This conclusion is the sumperasma: the thing gathered at the end of a chain of premises. It is not a summary, not a theme, not a restatement of any passage. It is a NEW proposition that the passages jointly entail.

Discipline:
- If nothing non-trivial follows from holding these passages together, say so and return no conclusion. Do not manufacture one. A null result is correct and valuable.
- The conclusion must not be quotable from any single passage. If it is, it is a restatement, not a convergence.
- State it as a claim about how things are or how one should live, not as a question.
- Do not use em dashes or en dashes.`;

function buildConcludeMessage(passages) {
  const block = passages.map((p, i) =>
    `[passage ${i + 1} — ${p.author}, ${p.work} (${p.tradition})]\n${p.chunk_text}`
  ).join('\n\n');

  return `These passages were selected because they are maximally far apart in the corpus yet touch a common thread:

${block}

If all of these passages are true, what is the ONE conclusion that follows and that none of them states on its own?

Respond ONLY with valid JSON:
{
  "follows": true or false,
  "conclusion_text": "one or two sentences stating the sumperasma; empty if follows is false",
  "title": "an evocative title, 3 to 7 words, sentence case; empty if follows is false",
  "reasoning": "one sentence on why this follows from the set and is stated in none of them"
}`;
}

async function generateConclusion(passages, config) {
  const result = await callClaude(config.model, CONCLUDE_SYSTEM_PROMPT, buildConcludeMessage(passages), 1500);
  return {
    follows: result.follows === true,
    conclusion_text: (result.conclusion_text || '').trim(),
    title: (result.title || '').trim(),
    reasoning: (result.reasoning || '').trim(),
  };
}

// --- Pass 2a. Novelty -------------------------------------------------------

const NOVELTY_SYSTEM_PROMPT = `You judge whether a candidate conclusion is already present in a corpus of primary texts. You are shown the conclusion and the passages most similar to it in the corpus. Classify:
- "already_stated": a passage states this conclusion plainly. The corpus already holds it; it is not a convergence.
- "latent": a passage gestures toward it or contains it implicitly, but no passage states it outright.
- "novel": no shown passage states or clearly gestures at it.
Be strict about "already_stated": near-synonyms and partial overlaps are "latent", not "already_stated". Do not use em dashes or en dashes.`;

function buildNoveltyMessage(conclusion, matches) {
  const block = matches.map((m, i) =>
    `[${i + 1}] ${m.author} — ${m.work} (similarity ${Number(m.similarity).toFixed(3)})\n${m.chunk_text}`
  ).join('\n\n');
  return `Candidate conclusion:
${conclusion}

Most similar passages in the corpus:
${block}

Respond ONLY with valid JSON:
{ "classification": "already_stated" | "latent" | "novel", "closest_passage": 1, "why": "one sentence" }`;
}

// Returns { novelty, topSimilarity, matches } — novelty is null if it could not
// be judged (embedding failure), which the caller treats as a discard.
async function assessNovelty(conclusionText, config) {
  const embedding = await embed(conclusionText);
  if (!embedding) return { novelty: null, topSimilarity: null, matches: [] };

  const { data: matches, error } = await supabase.rpc('match_rag_corpus_ids', {
    query_embedding: embedding,
    match_count: 8,
  });
  if (error) {
    console.warn(`[convergence-agent] novelty retrieval failed: ${error.message}`);
    return { novelty: null, topSimilarity: null, matches: [] };
  }
  const top = (matches || []).filter(m => m.author !== SYNTHESIS_AUTHOR);
  const topSimilarity = top.length ? Number(top[0].similarity) : 0;

  const judged = await callClaude(config.model, NOVELTY_SYSTEM_PROMPT, buildNoveltyMessage(conclusionText, top.slice(0, 6)), 600);
  let novelty = ['already_stated', 'latent', 'novel'].includes(judged.classification)
    ? judged.classification
    : 'latent';

  // Similarity gate: a very high nearest-neighbor similarity overrides a lenient
  // model call — if the corpus has a near-identical passage, treat as stated.
  const threshold = config.novelty_similarity_threshold || 0.82;
  if (topSimilarity >= threshold && novelty === 'latent') novelty = 'already_stated';

  return { novelty, topSimilarity, matches: top };
}

// --- Pass 2b. Validity + pursuit -------------------------------------------

const PURSUIT_SYSTEM_PROMPT = `You are testing and working out a candidate conclusion (a sumperasma) that was drawn from a set of far-apart passages in a corpus of primary texts. You do two things:

1. Classify the entailment strength honestly:
   - "deductive": the conclusion follows necessarily; deny it and you must deny one of the passages.
   - "strong": the conclusion follows on any reasonable reading, though not with strict logical necessity.
   - "suggestive": the passages make the conclusion plausible and worth holding, but a reasonable person could accept the passages and resist the conclusion.
   - "invalid": the conclusion does not actually follow from the passages, even suggestively.
   Never dress up a suggestive convergence as deductive. Honesty about weakness is the point.

2. Write the pursuit: 400 to 600 words laying out the chain from the passages to the conclusion. Name the conclusion explicitly as the sumperasma. State the entailment strength in plain terms. Then identify the SINGLE premise whose removal collapses the whole conclusion — the breakpoint. This is what makes the convergence falsifiable and reviewable.

The conclusion is authored by the corpus as a whole, never by any single thinker. Do not use em dashes or en dashes anywhere.`;

function buildPursuitMessage(conclusion, passages, config) {
  const block = passages.map((p, i) =>
    `[passage ${i + 1} — ${p.author}, ${p.work} (${p.tradition})]\n${p.chunk_text}`
  ).join('\n\n');
  return `Candidate conclusion (sumperasma):
${conclusion}

The passages it was drawn from:
${block}

Respond ONLY with valid JSON:
{
  "entailment_strength": "deductive" | "strong" | "suggestive" | "invalid",
  "pursuit_text": "${config.pursuit_min_words || 400} to ${config.pursuit_max_words || 600} words",
  "breakpoint_text": "the single premise whose removal collapses the conclusion"
}`;
}

async function testAndPursue(conclusion, passages, config) {
  const result = await callClaude(config.model, PURSUIT_SYSTEM_PROMPT, buildPursuitMessage(conclusion, passages, config), 3000);
  const valid = ['deductive', 'strong', 'suggestive', 'invalid'];
  const entailment_strength = valid.includes(result.entailment_strength) ? result.entailment_strength : 'invalid';
  return {
    entailment_strength,
    pursuit_text: (result.pursuit_text || '').trim(),
    breakpoint_text: (result.breakpoint_text || '').trim(),
  };
}

// --- Main ------------------------------------------------------------------

// options.count — store up to this many convergences (overrides the configured
// convergences_per_run). Zero stored is acceptable and correct when nothing
// clears the bar; the bar is never lowered to fill a quota.
async function runConvergenceAgent(options = {}) {
  const startTime = Date.now();
  console.log(`=== Convergence Agent — ${new Date().toISOString()} ===`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    if (require.main === module) process.exit(1);
    return { stored: 0, considered: 0, error: 'missing_supabase_env' };
  }
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    if (require.main === module) process.exit(1);
    return { stored: 0, considered: 0, error: 'missing_claude_key' };
  }
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set — selection needs embeddings. Aborting.');
    if (require.main === module) process.exit(1);
    return { stored: 0, considered: 0, error: 'missing_openai_key' };
  }

  const config = await getAgentConfig();
  if (!config.enabled && !options.count) {
    console.log('[convergence-agent] disabled in config. Exiting.');
    return { stored: 0, considered: 0, disabled: true, convergences: [] };
  }

  const target = options.count ? Math.max(1, options.count) : (config.convergences_per_run || 3);
  const model = config.model || DEFAULT_MODEL;

  // Open a run row up front so even a zero-store run is recorded.
  const { data: runRow, error: runErr } = await supabase
    .from('convergence_runs')
    .insert({ started_at: new Date().toISOString() })
    .select('id')
    .single();
  if (runErr) {
    console.error(`[convergence-agent] could not open run row: ${runErr.message}`);
  }
  const runId = runRow?.id || null;

  const report = {
    seed_theme: null,
    seed_theme_source: null,
    pool_size: 0,
    baseline_nn_mean_distance: null,
    authors_touched: [],
    traditions_touched: [],
    distance_range: null,
    discards: [],
    degradations: [],
  };
  const stored = [];
  let considered = 0;

  try {
    // Pass 1 — theme + pool + distance matrix.
    const theme = await getSeedTheme();
    report.seed_theme = theme.text;
    report.seed_theme_source = theme.source;
    if (theme.source === 'canonical_rotation') {
      report.degradations.push('theme source degraded to canonical rotation');
    }
    console.log(`[convergence-agent] seed theme: "${theme.text}" (${theme.source})`);

    const pool = await getThemePool(theme.text, config);
    report.pool_size = pool.length;
    if (pool.length < (config.set_min || 4) * 2) {
      throw new Error(`theme pool too small (${pool.length})`);
    }

    const dist = await getDistanceMatrix(pool);

    // Baseline: mean pairwise distance of the theme's nearest neighbors (the top
    // of the pool). The selected sets must beat this, or the selection rule is
    // broken and this is just Synthesis with extra steps.
    const nnCount = Math.min(config.set_max || 6, pool.length);
    report.baseline_nn_mean_distance = meanPairwiseDistance(dist, pool.slice(0, nnCount));

    const authorsTouched = new Set();
    const traditionsTouched = new Set();
    const usedIds = new Set();
    const maxAttempts = config.max_set_attempts || 6;
    let minSpread = Infinity;
    let maxSpread = -Infinity;

    for (let attempt = 0; attempt < maxAttempts && stored.length < target; attempt++) {
      const set = selectDivergentSet(pool, dist, usedIds, config);
      if (!set) {
        report.discards.push({ attempt, reason: 'no divergent set satisfying >=3 authors / >=2 traditions' });
        break; // pool exhausted for diversity — stop, do not lower the bar
      }
      considered++;
      for (const p of set) usedIds.add(p.id);

      const setAuthors = [...new Set(set.map(p => p.author))];
      const setTraditions = [...new Set(set.map(p => p.tradition))];
      const spread = meanPairwiseDistance(dist, set);
      minSpread = Math.min(minSpread, spread);
      maxSpread = Math.max(maxSpread, spread);

      console.log(
        `[convergence-agent] set ${attempt + 1}: ${set.length} passages | ` +
        `authors ${setAuthors.join(', ')} | traditions ${setTraditions.join(', ')} | ` +
        `spread ${spread.toFixed(4)} (baseline ${report.baseline_nn_mean_distance.toFixed(4)})`
      );

      // Pass 1d — conclusion.
      let conclusion;
      try {
        conclusion = await generateConclusion(set, config);
      } catch (e) {
        report.discards.push({ attempt, reason: `conclusion generation error: ${e.message}` });
        continue;
      }
      if (!conclusion.follows || !conclusion.conclusion_text) {
        report.discards.push({ attempt, reason: 'no non-trivial conclusion follows from the set' });
        continue;
      }

      // Pass 2a — novelty.
      const nov = await assessNovelty(conclusion.conclusion_text, config);
      if (nov.novelty === null) {
        report.discards.push({ attempt, reason: 'novelty could not be assessed (embedding failure)' });
        continue;
      }
      if (nov.novelty === 'already_stated') {
        report.discards.push({ attempt, reason: `already_stated (top similarity ${Number(nov.topSimilarity).toFixed(3)})`, conclusion: conclusion.conclusion_text });
        console.log(`  discarded: already_stated (sim ${Number(nov.topSimilarity).toFixed(3)})`);
        continue;
      }

      // Pass 2b — validity + pursuit.
      let vp;
      try {
        vp = await testAndPursue(conclusion.conclusion_text, set, config);
      } catch (e) {
        report.discards.push({ attempt, reason: `pursuit error: ${e.message}` });
        continue;
      }
      if (vp.entailment_strength === 'invalid') {
        report.discards.push({ attempt, reason: 'entailment weaker than suggestive (invalid)', conclusion: conclusion.conclusion_text });
        console.log('  discarded: invalid entailment');
        continue;
      }

      // Survivor. Sanitize deeply (dash strip) right before insert.
      setAuthors.forEach(a => authorsTouched.add(a));
      setTraditions.forEach(t => traditionsTouched.add(t));

      const row = sanitizeDeep({
        run_id: runId,
        title: conclusion.title || 'Untitled convergence',
        conclusion_text: conclusion.conclusion_text,
        source_passage_ids: set.map(p => p.id),
        source_authors: setAuthors,
        source_traditions: setTraditions,
        entailment_strength: vp.entailment_strength,
        novelty: nov.novelty,
        mean_pairwise_distance: spread,
        pursuit_text: vp.pursuit_text,
        breakpoint_text: vp.breakpoint_text,
        status: 'pending_review',
      });

      const { error: insErr } = await supabase.from('convergences').insert(row);
      if (insErr) {
        report.discards.push({ attempt, reason: `insert failed: ${insErr.message}` });
        continue;
      }
      stored.push({
        title: row.title,
        conclusion: row.conclusion_text,
        entailment_strength: row.entailment_strength,
        novelty: row.novelty,
        authors: setAuthors,
        traditions: setTraditions,
        mean_pairwise_distance: spread,
      });
      console.log(`  stored: "${row.title}" [${row.entailment_strength}, ${row.novelty}]`);

      await new Promise(r => setTimeout(r, 1500)); // rate limit (3 Claude calls/candidate)
    }

    report.authors_touched = [...authorsTouched];
    report.traditions_touched = [...traditionsTouched];
    report.distance_range = (minSpread === Infinity)
      ? null
      : { min: minSpread, max: maxSpread };
  } catch (err) {
    console.error(`[convergence-agent] run error: ${err.message}`);
    report.error = err.message;
  }

  // Close the run row (report itself sanitized so no dash leaks via discards).
  if (runId) {
    await guarded('close run row', async () => {
      const { error } = await supabase.from('convergence_runs').update({
        finished_at: new Date().toISOString(),
        candidates_considered: considered,
        convergences_stored: stored.length,
        report: sanitizeDeep(report),
      }).eq('id', runId);
      if (error) throw new Error(error.message);
    });
  }

  console.log(`[convergence-agent] ${stored.length} stored | ${considered} considered | ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  return { stored: stored.length, considered, convergences: stored, runId, report };
}

module.exports = {
  getMondayOfCurrentWeek,
  traditionFor,
  stripDashes,
  sanitizeDeep,
  getAgentConfig,
  getSeedTheme,
  getThemePool,
  getDistanceMatrix,
  meanPairwiseDistance,
  selectDivergentSet,
  generateConclusion,
  assessNovelty,
  testAndPursue,
  runConvergenceAgent,
};

if (require.main === module) {
  runConvergenceAgent().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
