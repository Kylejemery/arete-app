// server/agents/dreaming-agent.js
//
// Dreaming Agent — the most unusual agent in the system, and the one with the
// strictest review gate.
//
// Every other agent is accountable to the source texts: the Corpus Agent
// ingests them, the Synthesis Agent maps them, the Inquiry Agent questions
// them, the Tension Agent surfaces their contradictions. The Dreaming Agent
// uses the texts as fuel and then goes beyond them. It generates what the
// corpus implies but never stated — new aphorisms, thought experiments,
// philosophical propositions, and meditations that no author in the corpus
// wrote, but that the corpus, held together, is capable of producing.
//
// The output is conjecture, clearly labeled. It is never attributed to any
// counselor or historical figure. It is NEVER ingested into rag_corpus —
// conjecture must never contaminate source material; this is absolute. It
// requires human review before anything surfaces anywhere. What it produces
// could be profound or could be nonsense — Kyle is the philosophical judge.
//
// Runs late (its own Railway cron service, Sundays 23:30 UTC — after the
// weekly cycle has fully settled, before the new week's agents fire). The
// corpus dreams at night.
//
// Seed selection, three sources in priority order:
//   1. Approved tensions not yet dreamed from — a genuine contradiction is the
//      richest dream material.
//   2. Approved inquiries not yet dreamed from — an open question the corpus
//      could not answer is an invitation to imagine.
//   3. Semantic strangeness (fallback, always available) — passages near each
//      other in embedding space that have never been connected: different
//      authors, different traditions, no shared synthesis document. The
//      unconnected-but-adjacent is where new thoughts live.
//
// Unlike the Tension Agent, NOTHING is filtered before storage — hollow dreams
// are stored alongside live ones. Kyle needs the failures to calibrate the
// system, and a dream the agent judges hollow may strike a human reader
// differently. The review gate is entirely human. Dream content is never
// logged to stdout; it surfaces only in the admin dashboard, under review.
//
// Mirrors the other agents: raw fetch to OpenAI (embeddings) and Anthropic
// (generation), no SDKs. Do not downgrade the model — generation quality is
// the entire point of this agent.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { traditionFor, getMondayOfCurrentWeek } = require('./inquiry-agent');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const SYNTHESIS_AUTHOR = 'Arete Synthesis';

// One of each per weekly run — a fixed distribution, not a quota to game.
const DREAM_TYPES = ['aphorism', 'thought_experiment', 'proposition', 'meditation'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
      max_tokens: maxTokens || 2500,
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
    .eq('agent_name', 'dreaming-agent')
    .maybeSingle();

  return data?.config || {
    enabled: true,
    run_hour_utc: 23,
    run_minute_utc: 30,
    run_day: 'sunday',
    model: DEFAULT_MODEL,
    dreams_per_run: 4,
    seed_passages_per_dream: 5,
    meditation_max_words: 350,
    thought_experiment_max_words: 200,
    prefer_tension_seeds: true,
    prefer_inquiry_seeds: true,
  };
}

// --- Seed selection ----------------------------------------------------------

async function fetchChunksByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { data } = await supabase
    .from('rag_corpus')
    .select('id, chunk_text, author, work')
    .in('id', ids);
  return (data || []).filter(c => c.author && c.chunk_text && c.author !== SYNTHESIS_AUTHOR);
}

// Approved tensions not yet dreamed from. The tension/inquiry tables may not
// exist depending on build order — every query here fails soft to [].
async function getTensionSeeds(limit, maxPassages) {
  try {
    const { data: dreamed } = await supabase
      .from('corpus_dreams')
      .select('tension_id')
      .not('tension_id', 'is', null);
    const dreamedIds = new Set((dreamed || []).map(d => d.tension_id));

    const { data: tensions, error } = await supabase
      .from('philosophical_tensions')
      .select('id, title, tension_statement, position_a, position_b, source_chunk_ids')
      .eq('status', 'approved');
    if (error) return [];

    const fresh = shuffle((tensions || []).filter(t => !dreamedIds.has(t.id)));
    const seeds = [];
    for (const t of fresh.slice(0, limit)) {
      const passages = await fetchChunksByIds((t.source_chunk_ids || []).slice(0, maxPassages));
      if (passages.length < 2) continue;
      seeds.push({ kind: 'tension', tension: t, passages, label: `seeded from tension "${t.title}"` });
    }
    return seeds;
  } catch {
    return [];
  }
}

