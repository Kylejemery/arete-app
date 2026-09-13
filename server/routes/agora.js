// ---------------------------------------------------------------------------
// The Agora — counselor answers.
//
// An editor invites a counselor to answer a reader's essay. The pipeline:
//
//   1. gate      the essay goes through the stoic safety gate (Haiku, hard
//                boolean, fails closed). Grief, crisis, abuse: no counselor
//                answers, the editor is told why and may override, having
//                read the essay themself.
//   2. voice     the counselor's persona: the canonical Cabinet prompt when
//                one exists, else a profile built from the counselors row.
//   3. ground    passages from rag_corpus on the counselor fence. A counselor
//                with corpus coverage is grounded in their own works; one
//                without (Goggins, Roosevelt, ...) hears the tradition and
//                is told those words are not their own.
//   4. write     one call, in the counselor's voice, to the author.
//   5. store     the answer, its sources, the model and the time go onto
//                the essay with the service role. The row's guard trigger
//                keeps readers from touching those columns.
//
// index.js owns the shared helpers (auth, admin check, retrieval, the model
// call); it hands them in through init() so this file stays out of the
// monolith. Nothing here posts anywhere but the essay row.
// ---------------------------------------------------------------------------
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { safetyGate } = require('../agents/stoic-triage');
const libraryHelpers = require('../library');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const router = express.Router();

// Adaptive thinking is on by default on this model, so max_tokens covers
// the thinking and the answer together. The prompt holds the answer short.
const ANSWER_MODEL = process.env.AGORA_ANSWER_MODEL || 'claude-opus-5';
const ANSWER_MAX_TOKENS = 4000;
const ESSAY_CHARS_FOR_RETRIEVAL = 1400;
const PASSAGES_TO_FETCH = 10;
const PASSAGES_TO_USE = 5;
const PASSAGE_CHARS = 900;

// counselors.slug -> rag_corpus.author for the counselors the corpus holds.
// Every entry must have real coverage (checked against rag_corpus on
// 2026-09-13); a counselor missing here answers from the tradition, not
// from their own works, and the prompt says so. Socrates grounds in
// Xenophon, as the library debate does.
const CORPUS_AUTHOR_BY_SLUG = {
  'marcus-aurelius': 'Marcus Aurelius',
  'epictetus': 'Epictetus',
  'seneca': 'Seneca',
  'socrates': 'Xenophon',
  'montaigne': 'Michel de Montaigne',
};

let deps = null;

/**
 * Wire the helpers index.js owns. Called once, before listen.
 * @param {object} d
 * @param {(req) => Promise<string|null>} d.getAuthenticatedUserId
 * @param {(userId: string) => Promise<boolean>} d.isAdmin
 * @param {(query: string, topK?: number, author?: string|null) => Promise<any[]>} d.getStoicContext
 * @param {(args: {model, system, messages, maxTokens}) => Promise<string>} d.callCounselorModel
 * @param {Array<{id: string, name: string, systemPrompt: string}>} d.cabinetCounselors
 * @param {Record<string, string>} d.slugToCounselorId
 * @param {string|undefined} d.claudeApiKey
 */
function init(d) {
  deps = d;
}

function requireDeps(res) {
  if (!deps) {
    res.status(500).json({ error: 'not_ready', message: 'The Agora pipeline is not wired up.' });
    return false;
  }
  if (!deps.claudeApiKey || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'not_configured', message: 'Server not configured for counselor answers.' });
    return false;
  }
  return true;
}

async function requireEditor(req, res) {
  const userId = await deps.getAuthenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: 'sign_in', message: 'Sign in first.' }); return null; }
  if (!(await deps.isAdmin(userId))) { res.status(403).json({ error: 'forbidden', message: 'The editor invites counselors.' }); return null; }
  return userId;
}

// --- Voice -------------------------------------------------------------------

function quotesBlock(quotes) {
  if (!Array.isArray(quotes) || quotes.length === 0) return '';
  return `\n\nThings you have said, in your own words:\n${quotes.slice(0, 8).map(q => `- "${String(q).trim()}"`).join('\n')}`;
}

/**
 * The counselor's persona. Prefers the canonical Cabinet prompt (the same
 * voice the parallel cabinet speaks in); otherwise builds one from the
 * counselors row, the way the clients do for single-counselor chat.
 */
