// server/agents/inquiry-agent.js
//
// Inquiry Agent — the layer ABOVE the Synthesis Agent in the Arete
// philosophical stack. Where synthesis maps what the corpus SAYS, the Inquiry
// Agent generates the questions the corpus RAISES but does not answer, then
// attempts to pursue those questions across the full body of texts and is
// honest about where the corpus runs out.
//
// The output is not synthesis and not retrieval. It is philosophical inquiry:
// a question the corpus implies, an attempt to follow it, and an honest account
// of where the corpus cannot go further.
//
// Runs weekly (its own Railway cron service, Mondays 06:30 UTC — after the
// Synthesis Agent's Monday cycle). Two passes per inquiry:
//   Pass 1 — Question Generation: sample 3-5 philosophically diverse primary
//            passages (>=2 authors, >=2 traditions) and ask Claude for the
//            question that sits in the space between them.
//   Pass 2 — Pursuit: semantic-search the question against the full corpus,
//            retrieve ~12 passages across >=3 authors, and ask Claude to follow
//            the question as far as the corpus allows — then say where it ends.
//
// Every inquiry is stored in open_inquiries as `pending_review`. Nothing is
// surfaced to users without Kyle's observatory_visible approval. The pursuit
// text is CONJECTURE — it is never ingested into rag_corpus as source material.
//
// Mirrors the other agents: raw fetch to OpenAI (embeddings) and Anthropic
// (generation), no SDKs.
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

// The corpus's own syntheses are authored under this name — inquiry never seeds
// on them (that would make the corpus interrogate its own conjecture).
const SYNTHESIS_AUTHOR = 'Arete Synthesis';

// Philosophical-tradition map used to guarantee productive friction: an inquiry
// seed must span >=2 traditions, not just >=2 authors, so the question sits in a
// genuine gap between worldviews. Unknown authors fall through to 'other'.
const TRADITION_BY_AUTHOR = {
  // Stoic
  'marcus aurelius': 'stoic', 'epictetus': 'stoic', 'seneca': 'stoic',
  'zeno of citium': 'stoic', 'cleanthes': 'stoic', 'chrysippus': 'stoic',
  'musonius rufus': 'stoic', 'gaius musonius rufus': 'stoic', 'hierocles': 'stoic',
  'cicero': 'stoic', 'marcus tullius cicero': 'stoic',
  // Classical Greek (non-Stoic)
  'plato': 'greek', 'aristotle': 'greek', 'socrates': 'greek',
  'heraclitus': 'greek', 'epicurus': 'greek', 'diogenes': 'greek',
  'plutarch': 'greek', 'plotinus': 'greek', 'pythagoras': 'greek',
  // Eastern
  'confucius': 'eastern', 'laozi': 'eastern', 'lao tzu': 'eastern',
  'mencius': 'eastern', 'zhuangzi': 'eastern', 'chuang tzu': 'eastern',
  'sun tzu': 'eastern', 'buddha': 'eastern', 'the buddha': 'eastern',
  'gautama buddha': 'eastern', 'bodhidharma': 'eastern', 'nagarjuna': 'eastern',
  // Modern / early-modern
  'montaigne': 'modern', 'michel de montaigne': 'modern',
  'nietzsche': 'modern', 'friedrich nietzsche': 'modern',
  'schopenhauer': 'modern', 'arthur schopenhauer': 'modern',
  'kant': 'modern', 'immanuel kant': 'modern', 'spinoza': 'modern',
  'emerson': 'modern', 'ralph waldo emerson': 'modern',
  'thoreau': 'modern', 'henry david thoreau': 'modern',
  'kierkegaard': 'modern', 'william james': 'modern', 'hume': 'modern',
  // Abrahamic / scriptural
  'thomas a kempis': 'christian', 'augustine': 'christian', 'boethius': 'christian',
  'aquinas': 'christian', 'pascal': 'christian', 'blaise pascal': 'christian',
};

