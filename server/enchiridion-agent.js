// server/enchiridion-agent.js
//
// The Enchiridion: a member's own handbook, assembled from everything they
// have written into Arete and set beside the corpus.
//
// Epictetus never wrote the Enchiridion; Arrian compiled it from what the
// man had said in class. This agent does the same for a member. It reads the
// journal, the Cabinet conversations, the goals, the scrolls, the daily
// check-ins and the Know Thyself answers, chooses what is worth keeping, and
// arranges it into chapters with a short editorial voice between the
// member's own words. Corpus passages are quoted verbatim beside them, with
// author, work and translator, and only from the primary layer (the
// public-domain texts), so the printed page never carries copyrighted
// scholarship or the modern layer.
//
// Two rules the design rests on:
//
//   1. The model never rewrites the member. Every quoted journal entry,
//      belief, Cabinet exchange, scroll and corpus passage is rendered here
//      from the database row, not from the model's output. The model chooses
//      (by id) and introduces; it does not transcribe. A book of someone's
//      own words has to be their words.
//   2. Chapters that have nothing to draw on are left out. A member with no
//      scrolls gets no Scrolls chapter, not an apology.
//
// Chapters are generated one call each so a long manuscript never waits on
// one enormous response, and the row is updated after each chapter so the
// admin tab can watch it grow. Raw fetch to Anthropic, no SDK, like the
// sibling agents. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// CLAUDE_API_KEY; OPENAI_API_KEY for corpus retrieval (optional: without it
// the book simply carries no corpus passages).

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { getRelevantChunks } = require('./retrieval');
const { isCounselorVisible } = require('./lib/corpus-fence');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DAY = 24 * 60 * 60 * 1000;

const DEFAULTS = {
  enabled: true,
  model: 'claude-opus-5',
  price_cents: 8900,
  currency: 'usd',
  formats: {
    hardcover: { label: 'Hardcover', price_cents: 8900 },
    softcover: { label: 'Softcover', price_cents: 5900 },
    journal: { label: 'Journal edition', price_cents: 6900 },
  },
  min_journal_entries: 5,
  max_journal_entries: 400,
  max_cabinet_messages: 600,
  max_scrolls: 40,
  corpus_passages_per_chapter: 3,
  target_words_per_chapter: 1400,
};

// Only the primary layer may be printed. Verbatim ingestion is public domain
// by the corpus rule, so a primary chunk can be quoted in a book; nothing else
// can. The counselor fence is applied on top as belt to braces.
const PRINTABLE_TEXT_TYPES = ['primary'];

// Candidate-list caps: what the model sees when choosing, per chapter.
const CANDIDATE_CHARS = 1100;   // per item in the candidate list
const RENDER_CHARS = 6000;      // per quoted item on the page

function shortId(id) {
  return (id || '').toString().slice(0, 8);
}

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'enchiridion-agent')
    .maybeSingle();
  return { ...DEFAULTS, ...(data?.config || {}) };
}

// --- Text helpers (mirrors of the recall helpers in index.js) --------------

// Cabinet transcripts pasted into the journal are dense with asterisk stage
// directions; ordinary writing almost never has two.
function looksLikeCounselorTranscript(text) {
  return (String(text).match(/\*[^*\n]+\*/g) || []).length >= 2;
}