function buildPersona(counselor) {
  const id = deps.slugToCounselorId[counselor.slug];
  const canonical = id && deps.cabinetCounselors.find(c => c.id === id);
  if (canonical && canonical.systemPrompt) return canonical.systemPrompt.trim();
  const dates = counselor.dates ? ` (${counselor.dates})` : '';
  return `You are ${counselor.name}${dates}. Speak in first person, as yourself, drawing on your own life and work.

${counselor.bio || counselor.description || ''}

Your philosophy: ${counselor.philosophy || '(not recorded)'}

How you speak: ${counselor.communication_style || '(not recorded)'}

How hard you push: ${counselor.challenge_level || 'firm'}.${quotesBlock(counselor.quotes)}`;
}

// --- Grounding ---------------------------------------------------------------

function formatPassages(chunks) {
  return chunks
    .map((c, i) => `[${i + 1}] ${c.author}, ${libraryHelpers.workTitle(c.work)}\n${String(c.chunk_text || '').slice(0, PASSAGE_CHARS)}`)
    .join('\n\n');
}

/**
 * Passages for the answer. A grounded counselor is searched by author
 * first and topped up from the wider shelves if their own works say
 * little on the subject; an ungrounded one hears the shelves alone.
 */
async function retrievePassages(essay, corpusAuthor) {
  const focus = `${essay.title}\n\n${essay.body}`.replace(/\s+/g, ' ').trim().slice(0, ESSAY_CHARS_FOR_RETRIEVAL);
  let own = [];
  if (corpusAuthor) {
    own = await deps.getStoicContext(focus, PASSAGES_TO_FETCH, corpusAuthor).catch(() => []);
  }
  let wider = [];
  if (own.length < PASSAGES_TO_USE) {
    wider = await deps.getStoicContext(focus, PASSAGES_TO_FETCH, null).catch(() => []);
    wider = wider.filter(c => !own.some(o => o.id === c.id) && (!corpusAuthor || c.author !== corpusAuthor));
  }
  return { own: own.slice(0, PASSAGES_TO_USE), wider: wider.slice(0, Math.max(0, PASSAGES_TO_USE - own.length)) };
}

// --- Writing -----------------------------------------------------------------

function buildTask(counselor, essay, passages, grounded) {
  const ownBlock = passages.own.length
    ? `Passages from your own works, retrieved for this essay:\n${formatPassages(passages.own)}`
    : '';
  const widerBlock = passages.wider.length
    ? `Passages from elsewhere in the Library of Arete:\n${formatPassages(passages.wider)}`
    : '';
  const groundingRule = grounded
    ? 'Quote or paraphrase only what the passages support. When you lean on one, name the work in the prose (for example: as I wrote in the Letters). Do not invent citations.'
    : 'The passages are the tradition speaking, not you. You may set the author beside them, naming author and work in the prose, but do not claim their words as your own and do not invent quotations of your own.';
  return `You have been invited by the editor of the Agora, a place where readers publish essays and argue with one another, to answer an essay. Reader and author are the same person: ${essay.author_name}. Address them directly, in second person, by name once at most.

Write 120 to 220 words. Engage the specific argument of the essay, not the topic in general: say where the author has it right, and where you would press them, and press them. You are blunt, not cruel. Do not summarize the essay back to the author. Do not praise the writing. Do not sign off, and do not address the editor.

${groundingRule}

Do not use em dashes or en dashes anywhere; use commas, colons, or full stops instead. No headings, no lists, no markdown, no emoji: plain prose only, in your own voice.

THE ESSAY

Title: ${essay.title}
By: ${essay.author_name}${essay.tags && essay.tags.length ? `\nTopics: ${essay.tags.join(', ')}` : ''}

${essay.body}

${ownBlock}${ownBlock && widerBlock ? '\n\n' : ''}${widerBlock}${!ownBlock && !widerBlock ? '(The shelves offered no close passage. Answer from your own life and thought, and say nothing you could not have said.)' : ''}`;
}

