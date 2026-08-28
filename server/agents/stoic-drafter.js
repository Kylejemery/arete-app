// server/agents/stoic-drafter.js
//
// Stoic Reply Pipeline, stage 3: Drafter (Opus — volume here is low, quality
// is worth the cost). Writes a reply a thoughtful stranger would be glad to
// receive, grounded in a retrieved corpus passage. Every draft lands in
// reply_drafts as 'pending'; nothing leaves without human approval.
//
// Retrieval note: rag_corpus has no doctrine tags, so instead of filtering
// pgvector by doctrine we embed a canonical doctrine phrasing alongside the
// post body and pass the top 3 passages to the drafter to choose or discard.
// Grounding in a specific passage is what separates this from generic advice.
//
// {"draft": null, "reason": "..."} is an acceptable and expected outcome — the
// candidate is marked 'declined' and never retried.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { loadConfig } = require('./stoic-scout');

const DRAFT_MODEL = process.env.STOIC_DRAFT_MODEL || 'claude-opus-5';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const PASSAGE_COUNT = 3;

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Canonical phrasings per doctrine tag — steers the embedding toward the
// right corner of the corpus in place of a metadata filter.
const DOCTRINE_QUERIES = {
  dichotomy_of_control: 'what is in our control and what is not; opinion, desire, and action are ours, externals are not',
  judgment_not_events: 'it is not events that disturb us but our judgments about events',
  premeditatio: 'rehearsing future adversity in advance so it cannot arrive as a stranger',
  memento_mori: 'remembering death and the shortness of life to see what matters now',
  anger: 'anger as a temporary madness; the cost of rage exceeds the injury',
  envy: 'envy and comparison with others; wanting what another has',
  reputation: 'indifference to fame, status, and the opinions of others',
  duty: 'doing what the role and relation require; acting for the common good',
  none: 'stoic counsel for everyday difficulty',
};

async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });
  const data = await res.json();
  if (!data.data?.[0]?.embedding) {
    throw new Error('embedding failed: ' + JSON.stringify(data.error ?? data));
  }
  return data.data[0].embedding;
}

// Rewrite the post as one clean sentence of philosophical need before
// embedding. Raw post bodies (slang, ellipses, all-caps) crater pgvector
// similarity (~0.45 → ~0.15 measured) and drag retrieval to junk passages;
// a distilled sentence in classical vocabulary finds the right corner of
// the corpus. One cheap Haiku call per draft, capped at 8 drafts per run.
const DISTILL_MODEL = process.env.STOIC_DISTILL_MODEL || 'claude-haiku-4-5';

