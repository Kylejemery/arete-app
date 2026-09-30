// Product event log (retention plan R0), server side.
//
// createEventLog(supabase) returns:
//   logEvent(userId, event, props, { platform, appVersion })  fire and forget
//   platformFromRequest(req)   'web' | 'mobile' | an explicit x-arete-platform
//   touchLastActive(userId)    stamps user_settings.last_active_at, at most
//                              once an hour per user
//   touchAppBuild(userId, b)   stamps profiles.last_app_build (the iOS build
//                              number) when it changes, else at most hourly
//   lastActiveMiddleware       Express middleware: any request carrying a
//                              Bearer JWT counts as activity, and records the
//                              app build from the user agent. The token is
//                              verified at most once an hour (keyed by a hash
//                              of the token) so this adds no auth round trip
//                              to the hot path; verification runs after the
//                              response is handed off.
//
// Nothing here throws into a request. The supabase client is the service
// role client, so inserts bypass RLS.
const crypto = require('crypto');

const HOUR_MS = 60 * 60 * 1000;

// The iOS app's requests carry "Arete/<build> CFNetwork/..." (CFBundleVersion,
// the EAS build number). Browsers, the web proxy and server jobs carry no
// build, so they return null and never overwrite a recorded one.
function appBuildFromUserAgent(ua) {
  const m = /^Arete\/(\d{1,6})(?:\s|$)/.exec(String(ua || ''));
  return m ? Number(m[1]) : null;
}

function createEventLog(supabase) {
  const lastTouch = new Map();   // userId -> ms of last stamp
  const lastBuild = new Map();   // userId -> { build, at } of last build stamp
  const tokenCache = new Map();  // sha256(token) -> { userId, until }

  function logEvent(userId, event, props = {}, { platform = null, appVersion = null } = {}) {
    if (!userId || !event) return;
    try {
      supabase
        .from('product_events')
        .insert({ user_id: userId, event, props: props || {}, platform, app_version: appVersion })
        .then(({ error }) => {
          if (error) console.error('[events] insert failed:', error.message);
        }, (err) => console.error('[events] insert threw:', err?.message || err));
    } catch (err) {
      console.error('[events] logEvent threw:', err?.message || err);
    }
  }

  function platformFromRequest(req) {
    const explicit = req?.headers?.['x-arete-platform'];
    if (typeof explicit === 'string' && explicit) return explicit.slice(0, 32);
    const ua = String(req?.headers?.['user-agent'] || '');
    // Browsers send a Mozilla/5.0 prefix; the Expo app's fetch does not.
    return /mozilla/i.test(ua) ? 'web' : 'mobile';
  }

  function touchLastActive(userId) {
    if (!userId) return;
    const now = Date.now();
    const last = lastTouch.get(userId) || 0;
    if (now - last < HOUR_MS) return;
    lastTouch.set(userId, now);
    if (lastTouch.size > 20000) {
      for (const [k, t] of lastTouch) if (now - t > HOUR_MS) lastTouch.delete(k);
    }
    try {
      // update, not upsert: a user with no settings row has not started yet,
      // and an upsert would create a bare row under them.
      supabase
        .from('user_settings')
        .update({ last_active_at: new Date(now).toISOString() })
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) console.error('[events] last_active_at update failed:', error.message);
        }, () => {});
    } catch { /* best effort */ }
  }

  // Which build each user last came in on, so old installs can be found and
  // asked to update. Written again at once when the build changes (an update
  // was installed), otherwise at most hourly to keep last_app_build_at fresh.
  function touchAppBuild(userId, build) {
    if (!userId || !Number.isInteger(build)) return;
    const now = Date.now();
    const prev = lastBuild.get(userId);
    if (prev && prev.build === build && now - prev.at < HOUR_MS) return;
    lastBuild.set(userId, { build, at: now });
    if (lastBuild.size > 20000) {
      for (const [k, v] of lastBuild) if (now - v.at > HOUR_MS) lastBuild.delete(k);
    }
    try {
      supabase
        .from('profiles')
        .update({ last_app_build: build, last_app_build_at: new Date(now).toISOString() })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('[events] last_app_build update failed:', error.message);
        }, () => {});
    } catch { /* best effort */ }
  }

  function lastActiveMiddleware(req, res, next) {
    next();
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) return;
      const build = appBuildFromUserAgent(req.headers['user-agent']);
      const key = crypto.createHash('sha256').update(token).digest('hex');
      const now = Date.now();
      const cached = tokenCache.get(key);
      if (cached && cached.until > now) {
        touchLastActive(cached.userId);
        touchAppBuild(cached.userId, build);
        return;
      }
      // Mark before the async verify so a burst of requests verifies once.
      tokenCache.set(key, { userId: cached?.userId || null, until: now + HOUR_MS });
      if (tokenCache.size > 20000) {
        for (const [k, v] of tokenCache) if (v.until <= now) tokenCache.delete(k);
      }
      supabase.auth.getUser(token).then(({ data, error }) => {
        const userId = !error && data?.user ? data.user.id : null;
        if (!userId) { tokenCache.delete(key); return; }
        tokenCache.set(key, { userId, until: now + HOUR_MS });
        touchLastActive(userId);
        touchAppBuild(userId, build);
      }, () => tokenCache.delete(key));
    } catch { /* never affect the request */ }
  }

  return { logEvent, platformFromRequest, touchLastActive, touchAppBuild, lastActiveMiddleware };
}

module.exports = { createEventLog, appBuildFromUserAgent };
