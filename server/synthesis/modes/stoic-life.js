// server/synthesis/modes/stoic-life.js
//
// Stoic Life mode of the Synthesis Agent. Writes ~2000-word pieces on how to
// live a Stoic life, one approved topic at a time, in the versioned Markdown
// format of academy/corpus-ingestion/synthesis/ (the same path Kyle's Stoic
// Logic and Virtues of Socrates documents took into the corpus).
//
// A cycle (runStoicLifeCycle) does two things:
//   1. Tops up the topic backlog when fewer than min_approved_topics approved
//      topics are waiting (synthesis/topic-proposer.js). Proposals wait for
//      Kyle; nothing is drafted from a proposal.
//   2. Drafts the oldest approved topic, if one is waiting and no Stoic Life
//      draft is in review (claim_stoic_life_topic enforces both, atomically).
// Cycles are started by the admin page when Kyle approves a topic or reviews
// a draft (POST /api/admin/synthesis/stoic-life/run), and by
// `node synthesis-agent.js --mode stoic-life`. There is no schedule.
//
// What a draft may read:
//   - Primary texts only, author by author: the Stoics, and Diogenes
//     Laertius Book VII. Every layer but `primary` is excluded in the query,
//     using the fence's own lists (lib/corpus-fence.js, unchanged), and the
//     rows are filtered again on text_type and author. Synthesis, including
//     this mode's own past pieces, can never reach a prompt.
//   - The latest world observation Kyle approved (status 'approved', not
//     'auto_approved'), if it is recent. It shapes how the topic is applied
//     to the present; it never chooses the topic.
//
// What a draft says about itself: sections that report the sources are
// corpus_verified when the citation check passes and unverified when it does
// not; sections that apply them to the present are interpretive, with a
// review_by date. The political check flags any contemporary political
// reference that is not in the approved observation, and the draft is
// written again once without it.
//
// Every quotation is also checked against the passages with no model call
// (synthesis/locators.js): words in no passage or cited to the wrong author
// make the section unverified; a wrong section number or a quote introduced
// under another author's name is flagged for Kyle. A Haiku pass lists the
// sentences carrying machine tells (docs/machine-tells.md), as flags only.
//
// Model: claude-sonnet-4-6 for drafting and proposing (matching the
// journal-demand mode; Kyle's choice), Haiku for the checks.

const shared = require('../shared');
const { getSupabase, embed, callClaude, textOf, extractJson, getAgentConfig, DAY } = shared;
const {
  excludeTextTypesForLayers, MODERN_TEXT_TYPES, isSynthesisAuthor,
} = require('../../lib/corpus-fence');
const { renderSynthesisMarkdown } = require('../../lib/synthesis-markdown');
const { logRetrieval } = require('../../lib/retrieval-log');
const { checkCitations, checkPolitical, checkTells } = require('../checks');
const { checkQuotations } = require('../locators');
const { uniqueDocKey, insertDraft } = require('../drafts');
const { randomUUID } = require('crypto');

const AGENT_NAME = 'synthesis_stoic_life';
const MODE = 'stoic_life';

// world-agent.js builds a Supabase client at load, so its author list is
// read lazily rather than at require time.
function stoicAuthors() {
  return [...require('../../world-agent').STOIC_AUTHORS];
}

function defaultConfig() {
  return {
    enabled: true,
    model: 'claude-sonnet-4-6',
    check_model: 'claude-haiku-4-5-20251001',
    target_word_count: 2000,
    authors: [...stoicAuthors(), 'Diogenes Laërtius'],
    author_works: { 'Diogenes Laërtius': ['Lives of Eminent Philosophers, Book VII'] },
    passages_per_author: 4,
    max_passages: 18,
    world_observation_max_age_days: 21,
    review_by_months: 12,
    min_approved_topics: 5,
    max_pending_proposals: 8,
    topic_dedup_similarity: 0.85,
    gap_similarity_threshold: 0.30,
    gap_window_days: 60,
    gap_min_members: 3,
    gap_min_words: 6,
    gap_cluster_similarity: 0.80,
    gap_max_questions: 200,
    journal_window_days: 30,
    journal_min_members: 3,
    primary_works: [
      { author: 'Epictetus', work: 'Discourses' },
      { author: 'Epictetus', work: 'Enchiridion' },
      { author: 'Seneca', work: 'Letters' },
      { author: 'Marcus Aurelius', work: 'Meditations' },
    ],
    primary_sample_size: 40,
  };
}

