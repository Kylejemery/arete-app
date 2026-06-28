// server/synthesis-agent.js
//
// Weekly Synthesis Agent — the fourth autonomous agent in the Arete AI Agent
// System. It generates cross-source philosophical synthesis documents: not
// summaries of individual works, but cross-thinker analyses that map agreements,
// tensions, and convergences across the corpus that no single chunk contains.
//
// Each document is stored in synthesis_documents as `pending_review`. Kyle
// approves/edits/rejects in the admin dashboard; approved documents are ingested
// back into rag_corpus with text_type='synthesis' (see the admin ingest route),
// where Cabinet counselors can retrieve them — the corpus thinking about itself.
//
// PHILOSOPHICAL GUARDRAIL (non-negotiable): the agent never resolves genuine
// philosophical tensions — it surfaces them. Every claim is attributed to a
// specific source. Uncertainty is flagged. The system prompt enforces this.
//
// Standalone script (its own Railway cron service, Monday 11:00 UTC / 06:00 ET,
// after Corpus 03:00, Journal 04:00, Gap 05:00). Mirrors the other agents: raw
// fetch to OpenAI (embeddings) and Anthropic (generation), no SDKs.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DAY = 24 * 60 * 60 * 1000;

// Generated syntheses are authored under this fixed name. The agent must never
// ground a new synthesis on its own prior syntheses — that creates an echo
// chamber where the corpus rewrites its own earlier output.
const SYNTHESIS_AUTHOR = 'Arete Synthesis';
// Cosine similarity at/above which two concept phrasings count as the same
// concept (so near-paraphrases don't produce duplicate documents).
const CONCEPT_DEDUP_THRESHOLD = 0.86;

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
      console.error(`  embedding failed (${res.status}) for "${text}"`);
      return null;
    }
    return (await res.json()).data[0].embedding;
  } catch (e) {
    console.error(`  embedding error for "${text}":`, e.message);
    return null;
  }
}

// Cosine similarity between two equal-length embedding vectors.
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// --- 2a. Agent config ------------------------------------------------------

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'synthesis_agent')
    .single();

  return data?.config || {
    documents_per_week: 5,
    min_user_frequency: 3,
    target_word_count: 2000,
    synthesis_types: ['cross_thinker', 'concept_evolution', 'practical'],
    enabled: true,
  };
}

// --- 2b. Concept selection -------------------------------------------------

async function selectConceptsForSynthesis(config) {
  const generationWeek = getMondayOfCurrentWeek();

  // Already synthesized this week — don't duplicate.
  const { data: alreadyThisWeek } = await supabase
    .from('synthesis_documents')
    .select('concept')
    .eq('generation_week', generationWeek);
  const alreadySynthesized = new Set((alreadyThisWeek || []).map(r => r.concept));

  // Concepts synthesized in the last 60 days (any status except rejected) — used
  // for exact-string dedup AND the semantic dedup pass below. A rejected concept
  // stays eligible (the first attempt may simply have been poor).
  const { data: recentlySynthesized } = await supabase
    .from('synthesis_documents')
    .select('concept, status')
    .neq('status', 'rejected')
    .gte('created_at', new Date(Date.now() - 60 * DAY).toISOString());
  const recentConcepts = new Set((recentlySynthesized || []).map(r => r.concept));
  const recentConceptStrings = [...new Set((recentlySynthesized || []).map(r => r.concept).filter(Boolean))];

  // Top themes from journal_analysis (last 30 days) — user demand signal.
  const { data: analyses } = await supabase
    .from('journal_analysis')
    .select('themes, dominant_theme')
    .gte('created_at', new Date(Date.now() - 30 * DAY).toISOString());

  const themeCounts = {};
  for (const analysis of analyses || []) {
    const themes = Array.isArray(analysis.themes) ? analysis.themes : [];
    for (const t of themes) {
      const theme = (t.theme || '').toLowerCase().trim();
      if (!theme) continue;
      themeCounts[theme] = (themeCounts[theme] || 0) + (t.count || 1);
    }
    if (analysis.dominant_theme) {
      const dt = analysis.dominant_theme.toLowerCase().trim();
      themeCounts[dt] = (themeCounts[dt] || 0) + 3; // dominant theme gets extra weight
    }
  }

  const ranked = Object.entries(themeCounts)
    .filter(([theme, count]) =>
      count >= config.min_user_frequency &&
      !alreadySynthesized.has(theme) &&
      !recentConcepts.has(theme)
    )
    .sort(([, a], [, b]) => b - a);

  // Semantic dedup: embed recent synthesis concepts once, then walk the ranked
  // candidates and skip any that paraphrase a recent concept or one already
  // accepted this run. This stops two near-identical journal phrasings of the
  // same idea from producing duplicate documents. (Skipped gracefully when
  // embeddings are unavailable — falls back to the exact-string dedup above.)
  const recentEmbeddings = [];
  for (const c of recentConceptStrings) {
    const e = await embed(c);
    if (e) recentEmbeddings.push(e);
  }

  const candidates = [];
  const acceptedEmbeddings = [];
  for (const [theme, count] of ranked) {
    if (candidates.length >= config.documents_per_week) break;
    const emb = await embed(theme);
    if (emb) {
      const isDup = [...recentEmbeddings, ...acceptedEmbeddings]
        .some(e => cosineSim(emb, e) >= CONCEPT_DEDUP_THRESHOLD);
      if (isDup) {
        console.log(`  ⤷ skipping "${theme}" — semantically duplicates an existing or already-selected concept`);
        continue;
      }
      acceptedEmbeddings.push(emb);
    }
    candidates.push({
      concept: theme,
      userFrequency: count,
      demandRank: candidates.length + 1,
    });
  }

  // If not enough user-demand concepts, fill with structural gaps: works the
  // significance map says matter, expressed as concept-level prompts.
  if (candidates.length < config.documents_per_week) {
    const needed = config.documents_per_week - candidates.length;
    const { data: sigMap } = await supabase
      .from('corpus_significance_map')
      .select('author, work')
      .eq('active', true)
      .limit(needed * 3);

    const structuralConcepts = (sigMap || [])
      .map(s => ({
        concept: `${s.author} — ${s.work}`,
        userFrequency: 0,
        demandRank: candidates.length + 1,
        isStructural: true,
      }))
      .filter(s => !alreadySynthesized.has(s.concept) && !recentConcepts.has(s.concept))
      .slice(0, needed);

    candidates.push(...structuralConcepts);
  }

  return candidates;
}

