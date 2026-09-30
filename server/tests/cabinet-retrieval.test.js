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
