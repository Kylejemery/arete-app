// Counselors a free tier user may talk to. The source of truth is
// FREE_COUNSELOR_SLUGS in lib/db.ts (mobile) and web/src/lib/db.ts (web);
// this is a deliberate duplicate because the Railway build only ships the
// server/ directory. Keep all three in sync when a counselor moves across
// the paywall (Epictetus moved behind it on 2026-08-28).
//
// Future Self is not a paid counselor: it is always present in every Cabinet,
// so both spellings of its slug pass the gate.
const FREE_COUNSELOR_SLUGS = ['marcus', 'goggins', 'roosevelt'];
const FUTURE_SELF_SLUGS = ['futureSelf', 'future-self'];

function isFreeCounselorSlug(slug) {
  return FREE_COUNSELOR_SLUGS.includes(slug) || FUTURE_SELF_SLUGS.includes(slug);
}

module.exports = { FREE_COUNSELOR_SLUGS, FUTURE_SELF_SLUGS, isFreeCounselorSlug };