// --- 2c. Source retrieval --------------------------------------------------

async function getSourcePassages(concept) {
  // First check concept_passage_map for human-approved passages. Exclude the
  // corpus's own syntheses so a new synthesis only grounds on primary texts.
  const { data: approved } = await supabase
    .from('concept_passage_map')
    .select('chunk_id, author, work, chunk_text, similarity_score')
    .eq('concept', concept)
    .eq('approved', true)
    .neq('author', SYNTHESIS_AUTHOR)
    .order('similarity_score', { ascending: false })
    .limit(12);

  if (approved && approved.length >= 4) {
    return approved.map(p => ({
      id: p.chunk_id,
      author: p.author,
      work: p.work,
      chunk_text: p.chunk_text,
      similarity: p.similarity_score,
      source: 'approved',
    }));
  }

  // Fall back to semantic search. match_rag_corpus_ids(query_embedding,
  // match_count DEFAULT 8, filter_language DEFAULT 'english') returns
  // { id, author, work, chunk_text, similarity }. There is no match_threshold
  // parameter on this RPC, so over-fetch and dedupe by author in JS.
  const embedding = await embed(concept);
  if (!embedding) return [];

  const { data: retrieved } = await supabase.rpc('match_rag_corpus_ids', {
    query_embedding: embedding,
    match_count: 18,
  });

  // Deduplicate by author — avoid 8 chunks from Seneca and nothing else — and
  // drop the corpus's own syntheses so grounding stays on primary texts.
  const byAuthor = {};
  for (const chunk of retrieved || []) {
    if (chunk.author === SYNTHESIS_AUTHOR) continue;
    if (!byAuthor[chunk.author]) byAuthor[chunk.author] = [];
    if (byAuthor[chunk.author].length < 3) byAuthor[chunk.author].push(chunk);
  }

  return Object.values(byAuthor).flat().slice(0, 12).map(c => ({
    id: c.id,
    author: c.author,
    work: c.work,
    chunk_text: c.chunk_text,
    similarity: c.similarity,
    source: 'semantic_search',
  }));
}

// --- 2d. Synthesis type ----------------------------------------------------

