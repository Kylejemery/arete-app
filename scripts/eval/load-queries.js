// Loads scripts/eval/seed-queries.json into eval.eval_queries.
//
// Refuses to run against a non empty table unless --reset is passed, because
// deleting queries cascades to candidates and judgments and judgments are the
// expensive thing in this harness.
//
// Usage:
//   node scripts/eval/load-queries.js
//   node scripts/eval/load-queries.js --reset

const fs = require('fs');
const path = require('path');
const { supabaseClient } = require('./lib');

const DOCTRINES = [
  'dichotomy_of_control', 'judgment_not_events', 'premeditatio', 'memento_mori',
  'anger', 'envy', 'reputation', 'duty', 'grief', 'akrasia', 'other',
];

function validate(queries) {
  const problems = [];
  if (queries.length !== 60) problems.push('expected 60 queries, got ' + queries.length);

  const byRegister = { user: 0, scholarly: 0 };
  const byDoctrine = {};
  for (const q of queries) {
    if (!q.query_text || !q.register) problems.push('query missing text or register: ' + JSON.stringify(q));
    byRegister[q.register] = (byRegister[q.register] || 0) + 1;
    byDoctrine[q.doctrine] = (byDoctrine[q.doctrine] || 0) + 1;
    if (q.doctrine && !DOCTRINES.includes(q.doctrine)) problems.push('unknown doctrine: ' + q.doctrine);
    if (/[–—]/.test(q.query_text + (q.notes || ''))) problems.push('dash character in: ' + q.query_text);
  }
  if (byRegister.user !== 40) problems.push('expected 40 user queries, got ' + (byRegister.user || 0));
  if (byRegister.scholarly !== 20) problems.push('expected 20 scholarly queries, got ' + (byRegister.scholarly || 0));
  for (const d of DOCTRINES) {
    if ((byDoctrine[d] || 0) < 3) problems.push('doctrine ' + d + ' has ' + (byDoctrine[d] || 0) + ' queries, need at least 3');
  }
  const texts = new Set(queries.map((q) => q.query_text.toLowerCase()));
  if (texts.size !== queries.length) problems.push('duplicate query_text values');
  return problems;
}

async function main() {
  const reset = process.argv.includes('--reset');
  const file = path.join(__dirname, 'seed-queries.json');
  const { queries } = JSON.parse(fs.readFileSync(file, 'utf8'));

  const problems = validate(queries);
  if (problems.length) {
    console.error('seed-queries.json failed validation:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }

  const supabase = supabaseClient();
  const evalDb = supabase.schema('eval');

  const { count, error: countError } = await evalDb
    .from('eval_queries')
    .select('id', { count: 'exact', head: true });
  if (countError) throw new Error('count failed: ' + countError.message);

  if (count > 0 && !reset) {
    console.error(
      'eval_queries already has ' + count + ' rows. Rerun with --reset to wipe and ' +
      'reload. Warning: reset cascades to eval_candidates and eval_judgments.'
    );
    process.exit(1);
  }

  if (count > 0 && reset) {
    const { error } = await evalDb
      .from('eval_queries')
      .delete()
      .not('id', 'is', null);
    if (error) throw new Error('reset delete failed: ' + error.message);
    console.log('Deleted ' + count + ' existing queries (candidates and judgments cascaded).');
  }

  const rows = queries.map((q) => ({
    query_text: q.query_text,
    doctrine: q.doctrine || null,
    register: q.register,
    notes: q.notes || null,
  }));

  const { error: insertError } = await evalDb.from('eval_queries').insert(rows);
  if (insertError) throw new Error('insert failed: ' + insertError.message);

  console.log('Loaded ' + rows.length + ' queries into eval.eval_queries.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
