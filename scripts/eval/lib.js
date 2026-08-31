// Shared plumbing for the retrieval eval harness scripts.
//
// Loads env vars from the repo env files (first file that defines a key wins,
// values already in process.env win over everything) and builds a Supabase
// client using the service role key. Also exposes the same query embedding
// call the app uses, so the vector retriever here matches production exactly:
// OpenAI text-embedding-3-small, same as embedQuery in server/index.js.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..');

const ENV_FILES = [
  path.join(__dirname, '.env'),
  path.join(ROOT, '.env'),
  path.join(ROOT, 'academy', 'corpus-ingestion', '.env'),
];

function loadEnv() {
  for (const file of ENV_FILES) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      if (process.env[key] !== undefined && process.env[key] !== '') continue;
      process.env[key] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

function requireEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(
      'Missing env vars: ' + missing.join(', ') + '. Checked: ' + ENV_FILES.join(', ')
    );
    process.exit(1);
  }
}

function supabaseClient() {
  loadEnv();
  requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Same model and endpoint as embedQuery in server/index.js.
async function embedQuery(text) {
  requireEnv(['OPENAI_API_KEY']);
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error('OpenAI embeddings error: ' + JSON.stringify(data.error || data));
  }
  return data.data[0].embedding;
}

module.exports = { ROOT, loadEnv, requireEnv, supabaseClient, embedQuery };