async function getConfig() {
  return getAgentConfig(AGENT_NAME, defaultConfig());
}

// ── Sources ─────────────────────────────────────────────────────────────────

// Every text_type except primary. Built from the fence's lists: canon is
// primary plus modern_primary, and the modern layer is excluded on top.
function primaryOnlyExcludes() {
  return [...new Set([...excludeTextTypesForLayers(['canon']), ...MODERN_TEXT_TYPES])];
}

// The belt to the query's braces: only primary rows, never a synthesis
// author, only the configured works for authors limited by work, no repeats.
function filterPassages(rows, author, config) {
  const works = (config.author_works || {})[author];
  return (rows || []).filter(r =>
    r && r.text_type === 'primary' &&
    !isSynthesisAuthor(r.author) &&
    r.author === author &&
    (!works || works.includes(r.work)));
}

// Round-robin across authors, best first within each, so no one author
// fills the prompt.
function interleave(byAuthor, max) {
  const out = [];
  const lists = byAuthor.map(l => [...l]);
  while (out.length < max && lists.some(l => l.length)) {
    for (const l of lists) if (l.length && out.length < max) out.push(l.shift());
  }
  return out;
}

async function retrievePassages(topic, config) {
  const supabase = getSupabase();
  const embedding = await embed(topic.title);
  if (!embedding) throw new Error('could not embed the topic (is OPENAI_API_KEY set?)');
  const exclude = primaryOnlyExcludes();
  const per = config.passages_per_author;
  const byAuthor = await Promise.all(config.authors.map(async author => {
    const limited = !!(config.author_works || {})[author];
    const { data, error } = await supabase.rpc('match_rag_corpus', {
      query_embedding: embedding,
      // An author limited to some works is over-fetched, then filtered.
      match_count: limited ? per * 6 : per,
      filter_author: author,
      filter_language: 'english',
      exclude_text_types: exclude,
    });
    if (error) console.error(`  retrieval failed for ${author}: ${error.message}`);
    return filterPassages(data, author, config).slice(0, per);
  }));
  const seen = new Set();
  const passages = interleave(byAuthor, config.max_passages)
    .filter(p => !seen.has(p.id) && seen.add(p.id))
    .map((p, i) => ({ n: i + 1, id: p.id, author: p.author, work: p.work, section_label: p.section_label, chunk_text: p.chunk_text, similarity: p.similarity }));
  logRetrieval({ requestId: randomUUID(), agent: 'synthesis:stoic-life', queryText: topic.title, chunks: passages });
  return passages;
}

// The latest observation Kyle approved, if it is recent enough to speak of
// "now". auto_approved rows never went through him and are not used.
async function latestApprovedWorld(config, now = new Date()) {
  const { data, error } = await getSupabase()
    .from('world_observations')
    .select('id, observation_week, dominant_signal, dispatch_context, world_corpus_tension')
    .eq('status', 'approved')
    .order('observation_week', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`reading world observations: ${error.message}`);
  if (!data) return null;
  const age = (now - new Date(`${data.observation_week}T00:00:00Z`)) / DAY;
  if (age > config.world_observation_max_age_days) return null;
  return data;
}

function worldContextText(obs) {
  if (!obs) return null;
  return [
    `Week of ${obs.observation_week}.`,
    obs.dispatch_context || obs.dominant_signal || '',
    obs.world_corpus_tension ? `Where the world and the Stoa pull against each other: ${obs.world_corpus_tension}` : '',
  ].filter(Boolean).join('\n');
}

// ── Prompt ──────────────────────────────────────────────────────────────────

