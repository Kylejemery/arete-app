// academy/corpus-ingestion/export-synthesis-drafts.test.js
//
// The two-step export the workflow uses: --write-only writes the files and
// leaves drafts 'approved'; --mark-exported applies the status only to a draft
// still approved with the text that was written.
//
//   node --test export-synthesis-drafts.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exportApproved, markExported } = require('./export-synthesis-drafts');

const SAMPLE = path.join(__dirname, 'synthesis', 'stoic-life-diet-eating-as-a-stoic.v1.md');
// An approved draft as the agent stores it: no reviewed_by yet.
const draftMd = fs.readFileSync(SAMPLE, 'utf8').replace(/^reviewed_by:.*\n/m, '');

// A fake Supabase client covering the calls the exporter makes.
function fakeSupabase(rows) {
  const updates = [];
  const from = table => {
    const filters = [];
    let patch = null;
    const q = {
      select() { return q; },
      order() { return q; },
      update(p) { patch = p; return q; },
      eq(col, val) { filters.push([col, val]); return q; },
      maybeSingle() { return Promise.resolve({ data: null, error: null }); },
      then(resolve) {
        if (table === 'synthesis_drafts' && patch) {
          const hit = rows.filter(r => filters.every(([c, v]) => r[c] === v));
          hit.forEach(r => { Object.assign(r, patch); updates.push({ id: r.id, ...patch }); });
          return resolve({ data: hit.map(r => ({ id: r.id })), error: null });
        }
        if (table === 'synthesis_drafts') {
          return resolve({ data: rows.filter(r => filters.every(([c, v]) => r[c] === v)), error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return q;
  };
  return { from, updates };
}

function tmpTarget() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'synth-export-'));
  const readmePath = path.join(dir, 'README.md');
  fs.writeFileSync(readmePath, '| File | Chunks | Status |\n| --- | --- | --- |\n| `old.v1.md` | 1 | 1 interpretive |\n');
  return { dir, readmePath };
}

const draft = () => ({
  id: 'd1', status: 'approved', mode: 'stoic_life',
  doc_key: 'stoic-life-diet-eating-as-a-stoic', version: 1, title: 'What Should a Stoic Eat?', markdown: draftMd,
});

test('--write-only writes the file and README row and leaves the draft approved', async () => {
  const rows = [draft()];
  const sb = fakeSupabase(rows);
  const { dir, readmePath } = tmpTarget();
  const r = await exportApproved(sb, { dryRun: false, log: () => {}, dir, readmePath, deferStatus: true });

  assert.equal(r.errors, 0);
  assert.deepEqual(r.files, ['stoic-life-diet-eating-as-a-stoic.v1.md']);
  assert.match(fs.readFileSync(path.join(dir, r.files[0]), 'utf8'), /^reviewed_by: Kyle$/m);
  assert.match(fs.readFileSync(readmePath, 'utf8'), /stoic-life-diet-eating-as-a-stoic\.v1\.md/);
  assert.equal(rows[0].status, 'approved');
  assert.equal(sb.updates.length, 0);
  assert.equal(r.pending.length, 1);
});

test('--mark-exported applies the recorded update to an unchanged approved draft', async () => {
  const rows = [draft()];
  const sb = fakeSupabase(rows);
  const { dir, readmePath } = tmpTarget();
  const { pending } = await exportApproved(sb, { dryRun: false, log: () => {}, dir, readmePath, deferStatus: true });

  const r = await markExported(sb, JSON.parse(JSON.stringify(pending)), () => {});
  assert.deepEqual(r, { marked: 1, skipped: 0 });
  assert.equal(rows[0].status, 'exported');
  assert.equal(rows[0].export_file_path, 'academy/corpus-ingestion/synthesis/stoic-life-diet-eating-as-a-stoic.v1.md');
  assert.ok(rows[0].exported_at);
});

test('--mark-exported skips a draft edited after the files were written', async () => {
  const rows = [draft()];
  const sb = fakeSupabase(rows);
  const { dir, readmePath } = tmpTarget();
  const { pending } = await exportApproved(sb, { dryRun: false, log: () => {}, dir, readmePath, deferStatus: true });

  rows[0].markdown = draftMd + '\nAn edit.\n';
  rows[0].status = 'edited';
  const r = await markExported(sb, pending, () => {});
  assert.deepEqual(r, { marked: 0, skipped: 1 });
  assert.equal(rows[0].status, 'edited');
});

test('the default form still marks the draft exported at once', async () => {
  const rows = [draft()];
  const sb = fakeSupabase(rows);
  const { dir, readmePath } = tmpTarget();
  const r = await exportApproved(sb, { dryRun: false, log: () => {}, dir, readmePath });
  assert.equal(r.exported, 1);
  assert.equal(rows[0].status, 'exported');
});

test('--write-only with nothing approved records an empty list', async () => {
  const sb = fakeSupabase([]);
  const { dir, readmePath } = tmpTarget();
  const r = await exportApproved(sb, { dryRun: false, log: () => {}, dir, readmePath, deferStatus: true });
  assert.deepEqual(r.pending, []);
});