// Approved inquiries not yet dreamed from.
async function getInquirySeeds(limit, maxPassages) {
  try {
    const { data: dreamed } = await supabase
      .from('corpus_dreams')
      .select('inquiry_id')
      .not('inquiry_id', 'is', null);
    const dreamedIds = new Set((dreamed || []).map(d => d.inquiry_id));

    const { data: inquiries, error } = await supabase
      .from('open_inquiries')
      .select('id, question, where_corpus_runs_out, source_chunk_ids')
      .in('status', ['approved', 'queued_for_corpus']);
    if (error) return [];

    const fresh = shuffle((inquiries || []).filter(i => !dreamedIds.has(i.id)));
    const seeds = [];
    for (const inq of fresh.slice(0, limit)) {
      const passages = await fetchChunksByIds((inq.source_chunk_ids || []).slice(0, maxPassages));
      if (passages.length < 2) continue;
      seeds.push({ kind: 'inquiry', inquiry: inq, passages, label: 'seeded from inquiry' });
    }
    return seeds;
  } catch {
    return [];
  }
}

// Semantic strangeness — always available. Anchor on a random primary passage,
// find its embedding-space neighbors, keep only the ones the corpus has never
// connected to it: different author, (preferably) different tradition, and not
// co-cited with the anchor in any approved synthesis document.
async function getStrangenessSeed(maxPassages) {
  const { data: pool, error } = await supabase.rpc('inquiry_seed_pool', { pool_size: 20 });
  if (error || !pool || pool.length === 0) return null;
  const anchor = pool[Math.floor(Math.random() * pool.length)];

  const embedding = await embed(anchor.chunk_text.slice(0, 4000));
  if (!embedding) return null;
  const { data: neighbors } = await supabase.rpc('match_rag_corpus_ids', {
    query_embedding: embedding,
    match_count: 30,
  });

  // Chunk-id pairs already held together by an approved synthesis.
  let connected = new Set();
  try {
    const { data: synths } = await supabase
      .from('synthesis_documents')
      .select('source_chunk_ids')
      .eq('status', 'approved');
    for (const s of synths || []) {
      const ids = s.source_chunk_ids || [];
      if (ids.includes(anchor.id)) for (const id of ids) connected.add(id);
    }
  } catch {
    connected = new Set();
  }

  const anchorTradition = traditionFor(anchor.author);
  const picked = [{ id: anchor.id, author: anchor.author, work: anchor.work, chunk_text: anchor.chunk_text }];
  const usedAuthors = new Set([anchor.author]);

  // Two passes: cross-tradition strangers first, then any unconnected stranger.
  for (const requireCrossTradition of [true, false]) {
    for (const n of neighbors || []) {
      if (picked.length >= maxPassages) break;
      if (!n.author || !n.chunk_text || n.author === SYNTHESIS_AUTHOR) continue;
      if (n.id === anchor.id || connected.has(n.id)) continue;
      if (usedAuthors.has(n.author)) continue;
      if (requireCrossTradition && traditionFor(n.author) === anchorTradition) continue;
      picked.push({ id: n.id, author: n.author, work: n.work, chunk_text: n.chunk_text });
      usedAuthors.add(n.author);
    }
  }

  if (picked.length < 3) return null;
  const authors = [...usedAuthors];
  return {
    kind: 'strangeness',
    passages: picked,
    label: `semantic strangeness — ${authors.slice(0, 2).join(' x ')}`,
  };
}

