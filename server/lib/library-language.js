// server/lib/library-language.js
//
// Which rows of a work the Library reader shows. A work can hold more than one
// language: Musonius Rufus' Lectures has the eulogikon Greek (chunk_index 0-45)
// and Lutz's English (46-130). library_shelf() gives such a work one reading
// language (english when it has any English rows; migration
// 20260930175018_library_shelf_reading_language.sql), and the reader, its
// outline and its search have to page through the same rows the shelf card
// describes, or the reader opens on the Greek.
//
// The rule lives in library_works(), so it is read from there rather than
// restated. Only a work that mixes languages gets a filter; every other work
// reads exactly as before, and so does every work when the lookup fails.

const TTL_MS = 10 * 60 * 1000;

let cache = { map: null, at: 0, pending: null };

async function load(supabase) {
  const { data, error } = await supabase.rpc('library_works');
  if (error) throw new Error(error.message);
  const map = new Map();
  for (const w of data || []) {
    // A work in one language needs no filter.
    if (Number(w.language_count) < Number(w.chunk_count)) {
      map.set(`${w.author}::${w.work}`, w.language);
    }
  }
  cache = { map, at: Date.now(), pending: null };
  return map;
}

/**
 * The language to filter a work's rows by, or null for no filter. Serves the
 * cached map and refreshes it in the background once stale; fails open.
 */
async function readingLanguageFilter(supabase, author, work) {
  if (!cache.map || Date.now() - cache.at >= TTL_MS) {
    if (!cache.pending) {
      cache.pending = load(supabase).catch((err) => {
        console.error('[library-language] library_works failed:', err.message);
        cache.pending = null;
        return cache.map || new Map();
      });
    }
    if (!cache.map) await cache.pending;
  }
  return (cache.map && cache.map.get(`${author}::${work}`)) || null;
}

/** Add the reading-language filter to a rag_corpus query when there is one. */
function withLanguage(query, language) {
  return language ? query.eq('language', language) : query;
}

// Tests reset the module cache between cases.
function _resetForTests() {
  cache = { map: null, at: 0, pending: null };
}

module.exports = { readingLanguageFilter, withLanguage, _resetForTests };