function traditionFor(author) {
  if (!author) return 'other';
  const key = author.toLowerCase().trim();
  if (TRADITION_BY_AUTHOR[key]) return TRADITION_BY_AUTHOR[key];
  // Loose contains-match so "Lucius Annaeus Seneca" still maps to Stoic.
  for (const [name, trad] of Object.entries(TRADITION_BY_AUTHOR)) {
    if (key.includes(name) || name.includes(key)) return trad;
  }
  return 'other';
}

// Monday (UTC) of the current week, as YYYY-MM-DD — matches the other agents.
function getMondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
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

// Fisher–Yates shuffle (returns a new array).
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Config ----------------------------------------------------------------

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'inquiry-agent')
    .maybeSingle();

  return data?.config || {
    enabled: true,
    run_hour_utc: 6,
    run_minute_utc: 30,
    run_day: 'monday',
    model: DEFAULT_MODEL,
    inquiries_per_run: 3,
    seed_passages_per_inquiry: 5,
    pursuit_retrieval_count: 12,
    pursuit_min_authors: 3,
    pursuit_max_words: 600,
  };
}

// --- Pass 1a. Seed sampling ------------------------------------------------

// Partition a randomized pool of primary passages into `count` inquiry seeds.
// Each seed holds `size` passages spanning >=2 authors and (where the corpus
// allows) >=2 philosophical traditions, and no passage is reused across seeds
// in the same run. Returns an array of seed passage-arrays.
function buildSeeds(pool, count, size) {
  // Group the pool by author, tradition-tagged, and shuffle within/without.
  const byAuthor = new Map();
  for (const p of pool) {
    if (!byAuthor.has(p.author)) byAuthor.set(p.author, []);
    byAuthor.get(p.author).push(p);
  }
  for (const arr of byAuthor.values()) {
    // shuffle each author's passages so we don't always pick chunk_index 0
    arr.sort(() => Math.random() - 0.5);
  }

  const authors = shuffle([...byAuthor.keys()]);
  const seeds = [];

  for (let s = 0; s < count; s++) {
    const seed = [];
    const usedAuthors = new Set();
    const usedTraditions = new Set();

    // Round 1: one passage from as many distinct authors as we can, preferring
    // authors that introduce a new tradition, until the seed is full.
    const orderedAuthors = shuffle(authors).sort((a, b) => {
      // authors from an unrepresented tradition first
      const ta = usedTraditions.has(traditionFor(a)) ? 1 : 0;
      const tb = usedTraditions.has(traditionFor(b)) ? 1 : 0;
      return ta - tb;
    });

    for (const author of orderedAuthors) {
      if (seed.length >= size) break;
      const bucket = byAuthor.get(author);
      if (!bucket || bucket.length === 0) continue;
      seed.push(bucket.shift());
      usedAuthors.add(author);
      usedTraditions.add(traditionFor(author));
    }

    // Round 2: if still short (few distinct authors left), backfill with any
    // remaining passages, allowing a second passage from an author.
    if (seed.length < size) {
      const leftovers = shuffle([...byAuthor.values()].flat());
      for (const p of leftovers) {
        if (seed.length >= size) break;
        seed.push(p);
        // remove from its bucket so it isn't reused
        const bucket = byAuthor.get(p.author);
        const idx = bucket.indexOf(p);
        if (idx >= 0) bucket.splice(idx, 1);
      }
    }

    // A seed needs >=2 authors to create any friction at all.
    const distinctAuthors = new Set(seed.map(p => p.author));
    if (seed.length >= 2 && distinctAuthors.size >= 2) {
      seeds.push(seed);
    }
  }

  return seeds;
}