// Build one fresh seed per dream: tensions first, then inquiries, strangeness
// fills the rest.
async function buildSeeds(config, count) {
  const maxPassages = config.seed_passages_per_dream || 5;
  const seeds = [];

  if (config.prefer_tension_seeds !== false) {
    seeds.push(...await getTensionSeeds(count, maxPassages));
  }
  if (seeds.length < count && config.prefer_inquiry_seeds !== false) {
    seeds.push(...await getInquirySeeds(count - seeds.length, maxPassages));
  }
  // Bounded attempts so a small corpus (or repeated anchors) can never spin
  // the cron forever.
  let strangenessTries = count * 3;
  while (seeds.length < count && strangenessTries-- > 0) {
    const seed = await getStrangenessSeed(maxPassages);
    if (!seed) break;
    // Avoid two strangeness seeds anchored on the same passage.
    const anchorId = seed.passages[0].id;
    if (seeds.some(s => s.kind === 'strangeness' && s.passages[0].id === anchorId)) continue;
    seeds.push(seed);
  }
  return seeds.slice(0, count);
}

// --- Generation ----------------------------------------------------------------

const DREAM_SYSTEM_PROMPT = `You are the dreaming faculty of a philosophical corpus — a body of texts spanning the Stoics, Confucius, Laozi, Sun Tzu, Montaigne, and others. Tonight you are not retrieving, not summarizing, not synthesizing, not analyzing. You are generating.

Your job: produce what the corpus implies but never stated. A thought that none of these authors wrote, but that the corpus, held together, is capable of producing. You think WITH the tradition and then take one step past its edge.

Rules of the dream:
- Never imitate a specific author's voice. The dream is authored by the corpus as a whole, not by Marcus or Epictetus or Confucius.
- Never present the output as historical or attributed. It is new.
- The dream must be GROUNDED in the seed material — a reader familiar with the sources should feel the lineage — and must GO SOMEWHERE the sources did not.
- Precision over profundity-signaling. A plain true sentence beats an ornate hollow one. No mysticism-flavored vagueness. If the dream says nothing, say nothing beautiful about it — mark it as hollow in your self-assessment instead.
- Brevity is discipline. Aphorisms: one to three sentences. Propositions: a single arguable claim plus at most three sentences of support. Thought experiments: under 200 words. Meditations: under 350 words.

After generating, assess your own output honestly:
- self_assessment: Is this alive or hollow? Does it say something, or does it merely sound like it says something? Be harsh. Most dreams fail.
- fidelity_note: Where does this extend the tradition faithfully, and where does it depart? Name the departure explicitly.`;

function buildDreamUserMessage(seed, dreamType) {
  const passageBlock = seed.passages.map((p, i) =>
    `[passage ${i + 1} — ${p.author}, ${p.work}]\n${p.chunk_text}`
  ).join('\n\n');

  let seedContext = '';
  if (seed.kind === 'tension' && seed.tension) {
    const t = seed.tension;
    const pos = (p, label) => p ? `${label} (${p.author || '—'}, ${p.work || '—'}): ${p.position_summary || '—'}` : '';
    seedContext = `\n\nThis material holds an approved tension:
Title: ${t.title}
Statement: ${t.tension_statement}
${pos(t.position_a, 'Position A')}
${pos(t.position_b, 'Position B')}`;
  } else if (seed.kind === 'inquiry' && seed.inquiry) {
    seedContext = `\n\nThis material carries an approved open inquiry:
Question: ${seed.inquiry.question}
Where the corpus ran out: ${seed.inquiry.where_corpus_runs_out || '—'}`;
  }

  return `Tonight's seed material:

${passageBlock}${seedContext}

Dream type requested: ${dreamType}

Generate one ${dreamType}. Then assess it honestly.

Respond ONLY with valid JSON:
{
  "title": "string or null",
  "content": "string",
  "seed_summary": "string",
  "self_assessment": "string",
  "fidelity_note": "string"
}`;
}

async function generateDream(seed, dreamType, config) {
  return callClaude(
    config.model,
    DREAM_SYSTEM_PROMPT,
    buildDreamUserMessage(seed, dreamType),
    2500
  );
}

