// Copies the Themata Machine into the academy site, where the owner-only
// Playground piece /playground/themata-machine renders it. The academy build
// only sees academy/web/, so the page and its data are carried there:
//
// * themata/machine.html becomes a string module, wrapped as a full document
//   whose <base> points its relative data/ fetches at the copied export;
// * themata/results/explorer/{index,harness,items,searches}.json are copied
//   byte for byte to academy/web/public/playground/themata-machine/data/;
// * each runs/cNN.json is copied as {candidate, name, reductions}. The page
//   reads only the reductions from these files, and the full run records
//   (40 MB) repeat what searches.json already holds.
//
// The page computes no verdict, and neither does this script: it copies.
// themata/ is the source; everything written here is generated, never edited.
//
//   node scripts/themata/sync-machine-page.mjs           # regenerate
//   node scripts/themata/sync-machine-page.mjs --check   # fail if out of date
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const explorer = join(root, 'themata', 'results', 'explorer');
const moduleOut = join(root, 'academy', 'web', 'src', 'content', 'playground', 'themata-machine.ts');
const dataOut = join(root, 'academy', 'web', 'public', 'playground', 'themata-machine', 'data');

const page = readFileSync(join(root, 'themata', 'machine.html'), 'utf8');
const html =
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<meta name="robots" content="noindex, nofollow">' +
  '<base href="/playground/themata-machine/">' +
  '<style>body{margin:0}</style></head><body>\n' + page + '\n</body></html>\n';

const files = new Map();
files.set(moduleOut,
  '// Generated from themata/machine.html by scripts/themata/sync-machine-page.mjs.\n' +
  '// Do not edit by hand: edit the HTML and run the script.\n' +
  `export const THEMATA_MACHINE_HTML = ${JSON.stringify(html)}\n`);
for (const name of ['index.json', 'harness.json', 'items.json', 'searches.json']) {
  files.set(join(dataOut, name), readFileSync(join(explorer, name), 'utf8'));
}
const harness = JSON.parse(readFileSync(join(explorer, 'harness.json'), 'utf8'));
for (const c of harness.candidates) {
  const runs = JSON.parse(readFileSync(join(explorer, c.file), 'utf8'));
  files.set(join(dataOut, c.file),
    JSON.stringify({ candidate: runs.candidate, name: runs.name, reductions: runs.reductions }) + '\n');
}

const runsDir = join(dataOut, 'runs');
const stale = existsSync(runsDir)
  ? readdirSync(runsDir).map((f) => join(runsDir, f)).filter((f) => !files.has(f))
  : [];

if (process.argv.includes('--check')) {
  const bad = [...files].filter(([path, text]) => !existsSync(path) || readFileSync(path, 'utf8') !== text).map(([p]) => p);
  bad.push(...stale);
  if (bad.length) {
    console.error(`${bad.length} Themata Machine file(s) out of date, e.g. ${bad[0]}: run node scripts/themata/sync-machine-page.mjs`);
    process.exit(1);
  }
  console.log(`Themata Machine is up to date (${files.size} files)`);
} else {
  mkdirSync(runsDir, { recursive: true });
  for (const f of stale) rmSync(f);
  for (const [path, text] of files) writeFileSync(path, text);
  console.log(`Wrote ${files.size} files for /playground/themata-machine`);
}
