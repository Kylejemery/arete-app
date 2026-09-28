// Copies themata/findings.html into the academy site, where the owner-only
// Playground piece /playground/themata renders it. The academy build only
// sees academy/web/, so the page is carried there as a string module.
// themata/findings.html is the source; the module is generated, never edited.
//
//   node scripts/themata/sync-findings-page.mjs           # regenerate
//   node scripts/themata/sync-findings-page.mjs --check   # fail if out of date
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'themata', 'findings.html');
const out = join(root, 'academy', 'web', 'src', 'content', 'playground', 'themata-findings.ts');

const html = readFileSync(src, 'utf8');
const module =
  '// Generated from themata/findings.html by scripts/themata/sync-findings-page.mjs.\n' +
  '// Do not edit by hand: edit the HTML and run the script.\n' +
  `export const THEMATA_FINDINGS_HTML = ${JSON.stringify(html)}\n`;

if (process.argv.includes('--check')) {
  const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (current !== module) {
    console.error('themata-findings.ts is out of date: run node scripts/themata/sync-findings-page.mjs');
    process.exit(1);
  }
  console.log('themata-findings.ts is up to date');
} else {
  writeFileSync(out, module);
  console.log(`Wrote ${out}`);
}