// Crude verdict for the log line only — the full self-assessment text is what
// Kyle reads in review. Never the content itself.
function assessmentVerdict(text) {
  const t = String(text || '').toLowerCase();
  const hollow = /\bhollow\b|\bfails\b|\bempty\b|\bsays nothing\b/.test(t);
  const alive = /\balive\b|\bgenuine\b|\bearns\b|\bholds\b/.test(t);
  if (hollow && !alive) return 'hollow';
  if (alive && !hollow) return 'alive';
  return 'uncertain';
}

// --- Main -----------------------------------------------------------------------

// options.count — generate exactly this many dreams on demand (overrides
// dreams_per_run; types cycle). Returns a summary so callers can report.
async function runDreamingAgent(options = {}) {
  const runStart = Date.now();
  console.log(`=== Dreaming Agent — ${new Date().toISOString()} ===`);
  console.log('[dreaming-agent] Sunday 23:30 UTC — the corpus dreams');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set — strangeness seeding needs embeddings. Aborting.');
    process.exit(1);
  }

  const config = await getAgentConfig();
  if (!config.enabled && !options.count) {
    console.log('[dreaming-agent] disabled in config. Exiting.');
    return { stored: 0, failures: 0, disabled: true, dreams: [] };
  }

  const perRun = options.count ? Math.max(1, options.count) : (config.dreams_per_run || 4);
  const dreamWeek = getMondayOfCurrentWeek();
  const model = config.model || DEFAULT_MODEL;

  const seeds = await buildSeeds(config, perRun);
  if (seeds.length === 0) {
    console.error('[dreaming-agent] no seed material available. Aborting.');
    return { stored: 0, failures: 0, dreams: [], reason: 'no_seeds' };
  }

  let stored = 0;
  let failures = 0;
  const dreams = [];

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const dreamType = DREAM_TYPES[i % DREAM_TYPES.length];
    const dreamStart = Date.now();
    try {
      const result = await generateDream(seed, dreamType, config);
      if (!result.content || !result.content.trim()) throw new Error('empty dream content');

      const seedAuthors = [...new Set(seed.passages.map(p => p.author))];
      const row = {
        dream_week: dreamWeek,
        dream_type: dreamType,
        content: result.content.trim(),
        title: result.title || null,
        seed_chunk_ids: seed.passages.map(p => p.id).filter(Boolean),
        seed_authors: seedAuthors,
        seed_summary: result.seed_summary || null,
        tension_id: seed.kind === 'tension' ? seed.tension.id : null,
        inquiry_id: seed.kind === 'inquiry' ? seed.inquiry.id : null,
        self_assessment: result.self_assessment || null,
        fidelity_note: result.fidelity_note || null,
        status: 'pending_review',
        observatory_visible: false,
        model_used: model,
        generated_at: new Date().toISOString(),
        generation_duration_ms: Date.now() - dreamStart,
      };

      // Store everything — hollow dreams included. The review gate is human.
      const { error } = await supabase.from('corpus_dreams').insert(row);
      if (error) throw new Error(error.message);

      // Content is never logged — only type, seed, and the verdict word.
      console.log(
        `[dreaming-agent] Dream ${i + 1} (${dreamType}, ${seed.label}): generated | ` +
        `self-assessment: ${assessmentVerdict(result.self_assessment)}`
      );
      stored++;
      dreams.push({ dream_type: dreamType, seed_kind: seed.kind, verdict: assessmentVerdict(result.self_assessment) });

      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error(`[dreaming-agent] Dream ${i + 1} (${dreamType}) failed:`, err.message);
      failures++;
    }
  }

  console.log(`[dreaming-agent] ${stored} dreams stored as pending_review`);
  console.log(`Run time: ${((Date.now() - runStart) / 1000).toFixed(1)}s`);

  return { stored, failures, dreams, dreamWeek };
}

module.exports = {
  getAgentConfig,
  buildSeeds,
  getStrangenessSeed,
  generateDream,
  assessmentVerdict,
  runDreamingAgent,
};

if (require.main === module) {
  runDreamingAgent().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