function determineSynthesisType(concept, passages, config) {
  const authors = [...new Set(passages.map(p => p.author))];
  const hasMultipleAuthors = authors.length >= 3;

  // Sources spanning philosophical periods support a concept-evolution reading.
  const ancientAuthors = ['Zeno of Citium', 'Cleanthes', 'Chrysippus'];
  const middleAuthors = ['Cicero', 'Musonius Rufus', 'Plutarch'];
  const lateAuthors = ['Seneca', 'Epictetus', 'Marcus Aurelius'];

  const hasEvolutionSpan = (
    passages.some(p => ancientAuthors.includes(p.author) || middleAuthors.includes(p.author)) &&
    passages.some(p => lateAuthors.includes(p.author))
  );

  const available = config.synthesis_types.filter(type => {
    if (type === 'cross_thinker') return hasMultipleAuthors;
    if (type === 'concept_evolution') return hasEvolutionSpan;
    if (type === 'practical') return true; // always possible
    return true;
  });

  // Prefer cross_thinker (most valuable), then concept_evolution, else practical.
  if (available.includes('cross_thinker') && hasMultipleAuthors) return 'cross_thinker';
  if (available.includes('concept_evolution') && hasEvolutionSpan) return 'concept_evolution';
  return 'practical';
}

// --- 2e. Generation --------------------------------------------------------

const TYPE_INSTRUCTIONS = {
  cross_thinker: (concept) =>
    `Analyze how these thinkers approach "${concept}" — where they agree, where they diverge, and why the divergences matter philosophically. Do not resolve tensions — map them. Show what each thinker uniquely contributes to understanding this concept.`,
  concept_evolution: (concept) =>
    `Trace how the understanding of "${concept}" developed across the sources provided, from earlier to later thinkers. Show the living tradition — how ideas built on, corrected, or departed from what came before. Note where the development is continuous and where it represents genuine breaks.`,
  practical: (concept) =>
    `Synthesize what these sources collectively recommend about how to engage with "${concept}" in practice. Ground every recommendation in specific sources. Show where practical recommendations converge across thinkers and where they diverge. End with a concrete set of practices the reader can begin immediately.`,
};

function buildSystemPrompt(targetWordCount) {
  return `You are a philosophical synthesist for the Arete Stoic philosophy platform.
You produce rigorous cross-source analyses that become part of the platform's RAG corpus —
retrievable by AI counselors when users wrestle with philosophical questions.

Your synthesis documents must:

ATTRIBUTION
- Attribute every claim to a specific source from the passages provided
- Use format: (Author, Work) inline — e.g. (Seneca, De Ira I.7)
- Never assert a philosophical position without grounding it in a source

INTELLECTUAL HONESTY
- Surface genuine tensions between thinkers — do not smooth them over
- Flag where you are uncertain or where scholars dispute the interpretation
- Use language like "appears to suggest," "may be read as," "one interpretation holds"
- Never present the synthesis as a resolved philosophy — it is a map of terrain

PHILOSOPHICAL DEPTH
- Go beyond paraphrase — identify the *structure* of arguments
- Name the philosophical stakes: what is actually at issue in the tension?
- Connect to the broader Stoic framework (hegemonikon, oikeiosis, the discipline of desire, etc.) where relevant
- Note connections to non-Stoic traditions when the sources warrant it

FORMAT
- Target: ${targetWordCount} words
- Structure: flowing prose with clear internal sections (no headers with # — use bold section titles inline)
- Opening: state what the document covers and why it matters for practice
- Body: the synthesis itself, following the type instructions
- Closing: what remains unresolved and why that matters — philosophical humility

WHAT TO NEVER DO
- Invent sources or claims not in the provided passages
- Resolve tensions the sources themselves don't resolve
- Write in a pop-philosophy or self-help register
- Begin with "In this document" or similar meta-preamble`;
}

async function callClaude(system, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      // A ~2000-word synthesis runs ~2700-3200 tokens; the old 3000 cap cut
      // documents off mid-sentence. Give ample headroom so they finish.
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.stop_reason === 'max_tokens') {
    console.warn('  ⚠ generation hit max_tokens — document may be truncated');
  }
  return json;
}

