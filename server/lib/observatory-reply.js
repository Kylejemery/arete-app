// server/lib/observatory-reply.js
//
// The corpus answers a reader's comment on an Observatory piece. The reply is
// grounded three ways: the piece the reader is answering, the reader's own
// words, and passages retrieved from the shelves (counselor-fenced, through
// getStoicContext). It names the authors it draws on, and it is stored and
// shown as the corpus's own writing, never as a source text.
//
// Pure helpers here so the prompt is testable; the endpoint is in index.js
// (POST /api/observatory/reply).

const { promptReferences, refersToPrompt } = require('../synthesis/checks');

const CORPUS_HANDLE = 'The Corpus';
// Corpus replies a reader can prompt per day. Each costs one Sonnet call.
const DAILY_LIMIT = Math.max(0, parseInt(process.env.OBS_REPLY_DAILY_LIMIT || '5', 10) || 0);

const KIND_NOUN = {
  tension: 'an open tension (a contradiction between thinkers the corpus holds open rather than resolves)',
  inquiry: 'an open inquiry (a question the corpus cannot yet answer, with its own attempt at one)',
  dream: 'a dream (conjecture the corpus wrote in its own voice, seeded by the tradition)',
  convergence: 'a convergence (a conclusion the corpus assembled from far-apart passages)',
  world: 'a world response (the corpus reading this week\'s news through a Stoic lens)',
  essay: 'a Stoic Life essay (a piece the corpus wrote from the Stoics\' own texts on how to live, reviewed by the editor)',
};

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// What the piece says, in the shape loadObservatoryPiece returns it.
function pieceText(kind, p) {
  if (!p) return { title: '', text: '' };
  const parts = [];
  let title = '';
  switch (kind) {
    case 'tension':
      title = p.title;
      parts.push(p.statement);
      for (const pos of p.positions || []) if (pos) parts.push(`${pos.author || 'A position'}: ${pos.summary || ''}`);
      parts.push(p.livedStakes);
      break;
    case 'inquiry':
      title = p.question;
      parts.push(p.pursuit, p.whereCorpusRunsOut);
      break;
    case 'dream':
      title = p.title || 'A thought from the corpus';
      parts.push(p.content);
      break;
    case 'convergence':
      title = p.title;
      parts.push(p.conclusion, p.pursuit, p.breakpoint);
      break;
    case 'world':
      title = p.dominantSignal;
      parts.push(p.response, p.tension);
      break;
    case 'essay':
      title = p.title;
      parts.push(p.body);
      break;
    default:
      break;
  }
  return {
    title: clip(title, 300),
    text: clip(parts.filter(x => typeof x === 'string' && x.trim()).join('\n\n'), 3500),
  };
}

// The text retrieval runs on: the reader's comment, anchored by the piece's
// title so a short comment still finds the right shelves.
function retrievalQuery(kind, piece, commentBody) {
  const { title } = pieceText(kind, piece);
  return clip(`${commentBody}\n\n${title}`, 1500);
}

function buildReplyPrompt({ kind, piece, commentBody, handle, passages }) {
  const { title, text } = pieceText(kind, piece);
  const ctx = (passages || [])
    .map((c, i) => `[${i + 1}] ${c.author}, ${c.title || c.work}\n${clip(c.chunk_text, 900)}`)
    .join('\n\n');

  const system = `You are the Corpus of the Library of Arete: the whole tradition speaking as one reader who has the shelves by heart. You wrote the Observatory piece below, and a reader has answered it in the comments. Reply to them.

Write 80 to 160 words, addressed to the reader directly. Take their actual point seriously: grant what is right in it, and press where it goes wrong or goes too fast. Bring in one or two voices from the passages below, naming the author and work in the prose (for example: Epictetus, in the Discourses, would say...). Stay grounded in those passages and in the piece; do not invent quotations or citations. The reader never sees the passages, so never refer to them or to how you received them: no "the passages provided", "the texts above", "passage 2" or bracketed numbers. Speak of the authors and their works instead. If the reader has found a real weakness in the piece, say so plainly. If there is a tension, name it and leave it standing rather than resolving it. End with a question back to the reader only if it genuinely moves the conversation.

You speak in the corpus's own voice, never as a historical thinker. Do not use em dashes or en dashes; use commas, colons, or full stops. No headings, no lists, no markdown: plain prose only.

The piece, ${KIND_NOUN[kind] || 'an Observatory piece'}:
Title: ${title}
"""${text}"""

Passages from the shelves:
${ctx || '(none retrieved; answer from the piece alone and say that the shelves offered no close companion)'}`;

  const user = `${handle ? `${handle} wrote` : 'A reader wrote'}:\n"""${clip(commentBody, 2000)}"""`;
  return { system, user };
}

// The model's reply as plain prose, dashes and markdown stripped, or '' if
// nothing usable came back.
// The rewrite asked for when a reply talks about its passages anyway.
const REWRITE_NOTE = 'Rewrite your reply so it never mentions the passages, sources or texts you were given, or their numbers. Name the authors and works instead. Keep everything else. Return only the reply.';

// The reply with any sentence that refers to the passages dropped: the last
// resort after one rewrite, so a reader never sees the machinery.
function dropPromptReferences(body) {
  return (String(body || '').match(/[^\n.!?]+[.!?]*\s*/g) || [])
    .filter(seg => !refersToPrompt(seg))
    .join('')
    .trim();
}

function cleanReply(raw) {
  return String(raw || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+,/g, ',')
    .trim()
    .slice(0, 3000);
}

module.exports = {
  CORPUS_HANDLE,
  DAILY_LIMIT,
  pieceText,
  retrievalQuery,
  buildReplyPrompt,
  cleanReply,
  REWRITE_NOTE,
  dropPromptReferences,
  promptReferences,
};
