const test = require('node:test');
const assert = require('node:assert');
const { CABINET_MIN_SIMILARITY, aboveSimilarityFloor } = require('../lib/cabinet-retrieval');
const { RESERVED_MIN_SIMILARITY } = require('../lib/author-mentions');

const row = (id, similarity) => ({ id, similarity });

test('the floor is 0.4, the same as the named-author reservation', () => {
  assert.strictEqual(CABINET_MIN_SIMILARITY, 0.4);
  assert.strictEqual(CABINET_MIN_SIMILARITY, RESERVED_MIN_SIMILARITY);
});

test('a conversational turn keeps none of its near-0.3 rows', () => {
  const rows = [row('a', 0.36), row('b', 0.31), row('c', 0.29)];
  assert.deepStrictEqual(aboveSimilarityFloor(rows), []);
});

test('rows at or above the floor are kept in order', () => {
  const rows = [row('a', 0.62), row('b', 0.4), row('c', 0.39), row('d', 0.51)];
  assert.deepStrictEqual(aboveSimilarityFloor(rows).map(r => r.id), ['a', 'b', 'd']);
});

test('rows without a numeric similarity, and non-array input, give nothing', () => {
  assert.deepStrictEqual(aboveSimilarityFloor([{ id: 'x' }, { id: 'y', similarity: '0.9' }, null]), []);
  assert.deepStrictEqual(aboveSimilarityFloor(null), []);
  assert.deepStrictEqual(aboveSimilarityFloor(undefined), []);
});

test('a turn the floor empties logs its best match once, keyed below_floor', () => {
  const { belowFloorLogRow } = require('../lib/cabinet-retrieval');
  const rows = [
    { id: 'a1', similarity: 0.31 },
    { id: 'b2', similarity: 0.36 },
    { id: 'c3', similarity: 0.12 },
  ];
  assert.deepStrictEqual(belowFloorLogRow(rows), { id: 'below_floor:b2', similarity: 0.36 });
});

test('no below_floor row when the floor kept anything, or nothing was scored', () => {
  const { belowFloorLogRow } = require('../lib/cabinet-retrieval');
  assert.strictEqual(belowFloorLogRow([{ id: 'a', similarity: 0.55 }, { id: 'b', similarity: 0.2 }]), null);
  assert.strictEqual(belowFloorLogRow([]), null);
  assert.strictEqual(belowFloorLogRow(null), null);
  assert.strictEqual(belowFloorLogRow([{ id: 'a' }, { similarity: 0.2 }]), null);
});

test('the below_floor key is not a uuid, so logRetrieval stores no chunk_id for it', () => {
  const { belowFloorLogRow } = require('../lib/cabinet-retrieval');
  const row = belowFloorLogRow([{ id: '8c1f2a34-5b6c-4d7e-8f90-a1b2c3d4e5f6', similarity: 0.2 }]);
  assert.ok(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id));
});
