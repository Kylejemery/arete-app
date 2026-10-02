// server/synthesis/drafts.js
//
// The review queue for versioned Markdown drafts (synthesis_drafts). Both
// modes write here; Kyle reviews at /admin/synthesis/stoic-life and the
// export (academy/corpus-ingestion/export-synthesis-drafts.js) takes the
// approved ones into the repo.

const { getSupabase } = require('./shared');
const { slugify } = require('../lib/synthesis-markdown');

// Statuses that hold the review slot. Stoic Life allows one draft in review
// at a time (a unique index enforces it in the database too).
const IN_REVIEW = Object.freeze(['pending_review', 'edited']);

// A doc_key no draft and no loaded document already uses. The base is the
// prefix plus the slug; a clash gets -2, -3, ...
async function uniqueDocKey(prefix, title) {
  const supabase = getSupabase();
  const base = slugify(`${prefix} ${title}`, 70);
  const [drafts, docs] = await Promise.all([
    supabase.from('synthesis_drafts').select('doc_key').like('doc_key', `${base}%`),
    supabase.from('corpus_synthesis_documents').select('doc_key').like('doc_key', `${base}%`),
  ]);
  if (drafts.error) throw new Error(`reading draft keys: ${drafts.error.message}`);
  if (docs.error) throw new Error(`reading document keys: ${docs.error.message}`);
  const taken = new Set([...(drafts.data || []), ...(docs.data || [])].map(r => r.doc_key));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

function wordCount(md) {
  const body = md.replace(/^---[\s\S]*?\n---\n?/, '');
  return body.split(/\s+/).filter(w => /\w/.test(w)).length;
}

async function insertDraft(row) {
  const { data, error } = await getSupabase()
    .from('synthesis_drafts')
    .insert({ ...row, word_count: wordCount(row.markdown), status: 'pending_review' })
    .select('id, doc_key, title')
    .single();
  if (error) throw new Error(`storing draft: ${error.message}`);
  return data;
}

async function hasDraftInReview(mode) {
  const { count, error } = await getSupabase()
    .from('synthesis_drafts')
    .select('id', { count: 'exact', head: true })
    .eq('mode', mode)
    .in('status', IN_REVIEW);
  if (error) throw new Error(`reading drafts in review: ${error.message}`);
  return (count || 0) > 0;
}

// rag_corpus.text_type for a set of chunk ids. match_rag_corpus_ids and
// concept_passage_map return passages without it.
async function textTypesFor(ids) {
  const out = new Map();
  const clean = [...new Set(ids.filter(Boolean))];
  if (!clean.length) return out;
  const { data, error } = await getSupabase().from('rag_corpus').select('id, text_type').in('id', clean);
  if (error) throw new Error(`reading text types: ${error.message}`);
  for (const r of data || []) out.set(r.id, r.text_type);
  return out;
}

module.exports = { IN_REVIEW, uniqueDocKey, insertDraft, hasDraftInReview, textTypesFor, wordCount };