function clean(text) {
  return (text || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
}

function squash(text, max) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

// Cap a passage for the page without flattening its paragraphs (squash is
// for candidate lists, where one line per item is the point).
function trimTo(text, max) {
  const t = clean(text);
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

function longDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function monthYear(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

function wordCount(text) {
  return (text || '').split(/\s+/).filter(Boolean).length;
}

// --- Gathering ---------------------------------------------------------------

async function gatherMaterial(userId, config) {
  const [
    { data: settings },
    { data: profile },
    { data: entries },
    { data: convos },
    { data: goals },
    { data: scrolls },
    { data: checkins },
    { data: model },
    { data: counselorRows },
  ] = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('id, email, handle, streak, created_at').eq('id', userId).maybeSingle(),
    supabase
      .from('journal_entries')
      .select('id, type, content, book_title, author, source, raw_input, encoded_belief, refined_statement, virtue_check, belief_stage, topic, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(config.max_journal_entries),
    supabase
      .from('cabinet_conversations')
      .select('id, counselor_slugs, messages, created_at, updated_at, session_type')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true }),
    supabase
      .from('goals')
      .select('id, title, description, target_date, completed, completed_at, source, category, counselor, priority, archived, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('scrolls')
      .select('id, title, body, counselor, goal_source, request_type, created_at, scroll_reads (read_count, last_read_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(config.max_scrolls),
    supabase
      .from('check_ins')
      .select('check_in_date, intention, stoic_answer, reflection_answer, morning_done, evening_done, daily_question_response')
      .eq('user_id', userId)
      .gte('check_in_date', new Date(Date.now() - 365 * DAY).toISOString().slice(0, 10))
      .order('check_in_date', { ascending: true }),
    supabase
      .from('user_longitudinal_models')
      .select('philosophical_portrait, persistent_themes, emerging_themes, growth_edges, dominant_philosophical_orientation, emotional_tone_baseline, weeks_analyzed, counselor_affinity')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('counselors').select('slug, name'),
  ]);

  const counselorNames = {};
  for (const c of counselorRows || []) counselorNames[c.slug] = c.name;
  const nameOf = slug => counselorNames[slug] || (slug ? String(slug) : 'The Cabinet');

  // Journal: keep entries with real content; drop pasted transcripts. Oldest
  // first so the book reads forward in time.
  const journal = (entries || [])
    .filter(e => (e.content && e.content.trim()) || (e.encoded_belief && e.encoded_belief.trim()))
    .filter(e => !looksLikeCounselorTranscript(e.content || ''))
    .reverse();
  const reflections = journal.filter(e => e.type === 'reflection' || e.type === 'idea');
  const quotes = journal.filter(e => e.type === 'quote');
  const beliefs = journal.filter(e => e.type === 'belief' && ((e.encoded_belief || e.refined_statement || e.content) || '').trim());

  // Cabinet: flatten the jsonb threads into exchanges (one member message and
  // the counselor replies that followed it), newest last, capped by message
  // count so a heavy user still fits one call.
  const exchanges = [];
  for (const convo of convos || []) {
    const messages = Array.isArray(convo.messages) ? convo.messages : [];
    const slugs = Array.isArray(convo.counselor_slugs) ? convo.counselor_slugs : [];
    let current = null;
    messages.forEach((m, idx) => {
      if (!m || typeof m.content !== 'string' || !m.content.trim()) return;
      if (m.role === 'user') {
        current = {
          id: `${convo.id}:${idx}`,
          date: m.timestamp ? new Date(m.timestamp).toISOString() : convo.updated_at,
          shared: convo.session_type === 'shared',
          question: clean(m.content),
          answers: [],
        };
        exchanges.push(current);
      } else if (m.role === 'assistant' && current) {
        const counselor = m.counselorName || nameOf(m.counselorId || slugs[0]);
        current.answers.push({ counselor, content: clean(m.content) });
      }
    });
  }
  const substantive = exchanges.filter(x => x.answers.length > 0 && x.question.length >= 20);
  let messageBudget = config.max_cabinet_messages;
  const cabinet = [];
  for (let i = substantive.length - 1; i >= 0 && messageBudget > 0; i--) {
    cabinet.unshift(substantive[i]);
    messageBudget -= 1 + substantive[i].answers.length;
  }

  // Check-ins: the sentences the member committed to and the evening answers.
  const intentions = (checkins || []).filter(c => c.intention && c.intention.trim().length >= 8);
  const eveningAnswers = (checkins || []).filter(c => (c.stoic_answer || c.reflection_answer || '').trim().length >= 40);

  const scrollsClean = (scrolls || []).map(s => ({
    ...s,
    counselorName: nameOf(s.counselor),
    read_count: s.scroll_reads?.[0]?.read_count ?? 0,
  }));

  const activeGoals = (goals || []).filter(g => !g.archived);

  const firstDate = [journal[0]?.created_at, cabinet[0]?.date, profile?.created_at].filter(Boolean).sort()[0] || null;
  const lastDate = [journal[journal.length - 1]?.created_at, cabinet[cabinet.length - 1]?.date, new Date().toISOString()]
    .filter(Boolean).sort().pop();

  return {
    settings: settings || {},
    profile: profile || {},
    name: (settings?.user_name || profile?.handle || '').trim(),
    journal, reflections, quotes, beliefs,
    cabinet,
    goals: activeGoals,
    scrolls: scrollsClean,
    intentions, eveningAnswers,
    model: model || null,
    counselorNames,
    span: { first: firstDate, last: lastDate },
  };
}

// --- Corpus ------------------------------------------------------------------

// Passages the book may quote: primary layer only, counselor-visible, not
// deprecated (the retrieval RPC already filters deprecated rows). Attribution
// columns are fetched by id afterwards; getRelevantChunks returns only
// author and work.
async function corpusCandidates(queries, perQuery) {
  if (!process.env.OPENAI_API_KEY) return [];
  const seen = new Map();
  for (const q of queries.filter(Boolean).slice(0, 6)) {
    let rows = [];
    try {
      rows = await getRelevantChunks(squash(q, 600), perQuery, { text_type: 'primary' });
    } catch (err) {
      console.warn(`  corpus retrieval failed for a query: ${err.message}`);
      continue;
    }
    for (const r of rows) {
      if (!PRINTABLE_TEXT_TYPES.includes(r.text_type) || !isCounselorVisible(r)) continue;
      if (!seen.has(r.id)) seen.set(r.id, r);
    }
  }
  const ids = [...seen.keys()];
  if (!ids.length) return [];
  const { data } = await supabase
    .from('rag_corpus')
    .select('id, author, work, translator, edition_year, section_label, locator, text_type, deprecated')
    .in('id', ids);
  const meta = {};
  for (const row of data || []) meta[row.id] = row;
  return ids
    .map(id => ({ ...seen.get(id), ...(meta[id] || {}) }))
    .filter(r => !r.deprecated && PRINTABLE_TEXT_TYPES.includes(r.text_type))
    .map(r => ({
      id: r.id,
      author: r.author,
      work: r.work,
      translator: r.translator || null,
      edition_year: r.edition_year || null,
      locator: r.locator || r.section_label || null,
      content: clean(r.content),
    }));
}

// --- Claude ------------------------------------------------------------------

const EDITOR_SYSTEM = `You are the editor assembling a member's Enchiridion for Arete, a philosophical companion built on the Stoics and their neighbours. The book is compiled from the member's own writing in the app: their journal, their conversations with a Cabinet of counselors (Marcus Aurelius, Seneca, Epictetus and others, each answering in their own voice), their goals, their daily intentions and the scrolls written for them.

Your role is Arrian's, not Epictetus's. You choose what is worth keeping and you write the short connective prose between the member's words. You never rewrite, paraphrase or invent anything the member wrote; you select it by id and the book renders it verbatim from the record. You never invent a source passage; you select from the candidates offered, by id.

Voice of the editorial prose: classical, dry, specific, second person ("you wrote", "you asked Seneca"). Nothing chirpy, nothing exclamatory, nothing that congratulates. No self-help register. No dashes in the prose; use commas and colons. Refer to the member by name where given. State facts flatly. Prefer the member's own phrasing when you must characterise what they said. Keep the connective prose short: the member's words are the book.

Respond only with the JSON object requested, no code fence, no preamble.`;

async function callClaude({ model, system, user, maxTokens = 16000 }) {
  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  };
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01',
  };

  // Server-side refusal fallback: if the classifiers decline (unlikely for a
  // member's own journal, but possible) the request re-runs on a fallback
  // model inside the same call. Retried once without it if the account
  // does not have the beta.
  let res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { ...headers, 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    body: JSON.stringify({ ...body, fallbacks: 'default' }),
  });
  if (res.status === 400) {
    const errText = await res.text();
    if (/fallback/i.test(errText)) {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } else {
      throw new Error(`Claude API 400: ${errText}`);
    }
  }
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.stop_reason === 'refusal') {
    throw new Error(`Claude declined this chapter (${json.stop_details?.category || 'refusal'})`);
  }
  if (json.stop_reason === 'max_tokens') {
    console.warn('  ⚠ chapter hit max_tokens; output may be truncated');
  }
  const text = (json.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return { text, model: json.model || model };
}

function parseJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Model returned no JSON object');
  }
}

async function askEditor(model, prompt) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, model: served } = await callClaude({ model, system: EDITOR_SYSTEM, user: prompt });
    try {
      return { json: parseJson(text), model: served };
    } catch (err) {
      lastErr = err;
      console.warn(`  JSON parse failed (attempt ${attempt + 1}): ${err.message}`);
    }
  }
  throw lastErr;
}

// --- Rendering ---------------------------------------------------------------
//
// Chapters are markdown. The print pipeline (later) lays them out; the admin
// tab renders them as-is. Quoted material is block-quoted, dated, attributed.

function renderJournalEntry(e) {
  const date = longDate(e.created_at);
  const lines = [];
  if (e.source === 'evening_reflection' && e.raw_input && e.raw_input.trim()) {
    lines.push(`*${squash(e.raw_input, 300)}*`, '');
  }
  lines.push(...trimTo(e.content, RENDER_CHARS).split('\n').map(l => l ? `> ${l}` : '>'));
  const tail = [date, e.topic].filter(Boolean).join(' · ');
  if (tail) lines.push('>', `> *${tail}*`);
  return lines.join('\n');
}

function renderBelief(e) {
  const before = clean(e.raw_input || e.content || '');
  const after = clean(e.encoded_belief || e.refined_statement || '');
  const lines = [];
  if (before && after && before !== after) {
    lines.push(`> ${squash(before, 800)}`, '>', `> became`, '>', `> **${squash(after, 800)}**`);
  } else {
    lines.push(`> **${squash(after || before, 800)}**`);
  }
  const vc = e.virtue_check && typeof e.virtue_check === 'object' ? e.virtue_check : null;
  const tail = [longDate(e.created_at), e.topic, vc && vc.virtue ? `virtue: ${vc.virtue}` : null].filter(Boolean).join(' · ');
  if (tail) lines.push('>', `> *${tail}*`);
  if (vc && vc.passed === false && vc.concern) lines.push('', `*The Cabinet's reservation at the time: ${squash(vc.concern, 400)}*`);
  return lines.join('\n');
}

function renderExchange(x) {
  const lines = [];
  lines.push(`**You** · ${longDate(x.date)}`, '');
  lines.push(...trimTo(x.question, RENDER_CHARS).split('\n').map(l => l ? `> ${l}` : '>'));
  for (const a of x.answers.slice(0, 3)) {
    lines.push('', `**${a.counselor}**`, '');
    lines.push(...trimTo(a.content, RENDER_CHARS).split('\n').map(l => l ? `> ${l}` : '>'));
  }
  return lines.join('\n');
}

function renderPassage(p) {
  const lines = trimTo(p.content, 2500).split('\n').map(l => l ? `> ${l}` : '>');
  const cite = [p.author, p.work, p.locator].filter(Boolean).join(', ');
  const trans = [p.translator ? `trans. ${p.translator}` : null, p.edition_year || null].filter(Boolean).join(', ');
  lines.push('>', `> *${cite}${trans ? ` (${trans})` : ''}*`);
  return lines.join('\n');
}

function renderQuote(e) {
  const attribution = [e.author, e.book_title].filter(Boolean).join(', ') || (e.source && e.source !== 'user' ? e.source : '');
  const lines = trimTo(e.content, 1500).split('\n').map(l => l ? `> ${l}` : '>');
  if (attribution) lines.push('>', `> *${attribution}*`);
  lines.push('', `*Saved ${longDate(e.created_at)}*`);
  return lines.join('\n');
}

function renderScroll(s) {
  const lines = [`## ${s.title}`, '', `*${s.counselorName}${s.goal_source ? `, on ${squash(s.goal_source, 120)}` : ''} · ${longDate(s.created_at)}*`, ''];
  lines.push(clean(s.body));
  return lines.join('\n');
}

// Build the markdown for a chapter from the editor's JSON. Sections carry
// items referencing candidates by short id; unknown ids are dropped silently.
function renderChapter({ json, lookup }) {
  const out = [];
  const used = [];
  if (json.intro) out.push(clean(json.intro), '');
  for (const section of Array.isArray(json.sections) ? json.sections : []) {
    if (section.heading) out.push(`## ${clean(section.heading)}`, '');
    if (section.commentary) out.push(clean(section.commentary), '');
    for (const item of Array.isArray(section.items) ? section.items : []) {
      const ref = typeof item === 'string' ? item : item && item.id;
      const found = ref && lookup[ref];
      if (!found) continue;
      if (item && typeof item === 'object' && item.note) out.push(clean(item.note), '');
      out.push(found.render(), '');
      used.push(found.source);
    }
    if (section.closing) out.push(clean(section.closing), '');
  }
  if (json.closing) out.push(clean(json.closing), '');
  return { body: out.join('\n').trim(), used };
}

// --- Chapter builders --------------------------------------------------------
//
// Each returns { key, title, body, sources } or null when there is nothing to
// draw on. `ctx` carries the material, the config, and the running list of
// prior chapter titles so the editor can keep continuity.

function candidateBlock(label, rows) {
  return `${label}:\n${rows.map(r => `[${r.ref}] ${r.line}`).join('\n')}`;
}

