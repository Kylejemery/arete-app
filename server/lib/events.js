// Product event log (retention plan R0), server side.
//
// createEventLog(supabase) returns:
//   logEvent(userId, event, props, { platform, appVersion })  fire and forget
//   platformFromRequest(req)   'web' | 'mobile' | an explicit x-arete-platform
//   touchLastActive(userId)    stamps user_settings.last_active_at, at most
//                              once an hour per user
//   lastActiveMiddleware       Express middleware: any request carrying a
//                              Bearer JWT counts as activity. The token is
//                              verified at most once an hour (keyed by a hash
//                              of the token) so this adds no auth round trip
//                              to the hot path; verification runs after the
//                              response is handed off.
//
// Nothing here throws into a request. The supabase client is the service
// role client, so inserts bypass RLS.
const crypto = require('crypto');

const HOUR_MS = 60 * 60 * 1000;

function createEventLog(supabase) {
  const lastTouch = new Map();   // userId -> ms of last stamp
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

  function lastActiveMiddleware(req, res, next) {
    next();
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) return;
      const key = crypto.createHash('sha256').update(token).digest('hex');
      const now = Date.now();
      const cached = tokenCache.get(key);
      if (cached && cached.until > now) {
        touchLastActive(cached.userId);
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
      }, () => tokenCache.delete(key));
    } catch { /* never affect the request */ }
  }

  return { logEvent, platformFromRequest, touchLastActive, lastActiveMiddleware };
}

module.exports = { createEventLog };
