// academy/corpus-ingestion/queue-add.js
// Add a single source to corpus_ingestion_queue without writing SQL.
//
// Usage:
//   node queue-add.js --author "Epictetus" --work "Fragments" --url "https://..." --priority 5
//   node queue-add.js --author "Plato" --work "Timaeus" \
//     --url "https://www.gutenberg.org/cache/epub/1572/pg1572.txt" \
//     --translator "Benjamin Jowett" --start-marker "PERSONS OF THE DIALOGUE" --priority 1
//
// Flags: --author (req), --work (req), --url, --language (en|grc|lat),
//        --priority (int; lower runs first), --course, --difficulty, --notes,
//        --translator, --text-type (default primary),
//        --source-type (public_domain|original_language|summary),
//        --start-marker (body starts at the LAST occurrence of this string),
//        --end-marker (body ends at the first occurrence after the start).
//
// Check a URL and its markers first: node verify-queue.js --url URL --start-marker "..."
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SOURCE_TYPES = ['public_domain', 'original_language', 'summary'];

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function usage() {
  console.error(
    'Usage: node queue-add.js --author "Name" --work "Title" [--url URL] [--language en] [--priority 100]\n' +
    '       [--course "PHIL 701"] [--difficulty "Introductory"] [--notes "..."] [--translator "Name"]\n' +
    '       [--text-type primary] [--source-type public_domain] [--start-marker "..."] [--end-marker "..."]'
  );
}

async function main() {
  const author = getArg('--author');
  const work = getArg('--work');
  if (!author || !work) {
    usage();
    process.exit(1);
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const sourceType = getArg('--source-type') ?? 'public_domain';
  if (!SOURCE_TYPES.includes(sourceType)) {
    console.error(`--source-type must be one of ${SOURCE_TYPES.join(', ')}`);
    process.exit(1);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const priorityArg = getArg('--priority');

  const row = {
    author,
    work,
    source_url: getArg('--url') ?? null,
    language: getArg('--language') ?? 'en',
    course_relevance: getArg('--course') ?? null,
    difficulty: getArg('--difficulty') ?? null,
    notes: getArg('--notes') ?? null,
    priority: priorityArg != null ? parseInt(priorityArg, 10) : 100,
    status: 'pending',
    source_type: sourceType,
    translator: getArg('--translator') ?? null,
    text_type: getArg('--text-type') ?? 'primary',
    body_start_marker: getArg('--start-marker') ?? null,
    body_end_marker: getArg('--end-marker') ?? null,
  };

  const { error } = await supabase.from('corpus_ingestion_queue').insert(row);
  if (error) {
    if (error.code === '23505') {
      console.error(`Already queued: ${author} / ${work}`);
    } else {
      console.error('Insert failed:', error.message);
    }
    process.exit(1);
  }
  console.log(`Queued: ${author} / ${work} (priority ${row.priority}, status pending, text_type ${row.text_type}` +
    `${row.translator ? `, trans. ${row.translator}` : ''})`);
  if (row.body_start_marker) console.log(`  body starts at last occurrence of: ${JSON.stringify(row.body_start_marker)}`);
  if (row.body_end_marker) console.log(`  body ends at first occurrence of: ${JSON.stringify(row.body_end_marker)}`);
  if (!row.source_url) console.warn('Note: no --url given — the agent needs source_url to fetch this source.');
}

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