function memberProfileBlock(m) {
  const s = m.settings || {};
  const fields = [
    ['Name', m.name],
    ['Archetype', s.archetype],
    ['Background', s.kt_background],
    ['Identity', s.kt_identity],
    ['Life situation', s.kt_life_situation],
    ['Goals (as stated at the start)', s.kt_goals || s.user_goals],
    ['Strengths', s.kt_strengths],
    ['Weaknesses', s.kt_weaknesses],
    ['Patterns', s.kt_patterns],
    ['Major events', s.kt_major_events],
    [`Future self (${s.future_self_years || 10} years on)`, s.future_self_description],
    ['Why they came to Arete', s.app_usage_intent],
    ['How they want to be spoken to', [s.feedback_preference, s.accountability_style].filter(Boolean).join('; ')],
  ].filter(([, v]) => v && String(v).trim());
  return fields.map(([k, v]) => `${k}: ${squash(v, 900)}`).join('\n');
}

function longitudinalBlock(m) {
  if (!m.model) return '';
  const md = m.model;
  const themes = (arr) => (Array.isArray(arr) ? arr : []).map(t => (typeof t === 'string' ? t : t.theme || t.name || JSON.stringify(t))).slice(0, 8).join('; ');
  return [
    md.philosophical_portrait ? `Portrait (from the longitudinal model, ${md.weeks_analyzed || 0} weeks): ${squash(md.philosophical_portrait, 1500)}` : '',
    themes(md.persistent_themes) ? `Persistent themes: ${themes(md.persistent_themes)}` : '',
    themes(md.growth_edges) ? `Growth edges: ${themes(md.growth_edges)}` : '',
    md.dominant_philosophical_orientation ? `Orientation: ${md.dominant_philosophical_orientation}` : '',
    md.emotional_tone_baseline ? `Tone baseline: ${md.emotional_tone_baseline}` : '',
  ].filter(Boolean).join('\n');
}

const JSON_SHAPE = `{
  "title": "chapter title, short, sentence case",
  "intro": "one or two paragraphs of connective prose",
  "sections": [
    { "heading": "optional", "commentary": "optional, short", "items": [ { "id": "J3", "note": "optional one-line lead-in" }, "P2" ], "closing": "optional" }
  ],
  "closing": "optional"
}`;

async function chapterPreface(ctx) {
  const m = ctx.material;
  const prompt = `Write the front matter for this member's Enchiridion: a title, a subtitle, and a short preface ("To the reader") that says what this book is, how it was compiled, and the span of time it covers. Do not summarise the member's life; that is what the chapters are for. Two or three paragraphs at most.

Member: ${m.name || '(no name given)'}
Span: ${monthYear(m.span.first)} to ${monthYear(m.span.last)}
Material: ${m.reflections.length} journal entries, ${m.beliefs.length} examined beliefs, ${m.quotes.length} saved quotes, ${m.cabinet.length} Cabinet exchanges, ${m.goals.length} goals, ${m.scrolls.length} scrolls, ${m.intentions.length} daily intentions.
${longitudinalBlock(m) ? `\n${longitudinalBlock(m)}\n` : ''}
Respond with JSON: { "title": "...", "subtitle": "...", "preface": "..." }. The title should be the member's, not generic: an Enchiridion is a handbook, so something like "<Name>'s Enchiridion" or a phrase from their own themes. The subtitle names the span.`;
  const { json, model } = await askEditor(ctx.config.model, prompt);
  ctx.modelUsed = model;
  ctx.title = clean(json.title || 'Enchiridion');
  ctx.subtitle = clean(json.subtitle || '');
  return { key: 'preface', title: 'To the reader', body: clean(json.preface || ''), sources: [] };
}

async function chapterPortrait(ctx) {
  const m = ctx.material;
  const profile = memberProfileBlock(m);
  if (!profile && !m.model) return null;
  const lookup = {};
  const passages = await corpusCandidates(
    [m.settings.kt_identity, m.settings.kt_patterns, m.settings.future_self_description, m.model?.dominant_philosophical_orientation].filter(Boolean),
    ctx.config.corpus_passages_per_chapter
  );
  passages.forEach((p, i) => { lookup[`P${i + 1}`] = { render: () => renderPassage(p), source: { kind: 'corpus', id: p.id, label: `${p.author}, ${p.work}` } }; });
  const prompt = `Chapter: who you said you were. Draw a portrait of the member from what they told Arete about themselves when they arrived (the Know Thyself answers) and, if present, from the longitudinal portrait built later from their writing. Quote the member's own answers by paraphrasing sparingly and characterising precisely; you may quote short phrases from the profile verbatim inside your prose. Set one or two corpus passages beside the portrait where they genuinely speak to it, chosen by id. If none fit, use none.

KNOW THYSELF:
${profile || '(none given)'}

${longitudinalBlock(m)}

${passages.length ? candidateBlock('CORPUS PASSAGES (choose by id, verbatim on the page)', passages.map((p, i) => ({ ref: `P${i + 1}`, line: `${p.author}, ${p.work}: ${squash(p.content, CANDIDATE_CHARS)}` }))) : ''}

Respond with JSON of this shape:
${JSON_SHAPE}`;
  const { json } = await askEditor(ctx.config.model, prompt);
  const { body, used } = renderChapter({ json, lookup });
  return { key: 'portrait', title: clean(json.title || 'Who you said you were'), body, sources: used };
}