async function getSeedPool(config) {
  // Over-sample so buildSeeds has room to satisfy author/tradition diversity.
  const poolSize = Math.max(120, (config.inquiries_per_run || 3) * (config.seed_passages_per_inquiry || 5) * 12);
  const { data, error } = await supabase.rpc('inquiry_seed_pool', { pool_size: poolSize });
  if (error) throw new Error(`inquiry_seed_pool failed: ${error.message}`);
  return data || [];
}

// --- Tension seeding (downstream of the Tension Agent) ----------------------

// Approved philosophical tensions are premium seed material for inquiry: their
// source passages already hold a live contradiction the corpus does not
// resolve. When any exist, one inquiry per run seeds from a random approved
// tension's passages instead of random sampling. Fails soft — if the table is
// missing or empty, random sampling proceeds as normal.
async function getTensionSeed() {
  try {
    const { data: tensions, error } = await supabase
      .from('philosophical_tensions')
      .select('id, title, source_chunk_ids')
      .eq('status', 'approved')
      .not('source_chunk_ids', 'is', null);
    if (error || !tensions || tensions.length === 0) return null;

    const t = tensions[Math.floor(Math.random() * tensions.length)];
    const ids = (t.source_chunk_ids || []).filter(Boolean).slice(0, 8);
    if (ids.length < 2) return null;

    const { data: chunks } = await supabase
      .from('rag_corpus')
      .select('id, chunk_text, author, work, text_type')
      .in('id', ids);
    const passages = (chunks || []).filter(c => c.author && c.chunk_text);
    if (passages.length < 2 || new Set(passages.map(p => p.author)).size < 2) return null;

    return { tension: t, passages };
  } catch {
    return null;
  }
}

// --- Pass 1b. Question generation ------------------------------------------

const QUESTION_SYSTEM_PROMPT = `You are a philosophical inquirer working with a corpus of primary texts. Your job is not to summarize or synthesize these passages. Your job is to find the question they collectively raise — the question that sits in the space between them that none of them fully answers.

A good philosophical question:
- Cannot be answered by simply quoting one of the passages back
- Creates genuine tension between the perspectives present
- Is worth pursuing — it matters to how a person should live
- Is honest about what it does not know

You are looking for the question these thinkers are circling without landing on.`;