// The prose rules are a short form of docs/machine-tells.md (the canonical
// list is academy/web/src/lib/machine-tells.ts, which the server cannot
// import).
function buildSystemPrompt(config) {
  return `You write for Arete, a platform for people trying to live as Stoics now. Each piece takes one question about how to live and answers it from the Stoic sources, then carries it into the present. The pieces are reviewed by a human editor and, once approved, become teaching material that the platform's AI counselors can draw on, always labelled as an Arete synthesis and never as an ancient text.

TWO KINDS OF SECTION
- "ancient" sections report what the sources say. Every claim about what an author said or held must be supported by the source passages. Cite inline as (Author, Work section) and list the source numbers you relied on in "cites". Quote only words that appear in a passage. Where the texts do not settle a point, say so in terms of the authors and their works ("Seneca never says whether...", "the surviving Discourses leave this open"), never in terms of what you were given.
- "present" sections apply the sources to life now: concrete situations, decisions and practices a reader could start this week. They interpret; they do not report.

THE PRESENT DAY
- If an APPROVED WORLD CONTEXT is given, you may use it to shape how the topic applies now. It must not change the topic.
- Do not name any living politician, political party, election, current war, government policy dispute or specific recent news event unless it appears in the approved context. Ordinary life (work, family, money, illness, screens, crowds, the news in general) needs no approval.
- If no context is given, write about the present in general terms only.

PHILOSOPHICAL HONESTY
- Where the sources disagree, show the disagreement. Do not resolve it.
- Do not present Stoicism as self-help or as a technique for feeling better.

PROSE
- No dashes as punctuation (em dash, en dash, or spaced hyphen). Use a period, colon, semicolon, comma or parentheses.
- No negation-first frames ("This is not X. It is Y."), no announcing importance ("Here is the crux"), no hyperbole, no signposting ("firstly", "in conclusion", "it is important to note"), no thesaurus diction (delve, tapestry, navigate, crucial, profound, nuanced, landscape).
- Vary the shape of sections and paragraphs. Not every paragraph needs a quotation. Do not end with a summary or a moral.
- Plain paragraphs. Lists only where a list is the natural form (a set of practices). No "#" headings inside a body.
- The reader never sees the source passages. Never refer to them or to how you received them: no "the passages provided", "the sources given", "the texts above", "Source 3". Name the author and work instead.

LENGTH AND SHAPE
- About ${config.target_word_count} words in total.
- An introduction of one or two short paragraphs, then 5 to 8 sections, at least two "ancient" and at least two "present". The last section is "present" and gives practices.

FOLLOW-ON TOPICS
Propose two or three further questions about how to live a Stoic life that this piece opens but does not answer. Each needs a title (a short question or phrase) and a one or two sentence rationale.

Return only JSON, with no text before or after it:
{
  "title": "<the piece's title>",
  "introduction": "<the introduction>",
  "sections": [{"heading": "<heading>", "kind": "ancient" | "present", "body": "<the section>", "cites": [<source numbers>]}],
  "follow_ons": [{"title": "<title>", "rationale": "<why>"}]
}`;
}

