// server/lib/observatory-journal.js
//
// The Observatory as a journal: every published piece, across the five kinds,
// as one reverse-chronological list of posts (title, standfirst, date, reading
// time, voices). The visibility rules are the feeds' own: approved and
// observatory_visible, except convergences, whose review status is the gate
// (server/index.js, /api/observatory/convergences). The SQL function
// observatory_piece_is_public mirrors these rules for comments; change both
// together.
//
// Pure helpers here, so the shaping is testable without a database.

const KINDS = Object.freeze(['tension', 'inquiry', 'dream', 'convergence', 'world']);

// Reading speed for the "N min read" line. Philosophy reads slower than news.
const WORDS_PER_MINUTE = 200;

function firstSentence(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.split(/(?<=[.!?])\s+/)[0] || t;
}

// Standfirsts are plain text: the agents write light Markdown emphasis
// (*break*), which would show as asterisks in a list.
function clip(text, max = 240) {
  const t = String(text || '').replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function words(...parts) {
  return parts
    .filter(p => typeof p === 'string' && p.trim())
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function readMinutes(...parts) {
  return Math.max(1, Math.round(words(...parts) / WORDS_PER_MINUTE));
}

function names(v) {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : [];
}

// One row from a piece's table, as a journal entry. Returns null for a row the
// journal cannot show (no headline).
function toJournalEntry(kind, r) {
  if (!r || !r.id) return null;
  let entry;
  switch (kind) {
    case 'tension': {
      const poles = [r.position_a, r.position_b, ...(Array.isArray(r.additional_positions) ? r.additional_positions : [])];
      const poleAuthors = [r.position_a?.author, r.position_b?.author].filter(Boolean);
      entry = {
        title: r.title,
        dek: firstSentence(r.tension_statement),
        authors: poleAuthors.length >= 2 ? poleAuthors : names(r.source_authors).slice(0, 2),
        minutes: readMinutes(r.tension_statement, ...poles.map(p => p?.position_summary), r.lived_stakes, r.resolution_note),
        publishedAt: r.reviewed_at || r.generated_at,
      };
      break;
    }
    case 'inquiry':
      entry = {
        title: r.question,
        // question_origin is provenance ("Seeded by ..."), not prose; lead with
        // the pursuit.
        dek: firstSentence(r.pursuit_text) || firstSentence(r.question_origin),
        authors: names(r.source_authors),
        minutes: readMinutes(r.question_origin, r.pursuit_text, r.where_corpus_runs_out),
        publishedAt: r.reviewed_at || r.generated_at,
      };
      break;
    case 'dream':
      entry = {
        title: r.title || 'A thought from the corpus',
        dek: firstSentence(r.content),
        authors: names(r.seed_authors),
        minutes: readMinutes(r.content, r.seed_summary),
        publishedAt: r.reviewed_at || r.generated_at,
        starred: r.status === 'starred',
      };
      break;
    case 'convergence':
      entry = {
        title: r.title,
        dek: firstSentence(r.conclusion_text),
        authors: names(r.source_authors),
        minutes: readMinutes(r.conclusion_text, r.pursuit_text, r.breakpoint_text),
        publishedAt: r.created_at,
        starred: r.status === 'starred',
      };
      break;
    case 'world':
      // dominant_signal is a two-sentence news summary; its first sentence is
      // the headline, and the piece page shows the whole of it.
      entry = {
        title: clip(firstSentence(r.dominant_signal), 160),
        dek: firstSentence(r.corpus_response),
        authors: names(r.relevant_authors),
        minutes: readMinutes(r.corpus_response, r.world_corpus_tension),
        publishedAt: r.reviewed_at || r.generated_at,
      };
      break;
    default:
      return null;
  }
  if (!entry.title || !String(entry.title).trim()) return null;
  return {
    kind,
    id: r.id,
    title: String(entry.title).trim(),
    dek: clip(entry.dek),
    authors: entry.authors,
    minutes: entry.minutes,
    publishedAt: entry.publishedAt || null,
    starred: !!entry.starred,
  };
}

// Newest first; an entry without a date sinks to the end.
function sortJournal(entries) {
  const t = e => (e.publishedAt ? Date.parse(e.publishedAt) || 0 : 0);
  return [...entries].sort((a, b) => t(b) - t(a));
}

// The select for each kind, and its visibility gate, as applied by the
// endpoint. Kept beside the shaping so the two cannot drift apart.
const SOURCES = Object.freeze({
  tension: {
    table: 'philosophical_tensions',
    select: 'id, title, tension_statement, position_a, position_b, additional_positions, lived_stakes, resolution_note, source_authors, reviewed_at, generated_at',
    gate: q => q.eq('status', 'approved').eq('observatory_visible', true),
  },
  inquiry: {
    table: 'open_inquiries',
    select: 'id, question, question_origin, pursuit_text, where_corpus_runs_out, source_authors, reviewed_at, generated_at',
    gate: q => q.eq('status', 'approved').eq('observatory_visible', true),
  },
  dream: {
    table: 'corpus_dreams',
    select: 'id, title, content, seed_authors, seed_summary, status, reviewed_at, generated_at',
    gate: q => q.in('status', ['approved', 'starred']).eq('observatory_visible', true),
  },
  convergence: {
    table: 'convergences',
    select: 'id, title, conclusion_text, pursuit_text, breakpoint_text, source_authors, status, created_at',
    gate: q => q.in('status', ['approved', 'starred']),
  },
  world: {
    table: 'world_observations',
    select: 'id, dominant_signal, corpus_response, world_corpus_tension, relevant_authors, reviewed_at, generated_at',
    gate: q => q.in('status', ['approved', 'auto_approved']).eq('observatory_visible', true),
  },
});

async function loadJournal(supabase, { limit = 120 } = {}) {
  const results = await Promise.all(KINDS.map(async kind => {
    const src = SOURCES[kind];
    const { data, error } = await src.gate(supabase.from(src.table).select(src.select)).limit(limit);
    if (error) throw new Error(`${src.table}: ${error.message}`);
    return (data || []).map(r => toJournalEntry(kind, r)).filter(Boolean);
  }));
  return sortJournal(results.flat()).slice(0, limit);
}

module.exports = {
  KINDS,
  WORDS_PER_MINUTE,
  firstSentence,
  clip,
  readMinutes,
  toJournalEntry,
  sortJournal,
  loadJournal,
};
