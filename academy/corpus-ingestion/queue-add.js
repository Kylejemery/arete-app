// academy/corpus-ingestion/queue-add.js
// Add a single source to corpus_ingestion_queue without writing SQL.
//
// Usage:
//   node queue-add.js --author "Epictetus" --work "Fragments" --url "https://..." --priority 5
//
// Flags: --author (req), --work (req), --url, --language (en|grc|lat),
//        --priority (int), --course, --difficulty, --notes
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const author = getArg('--author');
  const work = getArg('--work');
  if (!author || !work) {
    console.error('Usage: node queue-add.js --author "Name" --work "Title" [--url URL] [--language en] [--priority 100] [--course "PHIL 701"] [--difficulty "Introductory"] [--notes "..."]');
    process.exit(1);
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
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
  console.log(`Queued: ${author} / ${work} (priority ${row.priority}, status pending)`);
  if (!row.source_url) console.warn('Note: no --url given — the agent needs source_url to fetch this source.');
}

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
