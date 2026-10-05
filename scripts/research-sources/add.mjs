// Stores a full text in research_sources: private, service role only, never
// embedded or retrieved (see supabase/migrations/*_research_sources.sql and
// themata/THEMATA_PROJECT.md guardrail 1). This is not the corpus pipeline.
// A work that should be retrievable goes through queue-add.js or the admin
// corpus page instead.
//
// Reads a UTF-8 text file, or fetches a URL, and inserts it with the metadata
// given as flags. Refuses if the same text (by sha256) is already stored.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/research-sources/add.mjs \
//     --file sextus-m8.txt \
//     --author "Sextus Empiricus" --work "Against the Logicians" --volume "Loeb II" \
//     --translator "R. G. Bury" --edition "Loeb Classical Library 291" --edition-year 1935 \
//     --source-url https://... --how-obtained "purchased ebook" \
//     --licence licensed_copy --licence-notes "..." \
//     --locator-scheme "M book.section (Bekker)"
//
// --licence is one of public_domain, open_licence_confirmed, licensed_copy,
// quotation_only, unconfirmed. Nothing stored as unconfirmed can be cited until
// it is changed. quotation_only allows quotations of at most 60 words with full
// attribution, and the database keeps the work out of rag_corpus (migration
// 20261005184546).
// Add --dry-run to print the row without writing it.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';

const LICENCES = ['public_domain', 'open_licence_confirmed', 'licensed_copy', 'quotation_only', 'unconfirmed'];

const { values: a } = parseArgs({
  options: {
    file: { type: 'string' },
    url: { type: 'string' },
    author: { type: 'string' },
    work: { type: 'string' },
    volume: { type: 'string' },
    translator: { type: 'string' },
    edition: { type: 'string' },
    'edition-year': { type: 'string' },
    'source-url': { type: 'string' },
    'how-obtained': { type: 'string' },
    licence: { type: 'string' },
    'licence-notes': { type: 'string' },
    'locator-scheme': { type: 'string' },
    notes: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const fail = msg => { console.error(msg); process.exit(1); };

const required = ['author', 'work', 'edition', 'edition-year', 'how-obtained', 'licence', 'locator-scheme'];
const missing = required.filter(k => !a[k]);
if (missing.length) fail(`Missing: ${missing.map(k => `--${k}`).join(', ')}`);
if (!a.file === !a.url) fail('Give exactly one of --file or --url.');
if (!LICENCES.includes(a.licence)) fail(`--licence must be one of ${LICENCES.join(', ')}.`);
const editionYear = Number(a['edition-year']);
if (!Number.isInteger(editionYear)) fail('--edition-year must be a year.');

let text;
if (a.file) {
  text = readFileSync(a.file, 'utf8');
} else {
  const res = await fetch(a.url);
  if (!res.ok) fail(`Fetch failed: ${res.status}`);
  text = await res.text();
}
text = text.replace(/\r\n?/g, '\n').normalize('NFC');
if (!text.trim()) fail('The text is empty.');

const row = {
  author: a.author,
  work: a.work,
  volume: a.volume ?? null,
  translator: a.translator ?? null,
  edition: a.edition,
  edition_year: editionYear,
  source_url: a['source-url'] ?? a.url ?? null,
  how_obtained: a['how-obtained'],
  licence_status: a.licence,
  licence_notes: a['licence-notes'] ?? null,
  locator_scheme: a['locator-scheme'],
  notes: a.notes ?? null,
  full_text: text,
  sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
};

if (a['dry-run']) {
  console.log(JSON.stringify({ ...row, full_text: `${text.length} characters` }, null, 2));
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');

const res = await fetch(`${url}/rest/v1/research_sources?select=id,sha256`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify(row),
});
if (res.status === 409) fail(`Already stored (sha256 ${row.sha256}).`);
if (!res.ok) fail(`Insert failed: ${res.status} ${await res.text()}`);
const [saved] = await res.json();
console.log(`Stored ${row.author}, ${row.work}: ${saved.id} (${text.length} characters, sha256 ${saved.sha256}).`);