function tidy(text) {
  return String(text || '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/^#+\s*/gm, '')
    .trim();
}

async function loadEssay(id) {
  const { data, error } = await supabase.from('agora_essays').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function loadCounselor(slug) {
  const { data, error } = await supabase.from('counselors').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

// --- Routes ------------------------------------------------------------------

/**
 * GET /api/agora/counselors — the roster the editor can invite, with
 * whether each is grounded in their own corpus texts.
 */
router.get('/api/agora/counselors', async (req, res) => {
  try {
    if (!requireDeps(res)) return;
    if (!(await requireEditor(req, res))) return;
    const { data, error } = await supabase
      .from('counselors')
      .select('slug, name, category, description')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return res.json({
      counselors: (data || []).map(c => ({
        slug: c.slug,
        name: c.name,
        category: c.category,
        description: c.description,
        grounded: Boolean(CORPUS_AUTHOR_BY_SLUG[c.slug]),
      })),
    });
  } catch (err) {
    console.error('[Agora] counselors error:', err);
    return res.status(500).json({ error: 'failed', message: 'Could not load the roster.' });
  }
});

/**
 * POST /api/agora/essays/:id/answer
 * Body: { counselor: slug, force?: boolean, override?: boolean }
 *   force     regenerate even though an answer exists
 *   override  proceed past a safety-gate exit (the editor has read the essay)
 * Returns { essay } with the answer written, { essay, existing: true } when
 * one was already there, or 422 { error: 'declined', reason } from the gate.
 */
router.post('/api/agora/essays/:id/answer', async (req, res) => {
  const startedAt = Date.now();
  try {
    if (!requireDeps(res)) return;
    const editorId = await requireEditor(req, res);
    if (!editorId) return;

    const slug = String(req.body?.counselor || '').trim();
    const force = req.body?.force === true;
    const override = req.body?.override === true;
    if (!slug) return res.status(400).json({ error: 'bad_request', message: 'Name a counselor.' });

    const essay = await loadEssay(req.params.id);
    if (!essay) return res.status(404).json({ error: 'not_found', message: 'This essay is not in the Agora.' });
    if (!['published', 'in_review'].includes(essay.status)) {
      return res.status(409).json({ error: 'not_answerable', message: 'A counselor answers essays that are published or in review.' });
    }
    if (essay.counselor_answer && essay.counselor_slug === slug && !force) {
      return res.json({ essay, existing: true });
    }

    const counselor = await loadCounselor(slug);
    if (!counselor) return res.status(404).json({ error: 'unknown_counselor', message: 'No counselor by that name.' });

    // 1. gate
    if (!override) {
      const gate = await safetyGate({ platform: 'the Agora', body: `${essay.title}\n\n${essay.body}` });
      if (!gate.pass) {
        console.log(`[Agora] gate declined essay ${essay.id}: ${gate.reason}`);
        return res.status(422).json({ error: 'declined', reason: gate.reason, message: `The safety gate declined this essay: ${gate.reason}` });
      }
    }

    // 2. voice, 3. ground
    const corpusAuthor = CORPUS_AUTHOR_BY_SLUG[slug] || null;
    const persona = buildPersona(counselor);
    const passages = await retrievePassages(essay, corpusAuthor);
    const grounded = passages.own.length > 0;

    // 4. write
    const text = await deps.callCounselorModel({
      model: ANSWER_MODEL,
      system: persona,
      messages: [{ role: 'user', content: buildTask(counselor, essay, passages, grounded) }],
      maxTokens: ANSWER_MAX_TOKENS,
    });
    const answer = tidy(text);
    if (!answer) {
      return res.status(502).json({ error: 'silent', message: `${counselor.name} had nothing to say. Try again.` });
    }

    // 5. store
    const sources = [...passages.own, ...passages.wider].map(c => ({
      author: c.author, work: c.work, title: libraryHelpers.workTitle(c.work),
    }));
    const { data: updated, error: updErr } = await supabase
      .from('agora_essays')
      .update({
        counselor_slug: slug,
        counselor_name: counselor.name,
        counselor_answer: answer,
        counselor_sources: sources,
        counselor_model: ANSWER_MODEL,
        counselor_answered_at: new Date().toISOString(),
      })
      .eq('id', essay.id)
      .select()
      .single();
    if (updErr) throw updErr;

    console.log(`[Agora] ${counselor.name} answered essay ${essay.id} in ${Date.now() - startedAt}ms (${sources.length} sources, grounded=${grounded}, by ${editorId})`);
    return res.json({ essay: updated });
  } catch (err) {
    console.error('[Agora] answer error:', err);
    return res.status(502).json({ error: 'failed', message: 'The counselor could not be reached. Try again.' });
  }
});

/**
 * DELETE /api/agora/essays/:id/answer — take the answer off the essay.
 */
router.delete('/api/agora/essays/:id/answer', async (req, res) => {
  try {
    if (!requireDeps(res)) return;
    if (!(await requireEditor(req, res))) return;
    const { data: updated, error } = await supabase
      .from('agora_essays')
      .update({
        counselor_slug: null, counselor_name: null, counselor_answer: null,
        counselor_sources: null, counselor_model: null, counselor_answered_at: null,
      })
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!updated) return res.status(404).json({ error: 'not_found', message: 'This essay is not in the Agora.' });
    return res.json({ essay: updated });
  } catch (err) {
    console.error('[Agora] remove answer error:', err);
    return res.status(500).json({ error: 'failed', message: 'Could not remove the answer.' });
  }
});

module.exports = { router, init, CORPUS_AUTHOR_BY_SLUG };
