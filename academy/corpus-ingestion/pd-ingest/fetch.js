// pd-ingest/fetch.js — fetch each URL once, cache it, never fetch it again.
//
// data/raw/<slug>/<file> holds the bytes; data/raw/<slug>/manifest.json holds
// url, retrieved_at and sha256 per file. A cached file is read from disk and
// its hash checked against the manifest; the network is not touched.
//
// Politeness: a host allowlist (JSTOR, publishers and anything behind a login
// cannot be reached by mistake), robots.txt read and obeyed per host, a
// descriptive user agent, and a minimum interval per host. LacusCurtius is
// one person's site, so it gets four seconds between requests.

const fs = require('fs');
const path = require('path');
const { sha256 } = require('./lib');

const RAW_ROOT = path.resolve(__dirname, '../../../data/raw');
const USER_AGENT = 'AreteCorpusIngest/1.0 (public-domain texts for a philosophy study corpus; github.com/Kylejemery/arete-app)';

const HOSTS = {
  'penelope.uchicago.edu': { intervalMs: 4000 },
  'archive.org': { intervalMs: 1500 },
  'en.wikisource.org': { intervalMs: 1000 },
  'www.perseus.tufts.edu': { intervalMs: 2000 },
  'www.gutenberg.org': { intervalMs: 2000 },
  'www.thelatinlibrary.com': { intervalMs: 2000 },
};

class FetchRefused extends Error {
  // kind: 'not_allowed' | 'robots' | 'http' — permanent, goes to the skip log.
  constructor(kind, message) { super(message); this.kind = kind; }
}
class NetworkUnavailable extends Error {}

const lastHit = new Map();
const robotsCache = new Map();

function fileNameFor(url) {
  const u = new URL(url);
  const base = (u.pathname + (u.search || '')).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+/, '');
  const ext = /\.(pdf|txt|html?|xml|json)$/i.test(u.pathname) ? '' : '.html';
  return (base || 'index').slice(-150) + ext;
}

function readManifest(dir) {
  const p = path.join(dir, 'manifest.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { files: {} };
}

function writeManifest(dir, m) {
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
}

async function politeWait(host) {
  const cfg = HOSTS[host];
  const since = Date.now() - (lastHit.get(host) || 0);
  if (since < cfg.intervalMs) await new Promise((r) => setTimeout(r, cfg.intervalMs - since));
  lastHit.set(host, Date.now());
}

async function rawGet(url) {
  const host = new URL(url).host;
  await politeWait(host);
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' });
  } catch (err) {
    throw new NetworkUnavailable(`${host}: ${err.cause?.message || err.message}`);
  }
  // A redirect must not carry the request off the allowlist.
  const finalHost = new URL(res.url || url).host;
  if (!HOSTS[finalHost]) throw new FetchRefused('not_allowed', `${url} redirected to ${finalHost}, which is not allowlisted`);
  return res;
}

// Minimal robots.txt reading: the `User-agent: *` group's Disallow lines.
function robotsDisallows(robotsText, pathname) {
  let inStar = false;
  const rules = [];
  for (const raw of robotsText.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === 'user-agent') inStar = m[2].trim() === '*';
    else if (inStar && key === 'disallow' && m[2].trim()) rules.push(m[2].trim());
  }
  return rules.some((r) => pathname.startsWith(r));
}

async function checkRobots(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.host)) {
    const res = await rawGet(`${u.protocol}//${u.host}/robots.txt`);
    robotsCache.set(u.host, res.ok ? await res.text() : '');
  }
  if (robotsDisallows(robotsCache.get(u.host), u.pathname)) {
    throw new FetchRefused('robots', `${u.host}/robots.txt disallows ${u.pathname}`);
  }
}

async function getCached(slug, url) {
  const host = new URL(url).host;
  if (!HOSTS[host]) throw new FetchRefused('not_allowed', `${host} is not on the fetch allowlist`);
  const dir = path.join(RAW_ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = readManifest(dir);
  const name = fileNameFor(url);
  const file = path.join(dir, name);
  const entry = manifest.files[name];

  if (entry && fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    const hash = sha256(buf);
    if (hash !== entry.sha256) throw new Error(`${file}: sha256 ${hash} does not match manifest ${entry.sha256}`);
    return { url: entry.url, file, body: buf, sha256: hash, retrieved_at: entry.retrieved_at, cached: true };
  }

  await checkRobots(url);
  const res = await rawGet(url);
  if (!res.ok) throw new FetchRefused('http', `${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = sha256(buf);
  const retrieved_at = new Date().toISOString();
  fs.writeFileSync(file, buf);
  manifest.files[name] = { url, retrieved_at, sha256: hash, bytes: buf.length };
  writeManifest(dir, manifest);
  return { url, file, body: buf, sha256: hash, retrieved_at, cached: false };
}

// A file already in the raw cache that was not fetched: a PDF's text layer
// written by extract-pdf.py, for a scan that reached us as a file. Read and
// hash-checked like any cached fetch; the source hash is the PDF's, recorded
// in the manifest, since the PDF is what a later check would compare.
function getLocal(slug, name) {
  const dir = path.join(RAW_ROOT, slug);
  const entry = readManifest(dir).files[name];
  const file = path.join(dir, name);
  if (!entry || !fs.existsSync(file)) throw new Error(`${file}: not in the raw cache; run pd-ingest/extract-pdf.py first`);
  const buf = fs.readFileSync(file);
  const hash = sha256(buf);
  if (hash !== entry.sha256) throw new Error(`${file}: sha256 ${hash} does not match manifest ${entry.sha256}`);
  const origin = entry.extracted_from ? entry.extracted_from.sha256 : hash;
  return { url: entry.url, file, body: buf, sha256: origin, retrieved_at: entry.retrieved_at, cached: true };
}

// A file written in the repo rather than fetched or extracted: an English
// summary under docs/corpus/summaries/. Its hash is recorded at staging, so
// what is promoted is what was reviewed.
const REPO_ROOT = path.resolve(__dirname, '../../..');
function getRepoFile(relPath) {
  const file = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(file)) throw new Error(`${relPath}: not found in the repo`);
  const buf = fs.readFileSync(file);
  return { url: null, file, body: buf, sha256: sha256(buf), retrieved_at: null, cached: true };
}

// One hash for a source built from several files: the hash of the ordered
// per-file hashes, so any changed page changes it.
function combinedSha256(fetched) {
  return fetched.length === 1 ? fetched[0].sha256 : sha256(fetched.map((f) => f.sha256).join('\n'));
}

module.exports = {
  getCached, getLocal, getRepoFile, combinedSha256, robotsDisallows, fileNameFor,
  FetchRefused, NetworkUnavailable, HOSTS, RAW_ROOT, USER_AGENT,
};