function buildUserPrompt(topic, passages, worldText, avoid = []) {
  const passageText = passages.map(p =>
    `[Source ${p.n}] ${p.author}, ${p.work}${p.section_label ? `, ${p.section_label}` : ''}\n"${p.chunk_text}"`
  ).join('\n\n');
  return `TOPIC: ${topic.title}
WHY THIS TOPIC: ${topic.rationale}

APPROVED WORLD CONTEXT:
${worldText || '(none: write about the present in general terms only)'}
${avoid.length ? `\nA reviewer's screen found these contemporary political references in an earlier version. Leave every one of them out:\n${avoid.map(a => `- ${a}`).join('\n')}\n` : ''}
SOURCE PASSAGES (primary texts only):
${passageText}`;
}

// ── Draft shape ─────────────────────────────────────────────────────────────

function validateDraft(raw, passageCount) {
  if (!raw || typeof raw !== 'object') throw new Error('the model returned no JSON draft');
  const title = String(raw.title || '').trim();
  if (!title) throw new Error('the draft has no title');
  const sections = (Array.isArray(raw.sections) ? raw.sections : [])
    .map(s => ({
      heading: String(s.heading || '').trim(),
      kind: s.kind === 'ancient' ? 'ancient' : s.kind === 'present' ? 'present' : null,
      body: String(s.body || '').trim(),
      cites: (Array.isArray(s.cites) ? s.cites : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= passageCount),
    }))
    .filter(s => s.body);
  if (sections.some(s => !s.kind)) throw new Error('a section has a kind other than "ancient" or "present"');
  if (!sections.some(s => s.kind === 'ancient')) throw new Error('the draft has no "ancient" section');
  if (!sections.some(s => s.kind === 'present')) throw new Error('the draft has no "present" section');
  const followOns = (Array.isArray(raw.follow_ons) ? raw.follow_ons : [])
    .map(f => ({ title: String(f.title || '').trim(), rationale: String(f.rationale || '').trim() }))
    .filter(f => f.title)
    .slice(0, 3);
  return { title, introduction: String(raw.introduction || '').trim(), sections, follow_ons: followOns };
}

function fullText(draft) {
  return [draft.title, draft.introduction, ...draft.sections.map(s => `${s.heading}\n${s.body}`)].join('\n\n');
}

// Quotation problems that make corpus_verified untrue for the section that
// holds them. A wrong section number or a prose misattribution is flagged
// for Kyle to fix and leaves the status alone.
const DOWNGRADING_QUOTE_PROBLEMS = new Set(['not_found', 'wrong_author']);

// corpus_verified for an ancient section the check supports and whose
// quotations are all in the passages under the right author; unverified
// otherwise; interpretive for everything that applies the sources.
// quotationFindings: per section, in draft order (optional).
function sectionStatuses(draft, citationChecks, quotationFindings = []) {
  let k = 0;
  return draft.sections.map((s, i) => {
    if (s.kind === 'present') return ['interpretive'];
    const check = citationChecks[k++];
    const quoteTrouble = (quotationFindings[i] || []).some(f => DOWNGRADING_QUOTE_PROBLEMS.has(f.problem));
    return check && check.supported && !quoteTrouble ? ['corpus_verified'] : ['unverified'];
  });
}

// Every quotation, section by section, against the passages
// (synthesis/locators.js). Returns [findings per section] and a flat list
// with the heading on each finding for the review page.
function quotationChecks(draft, passages) {
  const perSection = draft.sections.map(s => checkQuotations(s.body, passages));
  const flat = [
    ...checkQuotations(draft.introduction || '', passages).map(f => ({ heading: 'Introduction', ...f })),
    ...perSection.flatMap((fs, i) => fs.map(f => ({ heading: draft.sections[i].heading, ...f }))),
  ];
  return { perSection, flat };
}

// The works the piece actually relies on: what the ancient sections cite and
// what the checker found them relying on. All passages if neither names any.
function sourcesUsed(draft, citationChecks, passages) {
  const ns = new Set();
  draft.sections.filter(s => s.kind === 'ancient').forEach((s, i) => {
    s.cites.forEach(n => ns.add(n));
    (citationChecks[i]?.sources || []).forEach(n => ns.add(n));
  });
  const used = passages.filter(p => ns.has(p.n));
  return [...new Set((used.length ? used : passages).map(p => `${p.author} | ${p.work}`))];
}

function addMonths(isoDate, months) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

// ── Drafting ────────────────────────────────────────────────────────────────

async function generate(topic, passages, worldText, config, avoid) {
  const data = await callClaude({
    model: config.model,
    system: buildSystemPrompt(config),
    userPrompt: buildUserPrompt(topic, passages, worldText, avoid),
    maxTokens: 8000,
  });
  return {
    draft: validateDraft(extractJson(textOf(data)), passages.length),
    usage: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
  };
}

async function writeDraft(topic, config, log) {
  const passages = await retrievePassages(topic, config);
  const authors = new Set(passages.map(p => p.author));
  if (passages.length < 4 || authors.size < 2) {
    throw new Error(`too few primary passages for "${topic.title}" (${passages.length} from ${authors.size} author(s))`);
  }
  const world = await latestApprovedWorld(config);
  const worldText = worldContextText(world);
  log(`  sources: ${passages.length} passages from ${[...authors].join(', ')}; world context: ${world ? `approved observation of ${world.observation_week}` : 'none'}`);

  let { draft, usage } = await generate(topic, passages, worldText, config, []);
  let political = await checkPolitical(fullText(draft), worldText, { model: config.check_model });
  const firstPolitical = political;
  if (political.flagged) {
    log(`  political check flagged ${political.items.length || 'an unreadable verdict'}; writing again without it`);
    const second = await generate(topic, passages, worldText, config, political.items);
    draft = second.draft;
    usage = { input: usage.input + second.usage.input, output: usage.output + second.usage.output };
    political = await checkPolitical(fullText(draft), worldText, { model: config.check_model });
  }

  const ancient = draft.sections.filter(s => s.kind === 'ancient');
  const [citations, tells] = await Promise.all([
    checkCitations(ancient, passages, { model: config.check_model }),
    checkTells(fullText(draft), { model: config.check_model }),
  ]);
  const quotations = quotationChecks(draft, passages);
  const statuses = sectionStatuses(draft, citations, quotations.perSection);
  const today = new Date().toISOString().slice(0, 10);
  const docKey = await uniqueDocKey('stoic-life', topic.title);

  const markdown = renderSynthesisMarkdown({
    doc_key: docKey,
    version: 1,
    title: draft.title,
    created_at: today,
    generated_with: `${config.model}, Arete Synthesis Agent (Stoic Life mode)`,
    review_by: addMonths(today, config.review_by_months),
    sources_used: sourcesUsed(draft, citations, passages),
    regenerate_when: world ? [`World observation of ${world.observation_week} superseded`] : [],
    introduction: draft.introduction ? { body: draft.introduction, status: ['interpretive'] } : null,
    sections: draft.sections.map((s, i) => ({ heading: s.heading, body: s.body, status: statuses[i] })),
  });

  return insertDraft({
    mode: MODE,
    topic_id: topic.id,
    doc_key: docKey,
    version: 1,
    title: draft.title,
    markdown,
    checks: {
      citations,
      downgraded: draft.sections.filter((sec, i) => sec.kind === 'ancient' && statuses[i][0] === 'unverified').map(sec => sec.heading),
      quotations: quotations.flat,
      tells,
      political,
      ...(firstPolitical.flagged ? { political_first_pass: firstPolitical } : {}),
    },
    follow_ons: draft.follow_ons,
    source_chunk_ids: passages.map(p => p.id),
    world_observation_id: world ? world.id : null,
    generation_model: config.model,
    prompt_tokens: usage.input,
    completion_tokens: usage.output,
  });
}

// Claim the next approved topic and draft it. Returns what happened.
async function draftNext(config, log = console.log) {
  const supabase = getSupabase();
  const { data: claimed, error } = await supabase.rpc('claim_stoic_life_topic', {});
  if (error) throw new Error(`claiming a topic: ${error.message}`);
  const topic = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!topic) {
    log('No draft this cycle: no approved topic is waiting, or a draft is already in review.');
    return { drafted: false };
  }
  log(`Drafting: "${topic.title}"`);
  try {
    const draft = await writeDraft(topic, config, log);
    const { error: uErr } = await supabase.from('synthesis_topics')
      .update({ status: 'drafted', drafted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', topic.id);
    if (uErr) log(`  ! drafted, but could not mark the topic drafted: ${uErr.message}`);
    log(`  ✓ "${draft.title}" stored as ${draft.doc_key}.v1.md, pending review`);
    return { drafted: true, topic: topic.title, draft_id: draft.id, doc_key: draft.doc_key };
  } catch (err) {
    // Back to approved, with the reason, so Kyle sees it and the next cycle retries.
    await supabase.from('synthesis_topics')
      .update({ status: 'approved', claimed_at: null, last_error: err.message.slice(0, 1000), updated_at: new Date().toISOString() })
      .eq('id', topic.id);
    log(`  ✗ ${err.message}`);
    return { drafted: false, topic: topic.title, error: err.message };
  }
}

// One cycle: top up the backlog, then draft if a topic is waiting. Never
// exits the process: this also runs inside the API server.
async function runStoicLifeCycle({ log = console.log } = {}) {
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CLAUDE_API_KEY', 'OPENAI_API_KEY']) {
    if (!process.env[key]) throw new Error(`${key} not set`);
  }
  const config = await getConfig();
  if (!config.enabled) {
    log('Stoic Life mode is disabled in agent_config (synthesis_stoic_life). Nothing to do.');
    return { disabled: true };
  }
  const { proposeTopics } = require('../topic-proposer');
  let proposals;
  try {
    proposals = await proposeTopics(config, { log });
  } catch (err) {
    // A failed proposal pass must not block drafting an approved topic.
    log(`  ✗ proposing topics: ${err.message}`);
    proposals = { error: err.message };
  }
  const draft = await draftNext(config, log);
  return { proposals, draft };
}

module.exports = {
  AGENT_NAME,
  MODE,
  defaultConfig,
  getConfig,
  primaryOnlyExcludes,
  filterPassages,
  interleave,
  latestApprovedWorld,
  worldContextText,
  buildSystemPrompt,
  buildUserPrompt,
  validateDraft,
  sectionStatuses,
  quotationChecks,
  sourcesUsed,
  addMonths,
  draftNext,
  runStoicLifeCycle,
};
