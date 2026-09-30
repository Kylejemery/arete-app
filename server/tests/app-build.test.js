// The app build recorded from the user agent (profiles.last_app_build), so
// installs too old to call the current API can be found. Run with `npm test`
// in server/.
const test = require('node:test');
const assert = require('node:assert/strict');

const { createEventLog, appBuildFromUserAgent } = require('../lib/events');

test('reads the build number from the iOS app user agent', () => {
  assert.equal(appBuildFromUserAgent('Arete/94 CFNetwork/3860.700.1 Darwin/25.6.0'), 94);
  assert.equal(appBuildFromUserAgent('Arete/101 CFNetwork/3896.100.1.2.1 Darwin/27.0.0'), 101);
  assert.equal(appBuildFromUserAgent('Arete/7'), 7);
});

test('anything that is not the app has no build', () => {
  assert.equal(appBuildFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), null);
  assert.equal(appBuildFromUserAgent('node'), null);
  assert.equal(appBuildFromUserAgent('Arete/abc CFNetwork/1'), null);
  assert.equal(appBuildFromUserAgent('NotArete/94 CFNetwork/1'), null);
  assert.equal(appBuildFromUserAgent(''), null);
  assert.equal(appBuildFromUserAgent(undefined), null);
});

function fakeSupabase() {
  const writes = [];
  return {
    writes,
    from(table) {
      return {
        update(values) {
          return {
            eq(col, id) {
              writes.push({ table, values, col, id });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
}

test('stamps the build on the profile, once per build per hour', () => {
  const sb = fakeSupabase();
  const log = createEventLog(sb);
  log.touchAppBuild('u1', 94);
  log.touchAppBuild('u1', 94);
  assert.equal(sb.writes.length, 1);
  assert.deepEqual(
    { table: sb.writes[0].table, build: sb.writes[0].values.last_app_build, col: sb.writes[0].col, id: sb.writes[0].id },
    { table: 'profiles', build: 94, col: 'id', id: 'u1' },
  );
  assert.ok(sb.writes[0].values.last_app_build_at);
});

test('a new build is written at once, not after the hour', () => {
  const sb = fakeSupabase();
  const log = createEventLog(sb);
  log.touchAppBuild('u1', 94);
  log.touchAppBuild('u1', 101);
  assert.deepEqual(sb.writes.map(w => w.values.last_app_build), [94, 101]);
});

test('no user or no build writes nothing', () => {
  const sb = fakeSupabase();
  const log = createEventLog(sb);
  log.touchAppBuild(null, 94);
  log.touchAppBuild('u1', null);
  assert.equal(sb.writes.length, 0);
});