async function generateSynthesis(concept, passages, synthesisType, config) {
  const authorsInvolved = [...new Set(passages.map(p => p.author))];
  const worksInvolved = [...new Set(passages.map(p => p.work))];

  const passageText = passages.map((p, i) =>
    `[Source ${i + 1}] ${p.author} — ${p.work}\n"${p.chunk_text}"`
  ).join('\n\n');

  const userPrompt = `Synthesize the philosophical concept of "${concept}" using these source passages.

Synthesis type: ${TYPE_INSTRUCTIONS[synthesisType](concept)}

Authors involved: ${authorsInvolved.join(', ')}

SOURCE PASSAGES:
${passageText}

Generate a ${config.target_word_count}-word synthesis document now.
Title it thoughtfully — the title should name the concept and the synthesis angle
(e.g. "Anger and the Rational Soul: Seneca, Marcus, and Musonius in Disagreement").
Put the title on the first line, then the document.`;

  const data = await callClaude(buildSystemPrompt(config.target_word_count), userPrompt);
  const block = (data.content || []).find(b => b.type === 'text');
  const content = block ? block.text : '';
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  // Title = first non-empty line, stripped of any markdown heading marks.
  const lines = content.split('\n').filter(l => l.trim());
  const title = (lines[0] || concept).replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '').trim();

  return {
    title,
    content,
    wordCount,
    authorsInvolved,
    worksInvolved,
    sourceChunkIds: passages.map(p => p.id).filter(Boolean),
    promptTokens: data.usage?.input_tokens ?? null,
    completionTokens: data.usage?.output_tokens ?? null,
  };
}

// --- 2f. Main loop ---------------------------------------------------------

// options.count — generate exactly this many documents on demand (overrides the
// configured documents_per_week, e.g. the admin "Run synthesis" button).
// Returns a summary so callers can report results.
async function runSynthesisAgent(options = {}) {
  const startTime = Date.now();
  console.log(`=== Synthesis Agent — ${new Date().toISOString()} ===`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set — semantic source retrieval will be skipped.');
  }

  const baseConfig = await getAgentConfig();
  if (!baseConfig.enabled && !options.count) {
    console.log('Synthesis agent disabled in config. Exiting.');
    return { succeeded: 0, skipped: 0, failed: 0, disabled: true, titles: [] };
  }
  // A manual run with an explicit count overrides documents_per_week (and runs
  // even when the scheduled agent is disabled).
  const config = options.count
    ? { ...baseConfig, documents_per_week: Math.max(1, options.count) }
    : baseConfig;

  const concepts = await selectConceptsForSynthesis(config);
  console.log(`Selected ${concepts.length} concept(s) for synthesis this week:`);
  concepts.forEach(c => console.log(`  ${c.demandRank}. "${c.concept}" (${c.userFrequency} user sessions)`));

  if (concepts.length === 0) {
    console.log('\nNo eligible concepts (no journal_analysis demand and no structural fallback). Exiting.');
    return { succeeded: 0, skipped: 0, failed: 0, titles: [], reason: 'no_eligible_concepts' };
  }

  const generationWeek = getMondayOfCurrentWeek();
  let succeeded = 0, failed = 0, skipped = 0;
  const titles = [];

  for (const { concept, userFrequency, demandRank } of concepts) {
    try {
      console.log(`\nSynthesizing: "${concept}"...`);

      const passages = await getSourcePassages(concept);
      if (passages.length < 2) {
        console.log(`  Skipping "${concept}" — insufficient source passages (${passages.length})`);
        skipped++;
        continue;
      }

      const synthesisType = determineSynthesisType(concept, passages, config);
      console.log(`  Type: ${synthesisType} | Sources: ${[...new Set(passages.map(p => p.author))].join(', ')}`);

      const result = await generateSynthesis(concept, passages, synthesisType, config);

      // Store for admin review — NOT ingested yet.
      const { error } = await supabase.from('synthesis_documents').insert({
        title: result.title,
        synthesis_type: synthesisType,
        concept,
        authors_covered: result.authorsInvolved,
        works_covered: result.worksInvolved,
        source_chunk_ids: result.sourceChunkIds,
        content: result.content,
        word_count: result.wordCount,
        user_theme_frequency: userFrequency,
        demand_rank: demandRank,
        status: 'pending_review',
        generation_week: generationWeek,
        generation_model: 'claude-sonnet-4-6',
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
      });
      if (error) throw new Error(error.message);

      console.log(`  ✓ Generated: "${result.title}" (${result.wordCount} words) — pending review`);
      succeeded++;
      titles.push(result.title);

      // Rate limit — synthesis calls are expensive.
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`  ✗ Failed for "${concept}":`, err.message);
      failed++;
    }
  }

  console.log(`\n=== Run Complete ===`);
  console.log(`Generated: ${succeeded} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log(`All documents pending admin review at academy.pursuearete.com/admin/synthesis`);
  console.log(`Run time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`===================`);

  return { succeeded, skipped, failed, titles, generationWeek };
}

// Exported for testing / manual invocation; only auto-runs as a CLI.
module.exports = {
  getAgentConfig,
  selectConceptsForSynthesis,
  getSourcePassages,
  determineSynthesisType,
  generateSynthesis,
  runSynthesisAgent,
};

if (require.main === module) {
  runSynthesisAgent().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