async function chapterGoals(ctx) {
  const m = ctx.material;
  if (!m.goals.length && !m.intentions.length) return null;
  const lookup = {};
  const goalLines = m.goals.map((g, i) => {
    const ref = `G${i + 1}`;
    const status = g.completed ? `completed ${longDate(g.completed_at)}` : (g.target_date ? `due ${longDate(g.target_date)}` : 'open');
    lookup[ref] = {
      render: () => `> **${clean(g.title)}**${g.description ? `\n>\n> ${squash(g.description, 800)}` : ''}\n>\n> *${[g.source === 'onboarding' ? 'set at the start' : `set ${longDate(g.created_at)}`, status, g.category && g.category !== 'GENERAL' ? g.category.toLowerCase() : null].filter(Boolean).join(' · ')}*`,
      source: { kind: 'goal', id: g.id, label: g.title },
    };
    return { ref, line: `${g.title}${g.description ? ` (${squash(g.description, 200)})` : ''} [${status}${g.source === 'onboarding' ? ', from onboarding' : ''}]` };
  });
  const intentionLines = m.intentions.slice(-120).map((c, i) => {
    const ref = `I${i + 1}`;
    lookup[ref] = {
      render: () => `> ${clean(c.intention)}\n>\n> *${longDate(c.check_in_date)}*`,
      source: { kind: 'checkin', id: c.check_in_date, label: 'intention' },
    };
    return { ref, line: `${c.check_in_date}: ${squash(c.intention, 200)}` };
  });
  const passages = await corpusCandidates(m.goals.slice(0, 4).map(g => `${g.title} ${g.description || ''}`), ctx.config.corpus_passages_per_chapter);
  passages.forEach((p, i) => { lookup[`P${i + 1}`] = { render: () => renderPassage(p), source: { kind: 'corpus', id: p.id, label: `${p.author}, ${p.work}` } }; });

  const prompt = `Chapter: what you set out to do. Arrange the member's goals and the daily intentions they committed to in the mornings. Group them by what they are really about, not by category label. Note plainly which goals were completed and which were not. Choose the intentions worth keeping: the ones that recur, the ones that show a turn, the ones that are simply well put. Do not include every intention; a dozen or so at most, and never more than the chapter can carry. Set corpus passages beside them only where they speak to the goal itself.

${candidateBlock('GOALS', goalLines)}

${intentionLines.length ? candidateBlock('DAILY INTENTIONS', intentionLines) : ''}

${passages.length ? candidateBlock('CORPUS PASSAGES', passages.map((p, i) => ({ ref: `P${i + 1}`, line: `${p.author}, ${p.work}: ${squash(p.content, CANDIDATE_CHARS)}` }))) : ''}

Respond with JSON of this shape:
${JSON_SHAPE}`;
  const { json } = await askEditor(ctx.config.model, prompt);
  const { body, used } = renderChapter({ json, lookup });
  return { key: 'goals', title: clean(json.title || 'What you set out to do'), body, sources: used };
}

async function chapterJournal(ctx) {
  const m = ctx.material;
  const pool = [...m.reflections];
  // Evening answers stored only on check_ins (older builds) join the pool.
  for (const c of m.eveningAnswers) {
    const text = c.stoic_answer || c.reflection_answer;
    if (!pool.some(e => e.content && e.content.trim() === text.trim())) {
      pool.push({ id: `checkin:${c.check_in_date}`, type: 'reflection', content: text, source: 'evening_reflection', raw_input: null, created_at: `${c.check_in_date}T20:00:00Z`, topic: null });
    }
  }
  pool.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  if (!pool.length) return null;

  const lookup = {};
  const lines = pool.map((e, i) => {
    const ref = `J${i + 1}`;
    lookup[ref] = { render: () => renderJournalEntry(e), source: { kind: 'journal', id: e.id, label: e.type } };
    const prompt = e.source === 'evening_reflection' && e.raw_input ? ` [asked: ${squash(e.raw_input, 120)}]` : '';
    return { ref, line: `${String(e.created_at).slice(0, 10)}${e.topic ? ` (${e.topic})` : ''}${prompt}: ${squash(e.content, CANDIDATE_CHARS)}` };
  });

  const themeQueries = [];
  if (m.model && Array.isArray(m.model.persistent_themes)) {
    for (const t of m.model.persistent_themes.slice(0, 4)) themeQueries.push(typeof t === 'string' ? t : (t.theme || t.name || ''));
  }
  if (!themeQueries.length) themeQueries.push(...pool.slice(-3).map(e => e.content));
  const passages = await corpusCandidates(themeQueries, ctx.config.corpus_passages_per_chapter + 2);
  passages.forEach((p, i) => { lookup[`P${i + 1}`] = { render: () => renderPassage(p), source: { kind: 'corpus', id: p.id, label: `${p.author}, ${p.work}` } }; });

  const target = Math.max(8, Math.min(40, Math.round(pool.length * 0.35)));
  const prompt = `Chapter: the journal. This is the heart of the book. From the entries below choose about ${target} that deserve the page: the ones that say something true, that show a turn in the member's thinking, that return to a theme, or that are simply well written. Arrange them under three to six headings that name what the member kept coming back to, in the member's own terms where possible, and order entries within a section by date. Write a sentence or two of connective prose per section, no more. Between entries, an optional one-line lead-in ("Three weeks later:") where the sequence needs it. Set a corpus passage beside a section where the ancients said the same thing better, chosen by id; at most one per section, and none where nothing fits.

Never quote or paraphrase an entry in your prose; select it by id and the book prints it whole.

${candidateBlock('JOURNAL ENTRIES', lines)}

${passages.length ? candidateBlock('CORPUS PASSAGES', passages.map((p, i) => ({ ref: `P${i + 1}`, line: `${p.author}, ${p.work}: ${squash(p.content, CANDIDATE_CHARS)}` }))) : ''}

Respond with JSON of this shape:
${JSON_SHAPE}`;
  const { json } = await askEditor(ctx.config.model, prompt);
  const { body, used } = renderChapter({ json, lookup });
  return { key: 'journal', title: clean(json.title || 'The journal'), body, sources: used };
}

