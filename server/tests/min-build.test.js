// The minimum supported iOS build (GET /api/app/min-build). A wrong floor
// locks people out, so anything unclear reads as 0: no gate. Run with
// `npm test` in server/.
const test = require('node:test');
const assert = require('node:assert/strict');

const { minIosBuildFromEnv } = require('../lib/min-build');

test('a whole number sets the floor', () => {
  assert.equal(minIosBuildFromEnv('101'), 101);
  assert.equal(minIosBuildFromEnv(' 95 '), 95);
});

test('unset, empty or malformed means no gate', () => {
  for (const v of [undefined, null, '', 'abc', '-5', '101.5', '1e3', '9999999']) {
    assert.equal(minIosBuildFromEnv(v), 0, `value ${JSON.stringify(v)}`);
  }
});
