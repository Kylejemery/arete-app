// pd-ingest/db.js — the service-role client, required lazily so the parsers
// and tests load without an install or credentials.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

let client = null;
function db() {
  if (!client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (academy/corpus-ingestion/.env)');
    }
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

module.exports = { db, must };
