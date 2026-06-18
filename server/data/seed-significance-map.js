// server/data/seed-significance-map.js
//
// Idempotent seeder for corpus_significance_map. Reads significance-map.json and
// upserts on the (author, work) conflict target, so it is safe to re-run after
// editing the JSON. Run once manually after applying the gap-agent migration:
//
//   node server/data/seed-significance-map.js
//
// Env (same as the other agents): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedSignificanceMap() {
  const map = JSON.parse(
    fs.readFileSync(__dirname + '/significance-map.json', 'utf8')
  );

  const { error } = await supabase
    .from('corpus_significance_map')
    .upsert(map, { onConflict: 'author,work' });

  if (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  console.log(`Seeded ${map.length} entries into corpus_significance_map`);
}

seedSignificanceMap();