async function chapterBeliefs(ctx) {
  const m = ctx.material;
  if (!m.beliefs.length) return null;
  const lookup = {};
  const lines = m.beliefs.map((e, i) => {
    const ref = `B${i + 1}`;
    lookup[ref] = { render: () => renderBelief(e), source: { kind: 'journal', id: e.id, label: 'belief' } };
    const before = squash(e.raw_input || e.content || '', 300);
    const after = squash(e.encoded_belief || e.refined_statement || '', 300);
    return { ref, line: `${String(e.created_at).slice(0, 10)}${e.topic ? ` (${e.topic})` : ''}: ${before}${after && after !== before ? ` → ${after}` : ''}` };
  });
  const passages = await corpusCandidates(m.beliefs.slice(-4).map(e => e.encoded_belief || e.content), ctx.config.corpus_passages_per_chapter + 1);
  passages.forEach((p, i) => { lookup[`P${i + 1}`] = { render: () => renderPassage(p), source: { kind: 'corpus', id: p.id, label: `${p.author}, ${p.work}` } }; });
  const prompt = `Chapter: beliefs, examined. The member brought beliefs to the Cabinet and worked them over until they could stand behind a refined statement. Each item below is one belief: what they first wrote, and what it became. Choose the ones worth keeping (most of them, unless there are very many), group them where they belong together, and write a short lead-in per group. Where a corpus passage speaks to the same belief, set it beside, by id.

${candidateBlock('BELIEFS', lines)}

${passages.length ? candidateBlock('CORPUS PASSAGES', passages.map((p, i) => ({ ref: `P${i + 1}`, line: `${p.author}, ${p.work}: ${squash(p.content, CANDIDATE_CHARS)}` }))) : ''}

Respond with JSON of this shape:
${JSON_SHAPE}`;
  const { json } = await askEditor(ctx.config.model, prompt);
  const { body, used } = renderChapter({ json, lookup });
  return { key: 'beliefs', title: clean(json.title || 'Beliefs, examined'), body, sources: used };
}

async function chapterCabinet(ctx) {
  const m = ctx.material;
  if (!m.cabinet.length) return null;
  const lookup = {};
  const lines = m.cabinet.map((x, i) => {
    const ref = `C${i + 1}`;
    lookup[ref] = { render: () => renderExchange(x), source: { kind: 'cabinet', id: x.id, label: x.answers.map(a => a.counselor).join(', ') } };
    const reply = x.answers.map(a => `${a.counselor}: ${squash(a.content, 500)}`).join(' | ');
    return { ref, line: `${String(x.date).slice(0, 10)}${x.shared ? ' [shared session]' : ''} YOU: ${squash(x.question, 500)} || ${reply}` };
  });
  const target = Math.max(5, Math.min(18, Math.round(m.cabinet.length * 0.15)));
  const prompt = `Chapter: in the Cabinet. From the exchanges below choose about ${target} where the member asked something real and a counselor answered it in a way worth rereading. Prefer exchanges that changed something, that were returned to, or that a counselor answered with unusual precision. Group them under a few headings by what was at issue. Write one or two sentences of lead-in per section and, where useful, a one-line note before an exchange saying what came before it. Do not quote the counselors in your prose; the exchanges print whole. No corpus passages in this chapter: the counselors are already speaking.

${candidateBlock('CABINET EXCHANGES', lines)}

Respond with JSON of this shape:
${JSON_SHAPE}`;
  const { json } = await askEditor(ctx.config.model, prompt);
  const { body, used } = renderChapter({ json, lookup });
  return { key: 'cabinet', title: clean(json.title || 'In the Cabinet'), body, sources: used };
}

async function chapterScrolls(ctx) {
  const m = ctx.material;
  if (!m.scrolls.length) return null;
  // Scrolls print whole and need no selection call when there are few. With
  // many, the editor picks the ones most read and most distinct.
  let chosen = m.scrolls;
  let intro = '';
  if (m.scrolls.length > 6) {
    const lines = m.scrolls.map((s, i) => ({ ref: `S${i + 1}`, line: `${s.counselorName}, "${s.title}"${s.goal_source ? ` (for: ${squash(s.goal_source, 100)})` : ''}, read ${s.read_count} times: ${squash(s.body, 400)}` }));
    const prompt = `Chapter: scrolls. The Cabinet wrote these scrolls for the member, each in one counselor's voice and each for one of the member's goals. Choose six to print whole: the most read, and among the rest the most distinct from one another. Write a short intro (a paragraph) for the chapter.

${candidateBlock('SCROLLS', lines)}

Respond with JSON: { "intro": "...", "items": ["S1", "S4"] }`;
    const { json } = await askEditor(ctx.config.model, prompt);
    intro = clean(json.intro || '');
    const picks = (Array.isArray(json.items) ? json.items : []).map(r => (typeof r === 'string' ? r : r && r.id));
    chosen = picks.map(ref => m.scrolls[parseInt(String(ref).replace(/^S/, ''), 10) - 1]).filter(Boolean);
    if (!chosen.length) chosen = [...m.scrolls].sort((a, b) => b.read_count - a.read_count).slice(0, 6);
  } else {
    intro = `The Cabinet wrote these for you, each in one counselor's voice and each for something you said you wanted. They are printed as they were written.`;
  }
  const body = [intro, '', ...chosen.map(s => renderScroll(s)).join('\n\n\n').split('\n')].join('\n').trim();
  return {
    key: 'scrolls',
    title: 'Scrolls',
    body,
    sources: chosen.map(s => ({ kind: 'scroll', id: s.id, label: s.title })),
  };
}