function buildQuestionUserMessage(passages) {
  const authors = [...new Set(passages.map(p => p.author))];
  const passageBlock = passages.map((p, i) =>
    `[passage ${i + 1} — ${p.author}, ${p.work}]\n${p.chunk_text}`
  ).join('\n\n');

  return `Here are passages from ${authors.join(', ')}:

${passageBlock}

What philosophical question do these passages collectively raise that none of them fully answers? State it as a single, precise question. Then briefly (2-3 sentences) explain why this question matters and what makes it genuinely open.

Respond ONLY with valid JSON:
{
  "question": "string",
  "why_it_matters": "string",
  "what_makes_it_open": "string"
}`;
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

async function generateQuestion(passages, config) {
  return callClaude(
    config.model,
    QUESTION_SYSTEM_PROMPT,
    buildQuestionUserMessage(passages),
    2000
  );
}

// --- Pass 2. Pursuit -------------------------------------------------------

const PURSUIT_SYSTEM_PROMPT = `You are pursuing a philosophical question using a corpus of primary texts. Your job is not to resolve the question — it may not be resolvable. Your job is to follow it as far as the corpus allows, and then be honest about where it runs out.

This is inquiry, not synthesis. You are not mapping what thinkers said. You are thinking alongside them toward something none of them fully reached.

Qualities of good philosophical pursuit:
- Specific: cite actual passages, not general impressions
- Honest: where the corpus is thin or silent, say so explicitly
- Generative: the pursuit should leave the reader with something to think about, even if it does not resolve the question
- Appropriately uncertain: hedge where the evidence is weak; commit where it is strong

Label the output clearly as speculative philosophical inquiry — not established doctrine, not the view of any single thinker.`;

// Retrieve corpus passages relevant to the question, deduped to span authors.
async function retrievePursuitPassages(question, config) {
  const embedding = await embed(question);
  if (!embedding) return [];

  const wantCount = config.pursuit_retrieval_count || 12;
  const { data: retrieved } = await supabase.rpc('match_rag_corpus_ids', {
    query_embedding: embedding,
    match_count: Math.max(wantCount + 6, 18),
  });

  // Dedup by author (max 3 each) so the pursuit hears several voices, and drop
  // the corpus's own syntheses so we pursue across primary texts.
  const byAuthor = {};
  for (const chunk of retrieved || []) {
    if (chunk.author === SYNTHESIS_AUTHOR) continue;
    if (!byAuthor[chunk.author]) byAuthor[chunk.author] = [];
    if (byAuthor[chunk.author].length < 3) byAuthor[chunk.author].push(chunk);
  }

  return Object.values(byAuthor).flat().slice(0, wantCount).map(c => ({
    id: c.id,
    author: c.author,
    work: c.work,
    chunk_text: c.chunk_text,
    similarity: c.similarity,
  }));
}

function buildPursuitUserMessage(question, passages, maxWords) {
  const passageBlock = passages.map((p, i) =>
    `[${i + 1}] ${p.author} — ${p.work}\n${p.chunk_text}`
  ).join('\n\n');

  return `Question: ${question}

Relevant passages from the corpus:
${passageBlock}

Pursue this question as far as the corpus allows. Write 400-${maxWords} words. End with:
1. A single sentence stating where the corpus runs out — where it cannot go further on this question
2. 1-3 authors or works not in the corpus that might help — for the reading queue

Respond ONLY with valid JSON:
{
  "pursuit_text": "string",
  "confidence": "speculative|grounded|unresolved",
  "where_corpus_runs_out": "string",
  "suggested_reading": [
    { "author": "string", "work": "string", "why": "string" }
  ]
}`;
}

async function pursue(question, passages, config) {
  const result = await callClaude(
    config.model,
    PURSUIT_SYSTEM_PROMPT,
    buildPursuitUserMessage(question, passages, config.pursuit_max_words || 600),
    4000
  );

  // Normalize confidence to the CHECK-constrained set.
  const valid = ['speculative', 'grounded', 'unresolved'];
  const confidence = valid.includes(result.confidence) ? result.confidence : 'speculative';
  const suggested = Array.isArray(result.suggested_reading) ? result.suggested_reading : [];

  return {
    pursuit_text: result.pursuit_text || '',
    confidence,
    where_corpus_runs_out: result.where_corpus_runs_out || '',
    suggested_reading: suggested,
  };
}

// --- Main ------------------------------------------------------------------

// options.count — generate exactly this many inquiries on demand (overrides the
// configured inquiries_per_run). Returns a summary so callers can report.
async function runInquiryAgent(options = {}) {
  const startTime = Date.now();
  console.log(`=== Inquiry Agent — ${new Date().toISOString()} ===`);
  console.log('[inquiry-agent] Monday 06:30 UTC run started');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set — pursuit retrieval needs embeddings. Aborting.');
    process.exit(1);
  }

  const config = await getAgentConfig();
  if (!config.enabled && !options.count) {
    console.log('[inquiry-agent] disabled in config. Exiting.');
    return { generated: 0, failures: 0, disabled: true, inquiries: [] };
  }

  const perRun = options.count
    ? Math.max(1, options.count)
    : (config.inquiries_per_run || 3);
  const seedSize = config.seed_passages_per_inquiry || 5;
  const inquiryWeek = getMondayOfCurrentWeek();
  const model = config.model || DEFAULT_MODEL;

  // Sample once, partition into `perRun` diverse, non-overlapping seeds.
  const pool = await getSeedPool(config);
  if (pool.length < seedSize * 2) {
    console.error(`[inquiry-agent] seed pool too small (${pool.length}). Aborting.`);
    return { generated: 0, failures: 0, inquiries: [], reason: 'insufficient_pool' };
  }
  const seeds = buildSeeds(pool, perRun, seedSize);
  if (seeds.length === 0) {
    console.error('[inquiry-agent] could not build any diverse seed. Aborting.');
    return { generated: 0, failures: 0, inquiries: [], reason: 'no_diverse_seed' };
  }

  // Downstream of the Tension Agent: when an approved tension exists, its
  // source passages replace one random seed — inquiry pursues the question a
  // live contradiction raises rather than one found by chance.
  const tensionSeed = await getTensionSeed();
  if (tensionSeed) {
    seeds[0] = tensionSeed.passages;
    console.log(`[inquiry-agent] Inquiry 1 seeded from approved tension "${tensionSeed.tension.title}"`);
  }

  let generated = 0;
  let failures = 0;
  const inquiries = [];

  for (let i = 0; i < seeds.length; i++) {
    const passages = seeds[i];
    const seedAuthors = [...new Set(passages.map(p => p.author))];
    const traditions = [...new Set(passages.map(p => traditionFor(p.author)))];
    try {
      // Pass 1 — Question.
      const q = await generateQuestion(passages, config);
      if (!q.question || !q.question.trim()) throw new Error('empty question');

      // Pass 2 — Pursuit.
      const pursuitPassages = await retrievePursuitPassages(q.question, config);
      const pursuitAuthors = [...new Set(pursuitPassages.map(p => p.author))];
      if (pursuitPassages.length < 2 || pursuitAuthors.length < 2) {
        console.warn(`  ⚠ thin pursuit retrieval (${pursuitPassages.length} passages, ${pursuitAuthors.length} authors) — proceeding`);
      }
      const pursuit = await pursue(q.question, pursuitPassages, config);
      const wordCount = pursuit.pursuit_text.split(/\s+/).filter(Boolean).length;

      const questionOrigin = `Seeded by ${passages.map(p => `${p.author} (${p.work})`).join('; ')}. ` +
        `${q.why_it_matters || ''} ${q.what_makes_it_open || ''}`.trim();

      const row = {
        inquiry_week: inquiryWeek,
        question: q.question.trim(),
        question_origin: questionOrigin,
        source_chunk_ids: passages.map(p => p.id).filter(Boolean),
        source_authors: seedAuthors,
        pursuit_passages: pursuitPassages,
        pursuit_text: pursuit.pursuit_text,
        pursuit_word_count: wordCount,
        confidence: pursuit.confidence,
        where_corpus_runs_out: pursuit.where_corpus_runs_out,
        suggested_reading: pursuit.suggested_reading,
        status: 'pending_review',
        observatory_visible: false,
        model_used: model,
        generated_at: new Date().toISOString(),
        generation_duration_ms: Date.now() - startTime,
      };

      const { error } = await supabase.from('open_inquiries').insert(row);
      if (error) throw new Error(error.message);

      console.log(
        `[inquiry-agent] Inquiry ${i + 1}: "${row.question}" | ` +
        `Authors: ${seedAuthors.join(', ')} | Traditions: ${traditions.join(', ')} | ` +
        `Confidence: ${row.confidence}`
      );
      generated++;
      inquiries.push({ question: row.question, authors: seedAuthors, confidence: row.confidence });

      // Rate limit — two Claude calls per inquiry.
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error(`[inquiry-agent] Inquiry ${i + 1} failed:`, err.message);
      failures++;
    }
  }

  console.log(`[inquiry-agent] ${generated} inquiries generated | ${failures} failures | Stored as pending_review`);
  console.log(`Run time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  return { generated, failures, inquiries, inquiryWeek };
}

module.exports = {
  getMondayOfCurrentWeek,
  traditionFor,
  getAgentConfig,
  getTensionSeed,
  buildSeeds,
  generateQuestion,
  retrievePursuitPassages,
  pursue,
  runInquiryAgent,
};

if (require.main === module) {
  runInquiryAgent().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
