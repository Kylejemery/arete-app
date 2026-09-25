// One-click unsubscribe tokens for Arete email (retention plan R9).
//
// A token is `<userId>.<HMAC-SHA256(userId)>` in base64url, signed with
// EMAIL_UNSUBSCRIBE_SECRET. It carries no expiry on purpose: an unsubscribe
// link in an old email must keep working. The endpoint that consumes it
// only ever sets profiles.email_opt_out to true, so the worst a leaked
// token can do is stop email for that one account.
//
// Shared by lifecycle-email-agent.js (which builds the links) and
// server/index.js (which verifies them at /api/email/unsubscribe).
const crypto = require('crypto');

const DEFAULT_API_URL = 'https://arete-app-production.up.railway.app';

function secret() {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || null;
}

function sign(userId, key) {
  return crypto.createHmac('sha256', key).update(String(userId)).digest('base64url');
}

// Returns null when the secret is not configured, so callers can refuse to
// send email that would carry a broken unsubscribe link.
function makeUnsubscribeToken(userId, key = secret()) {
  if (!key || !userId) return null;
  return `${userId}.${sign(userId, key)}`;
}

// Returns the user id the token was issued for, or null.
function verifyUnsubscribeToken(token, key = secret()) {
  if (!key || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = sign(userId, key);
  if (given.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return /^[0-9a-f-]{36}$/i.test(userId) ? userId : null;
}

function unsubscribeUrl(userId, { apiUrl = process.env.PUBLIC_API_URL || DEFAULT_API_URL, key = secret() } = {}) {
  const token = makeUnsubscribeToken(userId, key);
  if (!token) return null;
  return `${apiUrl.replace(/\/$/, '')}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

module.exports = { makeUnsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl, DEFAULT_API_URL };