async function chapterHandbook(ctx) {
  const m = ctx.material;
  // The Enchiridion proper: numbered precepts in the member's own words.
  // Candidates are every short, self-standing sentence the member wrote:
  // refined beliefs, intentions, and journal sentences the editor may lift.
  const items = [];
  for (const e of m.beliefs) items.push({ kind: 'belief', id: e.id, text: e.encoded_belief || e.refined_statement || e.content, date: e.created_at });
  for (const c of m.intentions) items.push({ kind: 'intention', id: c.check_in_date, text: c.intention, date: c.check_in_date });
  for (const e of m.reflections) items.push({ kind: 'journal', id: e.id, text: e.content, date: e.created_at });
  for (const x of m.cabinet) items.push({ kind: 'cabinet', id: x.id, text: x.question, date: x.date });
  if (!items.length) return null;

  const lines = items.slice(-350).map((it, i) => ({ ref: `H${i + 1}`, line: `${it.kind} ${String(it.date).slice(0, 10)}: ${squash(it.text, 700)}` }));
  const lookup = {};
  items.slice(-350).forEach((it, i) => { lookup[`H${i + 1}`] = it; });

  const themeQueries = [];
  if (m.model && Array.isArray(m.model.persistent_themes)) {
    for (const t of m.model.persistent_themes.slice(0, 5)) themeQueries.push(typeof t === 'string' ? t : (t.theme || t.name || ''));
  }
  for (const e of m.beliefs.slice(-3)) themeQueries.push(e.encoded_belief || e.content);
  const passages = await corpusCandidates(themeQueries, 4);
  const passageLookup = {};
  passages.forEach((p, i) => { passageLookup[`P${i + 1}`] = p; });

  const prompt = `Chapter: the handbook. This is the Enchiridion proper: a numbered set of precepts, twelve to thirty of them, each a sentence or two the member can live by, drawn from what they actually wrote. A precept must be a verbatim sentence or short passage from one of the items below, quoted exactly; you may trim to a sentence but you may not rephrase. Under each precept, optionally, one corpus passage that says the same thing from the tradition, chosen by id. Order the precepts so they build: what to notice, what to do, what to let go, how to end the day. Give each a two-to-five word heading.

The precepts should read as the member's own handbook, not as a summary of their journal. Choose the sentences that are already precepts.

${candidateBlock('THE MEMBER\'S OWN SENTENCES', lines)}

${passages.length ? candidateBlock('CORPUS PASSAGES', passages.map((p, i) => ({ ref: `P${i + 1}`, line: `${p.author}, ${p.work}: ${squash(p.content, CANDIDATE_CHARS)}` }))) : ''}

Respond with JSON:
{
  "title": "...",
  "intro": "one short paragraph",
  "precepts": [
    { "heading": "...", "source": "H12", "quote": "the exact sentence(s) from that item", "passage": "P2 or null" }
  ],
  "closing": "optional"
}`;
  const { json } = await askEditor(ctx.config.model, prompt);
  const out = [];
  const used = [];
  if (json.intro) out.push(clean(json.intro), '');
  let n = 0;
  for (const p of Array.isArray(json.precepts) ? json.precepts : []) {
    const src = p && lookup[p.source];
    if (!src) continue;
    // Verify the quote is really in the source; fall back to the source's
    // first sentence when the model drifted.
    const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    let quote = clean(p.quote || '');
    if (!quote || !norm(src.text).includes(norm(quote).slice(0, Math.min(60, norm(quote).length)))) {
      quote = squash(src.text, 300);
    }
    n += 1;
    out.push(`## ${n}. ${clean(p.heading || '')}`.trim(), '', `> ${quote}`, '>', `> *${longDate(src.date)}*`, '');
    used.push({ kind: src.kind, id: src.id, label: 'precept' });
    const passage = p.passage && passageLookup[p.passage];
    if (passage) {
      out.push(renderPassage(passage), '');
      used.push({ kind: 'corpus', id: passage.id, label: `${passage.author}, ${passage.work}` });
    }
  }
  if (!n) return null;
  if (json.closing) out.push(clean(json.closing), '');
  return { key: 'handbook', title: clean(json.title || 'The handbook'), body: out.join('\n').trim(), sources: used };
}

function chapterSayings(ctx) {
  const m = ctx.material;
  if (!m.quotes.length) return null;
  const body = [
    'What you saved from your reading, as you saved it.',
    '',
    ...m.quotes.map(q => renderQuote(q)).join('\n\n\n').split('\n'),
  ].join('\n').trim();
  return { key: 'sayings', title: 'Sayings kept', body, sources: m.quotes.map(q => ({ kind: 'journal', id: q.id, label: 'quote' })) };
}

