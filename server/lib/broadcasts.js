// server/lib/broadcasts.js
//
// Shared logic for counselor broadcasts — a hand-written message from a
// counselor delivered as a push notification and as a post in the member's
// Cabinet chat. Used by both halves of the feature, which must agree on when
// a broadcast is due and who is speaking:
//
//   - broadcast-delivery-agent.js (hourly cron) sends the push
//   - GET /api/broadcasts/pending (server/index.js) serves the Cabinet post
//
// The Cabinet post is the primary channel: only a minority of members have a
// push token, so the pending sweep must stand on its own.

// cabinet_members carries a mix of counselors.slug values and the short thread
// ids the app used before the counselors table existed ('marcus', 'goggins',
// 'roosevelt' — 42/39/34 rows respectively at the time of writing). Map the
// legacy forms onto real slugs so "whoever is in their cabinet" resolves for
// everyone. 'futureSelf' is deliberately absent: the Future Self is not a
// counselor and never speaks a broadcast.
const LEGACY_CABINET_SLUGS = {
  marcus: 'marcus-aurelius',
  goggins: 'david-goggins',
  roosevelt: 'theodore-roosevelt',
  frankl: 'viktor-frankl',
};

/** Current hour (0-23) in an IANA timezone, or null if the zone is invalid. */
function localHourIn(timezone) {
  try {
    return parseInt(
      new Date().toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }),
      10
    );
  } catch {
    return null;
  }
}

/** Today's calendar date (YYYY-MM-DD) in an IANA timezone, or null. */
function localDateIn(timezone) {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  } catch {
    return null;
  }
}

const DEFAULT_TIMEZONE = 'America/New_York';

/**
 * Is this broadcast due for a member in `timezone` right now?
 *
 * Due means: their local calendar day has reached send_date, and on send_date
 * itself their local clock has reached send_hour. A NULL send_hour means "as
 * soon as possible". The comparison is >= rather than == so a member who was
 * offline at the hour still receives it later the same day — a broadcast is
 * owed until it is delivered, unlike a dispatch which is stale by evening.
 */
function isDue(broadcast, timezone) {
  if (!broadcast?.send_date) return false;
  const zone = timezone || DEFAULT_TIMEZONE;
  const today = localDateIn(zone) || localDateIn(DEFAULT_TIMEZONE);
  if (!today) return false;
  if (today < broadcast.send_date) return false;
  if (today > broadcast.send_date) return true;
  if (broadcast.send_hour === null || broadcast.send_hour === undefined) return true;
  const hour = localHourIn(zone);
  if (hour === null) return true; // invalid zone, right day — don't hold it back
  return hour >= broadcast.send_hour;
}

/**
 * Which counselor speaks this broadcast to this member. A pinned
 * counselor_slug speaks to everyone; NULL means the first counselor in the
 * member's own cabinet that resolves to a real counselor, falling back to
 * fallback_counselor_slug (Marcus by default) for a cabinet of legacy or
 * removed slugs.
 *
 * `counselorsBySlug` is a { slug: name } map of the counselors table.
 */
function resolveSpeaker(broadcast, cabinetMembers, counselorsBySlug) {
  const nameOf = slug => (slug && counselorsBySlug[slug] ? { slug, name: counselorsBySlug[slug] } : null);

  if (broadcast.counselor_slug) {
    const pinned = nameOf(broadcast.counselor_slug);
    if (pinned) return pinned;
  } else if (Array.isArray(cabinetMembers)) {
    for (const member of cabinetMembers) {
      if (typeof member !== 'string') continue;
      const hit = nameOf(LEGACY_CABINET_SLUGS[member] || member);
      if (hit) return hit;
    }
  }
  return nameOf(broadcast.fallback_counselor_slug) || nameOf('marcus-aurelius') || { slug: null, name: 'The Cabinet' };
}

/** { slug: name } for every counselor, for resolveSpeaker(). */
async function loadCounselorNames(supabase) {
  const { data } = await supabase.from('counselors').select('slug, name');
  const map = {};
  for (const c of data || []) map[c.slug] = c.name;
  return map;
}

module.exports = {
  LEGACY_CABINET_SLUGS,
  DEFAULT_TIMEZONE,
  localHourIn,
  localDateIn,
  isDue,
  resolveSpeaker,
  loadCounselorNames,
};