async function distillNeed(candidate) {
  try {
    const raw = await callClaude(
      DISTILL_MODEL,
      'Rewrite the post as ONE plain sentence stating the underlying philosophical difficulty, in the vocabulary of classical philosophy (control, judgment, opinion of others, fortune, grief, desire). No names, no slang, no quotation. Return the sentence only.',
      `POST:\n\n${candidate.body.slice(0, 1500)}`,
      150
    );
    const sentence = raw.replace(/^["']|["']$/g, '').trim();
    return sentence.length >= 15 && sentence.length <= 400 ? sentence : null;
  } catch (err) {
    console.error('[stoic-drafter] distill failed, falling back to doctrine hint:', err.message);
    return null;
  }
}

async function retrievePassages(supabase, candidate) {
  const doctrineHint = DOCTRINE_QUERIES[candidate.doctrine] || DOCTRINE_QUERIES.none;
  const distilled = await distillNeed(candidate);
  const query = distilled ? `${doctrineHint}\n${distilled}` : doctrineHint;
  const embedding = await embed(query);
  // Over-fetch, then keep only Stoic authors: the RPC has no author filter,
  // and the corpus holds non-Stoics (Adam Smith, Montaigne, Plutarch...) who
  // must not end up quoted in a reply.
  const { data, error } = await supabase.rpc('match_rag_corpus_cited', {
    query_embedding: embedding,
    match_count: PASSAGE_COUNT * 8,
  });
  if (error) throw new Error(`match_rag_corpus_cited: ${error.message}`);
  const allowed = new Set(loadConfig().drafting.stoic_authors);
  return (data || []).filter(p => allowed.has(p.author)).slice(0, PASSAGE_COUNT).map(p => ({
    author: p.author,
    work: p.work,
    section: p.section_label,
    translator: p.translator,
    text: p.chunk_text,
    similarity: p.similarity,
  }));
}

// The draft rules from the source spec, verbatim.
const DRAFT_SYSTEM = `You draft replies to public posts written by strangers going through an everyday difficulty. Each draft will be reviewed, possibly edited, and manually posted by a human who takes full ownership of every word. Write a reply that a thoughtful stranger would be glad to receive.

Rules:
- Under 120 words. Longer reads as a lecture.
- Lead with the person's actual situation, not with philosophy. If the first sentence could be pasted under any post, rewrite it.
- One idea. Not three.
- Name the source if you quote it, briefly. "Epictetus has a line about this" is enough. No citation formatting.
- Never open with "As a Stoic" or "Stoicism teaches." Never use the word "reframe."
- No em dashes or en dashes anywhere in the output.
- Do not console. Do not diagnose. Do not tell them what they feel.
- Do not mention Arete, Substack, or link anything.
- If the message states a platform character limit, the reply MUST fit within it, counting every character and space. That limit overrides the 120-word rule.
- Ground the reply in the Stoic passages provided. Do not bring in non-Stoic thinkers.
- If the honest answer is that Stoicism has nothing useful to say here, return {"draft": null, "reason": "..."}. This is an acceptable and expected outcome.

You will be given the post, the doctrine the triage stage tagged it with, and up to three corpus passages. Choose at most one passage to ground the reply, or discard them all and decline.

Return JSON only, no preamble:
{"draft": "the reply text" | null, "passage_used": "author + work of the passage you grounded in, or null", "reason": "only when draft is null"}`;

function parseJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Belt and suspenders for the no-dash rule.
function stripDashes(text) {
  return text
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ');
}

async function callClaude(model, system, userMessage, maxTokens = 1500) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const block = (json.content || []).find(b => b.type === 'text');
  return block ? block.text.trim() : '';
}

async function draftOne(supabase, candidate) {
  const passages = await retrievePassages(supabase, candidate);

  const passagesText = passages.length
    ? passages.map((p, i) =>
        `PASSAGE ${i + 1} — ${p.author}, ${[p.work, p.section].filter(Boolean).join(' ')}${p.translator ? `, trans. ${p.translator}` : ''}:\n${p.text}`
      ).join('\n\n')
    : '(no corpus passages matched — decline unless you can ground the reply honestly without one)';

  const charLimit = loadConfig().drafting.platform_char_limits[candidate.platform] ?? null;
  const limitLine = charLimit
    ? `PLATFORM CHARACTER LIMIT: ${charLimit} characters including spaces (${candidate.platform} hard limit). Aim under ${charLimit - 20}.\n\n`
    : '';
  const userMessage =
    `POST (from ${candidate.platform}):\n\n${candidate.body}\n\n` +
    (candidate.parent_context ? `IN REPLY TO:\n\n${candidate.parent_context}\n\n` : '') +
    `TRIAGE DOCTRINE TAG: ${candidate.doctrine}\n\n${limitLine}${passagesText}`;

  const raw = await callClaude(DRAFT_MODEL, DRAFT_SYSTEM, userMessage);
  let parsed = parseJson(raw);
  if (!parsed) throw new Error(`unparseable drafter response: ${raw.slice(0, 160)}`);

  // One compress retry when the platform has a hard character cap; a draft
  // that cannot honestly fit gets declined rather than truncated.
  if (parsed.draft && charLimit && stripDashes(String(parsed.draft)).trim().length > charLimit) {
    const over = stripDashes(String(parsed.draft)).trim().length;
    const retry = await callClaude(
      DRAFT_MODEL,
      DRAFT_SYSTEM,
      `${userMessage}\n\nYour previous draft was ${over} characters, over the ${charLimit}-character hard limit:\n\n${parsed.draft}\n\nRewrite it to fit: same single idea, same grounding, under ${charLimit - 20} characters. If it cannot survive that compression honestly, return {"draft": null, "reason": "..."}.`
    );
    parsed = parseJson(retry);
    if (!parsed) throw new Error(`unparseable drafter retry: ${retry.slice(0, 160)}`);
    if (parsed.draft && stripDashes(String(parsed.draft)).trim().length > charLimit) {
      parsed = { draft: null, reason: `could not fit the reply under ${charLimit} characters without gutting it` };
    }
  }

  if (!parsed.draft) {
    await supabase.from('reply_candidates').update({
      status: 'declined',
      exit_reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 500) : 'drafter declined',
    }).eq('id', candidate.id);
    return { declined: true };
  }

  const draftText = stripDashes(String(parsed.draft)).trim();
  const { error: insertError } = await supabase.from('reply_drafts').insert({
    candidate_id: candidate.id,
    draft_text: draftText,
    doctrine: candidate.doctrine,
    passages,
    passage_used: typeof parsed.passage_used === 'string' ? parsed.passage_used.slice(0, 300) : null,
    model: DRAFT_MODEL,
    status: 'pending',
  });
  if (insertError) throw new Error(`reply_drafts insert: ${insertError.message}`);

  await supabase.from('reply_candidates').update({ status: 'drafted' }).eq('id', candidate.id);
  return { declined: false };
}

async function runStoicDrafter(limit = 8) {
  const supabase = getSupabase();
  const summary = { drafted: 0, declined: 0, errors: [] };

  const { data: rows, error } = await supabase
    .from('reply_candidates')
    .select('id, platform, body, parent_context, doctrine')
    .eq('status', 'promoted')
    .order('triaged_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`reply_candidates select: ${error.message}`);

  for (const candidate of rows || []) {
    try {
      const result = await draftOne(supabase, candidate);
      if (result.declined) summary.declined++;
      else summary.drafted++;
    } catch (err) {
      console.error(`[stoic-drafter] candidate ${candidate.id} failed:`, err.message);
      summary.errors.push(`${candidate.id}: ${err.message}`);
    }
  }

  console.log(`[stoic-drafter] drafted ${summary.drafted}, declined ${summary.declined}`);
  return summary;
}

module.exports = { runStoicDrafter };