function chapterColophon(ctx, chapters) {
  const m = ctx.material;
  const cites = new Map();
  for (const ch of chapters) {
    for (const s of ch.sources || []) if (s.kind === 'corpus' && s.label) cites.set(s.label, (cites.get(s.label) || 0) + 1);
  }
  const lines = [
    `This Enchiridion was compiled by Arete on ${longDate(new Date().toISOString())} from ${m.name ? `${m.name}'s` : 'the member\'s'} own writing between ${monthYear(m.span.first)} and ${monthYear(m.span.last)}: ${m.reflections.length} journal entries, ${m.beliefs.length} examined beliefs, ${m.quotes.length} saved quotes, ${m.cabinet.length} Cabinet exchanges, ${m.goals.length} goals, ${m.intentions.length} daily intentions and ${m.scrolls.length} scrolls.`,
    '',
    'Every word attributed to the member is printed as it was written. The editorial prose between them is Arete\'s. The counselors\' replies are printed as they were given.',
  ];
  if (cites.size) {
    lines.push('', 'Passages from the tradition are quoted from public-domain translations:', '');
    for (const [label] of cites) lines.push(`- ${label}`);
  }
  return { key: 'colophon', title: 'Colophon', body: lines.join('\n'), sources: [] };
}

// --- Orchestration -----------------------------------------------------------

async function saveProgress(docId, patch) {
  const { error } = await supabase.from('enchiridion_documents').update(patch).eq('id', docId);
  if (error) console.error(`  failed to update document ${shortId(docId)}: ${error.message}`);
}

// Generate a manuscript for one member. Creates the enchiridion_documents row
// immediately (status 'generating') so callers can return its id and poll,
// then fills it chapter by chapter. Resolves to the finished row summary.
// `force` skips the minimum-material check (admin testing).
async function generateEnchiridion({ userId, triggeredBy = null, force = false, requestId = null, onCreated = null }) {
  if (!CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY is not set');
  const config = await getAgentConfig();
  const started = Date.now();

  const { data: doc, error: insErr } = await supabase
    .from('enchiridion_documents')
    .insert({ user_id: userId, status: 'generating', generated_by: triggeredBy, model_used: config.model })
    .select('id')
    .single();
  if (insErr) throw new Error(`Could not create document row: ${insErr.message}`);
  const docId = doc.id;
  if (typeof onCreated === 'function') {
    try { onCreated(docId); } catch { /* caller's problem */ }
  }
  console.log(`[enchiridion] ${shortId(docId)} for user ${shortId(userId)}: gathering`);

  if (requestId) {
    await supabase.from('enchiridion_requests').update({ document_id: docId, status: 'generating' }).eq('id', requestId);
  }

  try {
    const material = await gatherMaterial(userId, config);
    const sourceCounts = {
      journal: material.reflections.length,
      beliefs: material.beliefs.length,
      quotes: material.quotes.length,
      cabinet: material.cabinet.length,
      goals: material.goals.length,
      scrolls: material.scrolls.length,
      intentions: material.intentions.length,
      corpus: 0,
    };
    await saveProgress(docId, { source_counts: sourceCounts });

    const writing = material.reflections.length + material.beliefs.length + material.cabinet.length;
    if (!force && writing < config.min_journal_entries) {
      const msg = `Not enough writing yet: ${writing} entries and exchanges, ${config.min_journal_entries} needed`;
      await saveProgress(docId, { status: 'failed', error: msg });
      if (requestId) await supabase.from('enchiridion_requests').update({ status: 'requested' }).eq('id', requestId);
      return { id: docId, status: 'failed', error: msg };
    }

    const ctx = { material, config, title: null, subtitle: null, modelUsed: config.model };
    const chapters = [];
    const builders = [
      chapterPreface,
      chapterPortrait,
      chapterGoals,
      chapterJournal,
      chapterBeliefs,
      chapterCabinet,
      chapterHandbook,
      chapterScrolls,
      chapterSayings,
    ];
    for (const build of builders) {
      const label = build.name.replace(/^chapter/, '');
      try {
        const ch = await build(ctx);
        if (ch && ch.body) {
          chapters.push(ch);
          console.log(`[enchiridion] ${shortId(docId)}: ${label} (${wordCount(ch.body)} words)`);
        } else {
          console.log(`[enchiridion] ${shortId(docId)}: ${label} skipped (nothing to draw on)`);
        }
      } catch (err) {
        // One failed chapter should not sink the book; record and continue.
        console.error(`[enchiridion] ${shortId(docId)}: ${label} failed: ${err.message}`);
        chapters.push({ key: label.toLowerCase(), title: label, body: '', sources: [], error: err.message });
      }
      await saveProgress(docId, {
        title: ctx.title || 'Enchiridion',
        subtitle: ctx.subtitle,
        chapters: chapters.filter(c => c.body),
        model_used: ctx.modelUsed,
      });
    }
    chapters.push(chapterColophon(ctx, chapters));

    const good = chapters.filter(c => c.body);
    const failed = chapters.filter(c => c.error);
    const citations = [];
    const seen = new Set();
    for (const ch of good) {
      for (const s of ch.sources || []) {
        if (s.kind === 'corpus' && !seen.has(s.id)) { seen.add(s.id); citations.push({ chunk_id: s.id, label: s.label }); }
      }
    }
    sourceCounts.corpus = citations.length;
    const words = good.reduce((n, c) => n + wordCount(c.body), 0);
    const status = good.length >= 2 ? 'ready' : 'failed';
    await saveProgress(docId, {
      status,
      title: ctx.title || 'Enchiridion',
      subtitle: ctx.subtitle,
      chapters: good,
      source_counts: sourceCounts,
      corpus_citations: citations,
      word_count: words,
      model_used: ctx.modelUsed,
      error: failed.length ? `Chapters failed: ${failed.map(c => `${c.title}: ${c.error}`).join('; ')}` : null,
      generated_at: new Date().toISOString(),
    });
    if (requestId) {
      await supabase.from('enchiridion_requests').update({ status: status === 'ready' ? 'proofing' : 'requested' }).eq('id', requestId);
    }
    console.log(`[enchiridion] ${shortId(docId)}: ${status}, ${good.length} chapters, ${words} words, ${Math.round((Date.now() - started) / 1000)}s`);
    return { id: docId, status, chapters: good.length, words, failedChapters: failed.length };
  } catch (err) {
    console.error(`[enchiridion] ${shortId(docId)} failed: ${err.message}`);
    await saveProgress(docId, { status: 'failed', error: err.message });
    if (requestId) await supabase.from('enchiridion_requests').update({ status: 'requested' }).eq('id', requestId);
    return { id: docId, status: 'failed', error: err.message };
  }
}

// The offer the app shows: price per format plus whether this member has
// enough material for a book yet. Counts are cheap head queries.
async function getOffer(userId) {
  const config = await getAgentConfig();
  const [{ count: journal }, { count: cabinet }] = await Promise.all([
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('cabinet_conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  const written = (journal || 0) + (cabinet || 0);
  return {
    enabled: config.enabled !== false,
    currency: config.currency || 'usd',
    price_cents: config.price_cents,
    formats: config.formats,
    min_entries: config.min_journal_entries,
    written,
    eligible: written >= config.min_journal_entries,
  };
}

// Flatten the chapters to one markdown document (admin download, later the
// print pipeline).
function documentToMarkdown(doc) {
  const out = [`# ${doc.title || 'Enchiridion'}`];
  if (doc.subtitle) out.push('', `*${doc.subtitle}*`);
  for (const ch of doc.chapters || []) {
    out.push('', '', `# ${ch.title}`, '', ch.body);
  }
  return out.join('\n');
}

module.exports = {
  generateEnchiridion,
  // Pure helpers, exported for tests.
  _internal: { renderChapter, renderJournalEntry, renderBelief, renderExchange, renderPassage, renderQuote, renderScroll, parseJson, looksLikeCounselorTranscript },
  getAgentConfig,
  getOffer,
  documentToMarkdown,
  DEFAULTS,
};
