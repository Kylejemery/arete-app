// server/lib/quality-audit/index.js
//
// The probe registry. Four domains, run in the order a reader wants them:
// the corpus first because it is the thing that compounds, then the surfaces
// that present it, then the repository, then the judgment pass that costs
// money and is therefore last.

const corpus = require('./probes-corpus');
const library = require('./probes-library');
const repo = require('./probes-repo');
const material = require('./probes-material');

const DOMAINS = ['corpus', 'library', 'repo', 'material'];

const ALL_PROBES = [
  ...corpus.probes,
  ...library.probes,
  ...repo.probes,
  ...material.probes,
];

// Fail loudly at load time rather than writing a report with two findings that
// share a fingerprint and therefore diff wrongly forever after.
const seen = new Set();
for (const p of ALL_PROBES) {
  if (seen.has(p.id)) throw new Error(`duplicate probe id: ${p.id}`);
  seen.add(p.id);
  if (!DOMAINS.includes(p.domain)) throw new Error(`probe ${p.id} has unknown domain ${p.domain}`);
}

function selectProbes({ domains, ids }) {
  let probes = ALL_PROBES;
  if (ids && ids.length) probes = probes.filter(p => ids.includes(p.id));
  else if (domains && domains.length) probes = probes.filter(p => domains.includes(p.domain));
  return probes;
}

module.exports = { ALL_PROBES, DOMAINS, selectProbes, findRepoRoot: repo.findRepoRoot };
