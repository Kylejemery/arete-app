// server/lifecycle-email-agent.js
//
// Lifecycle emails (retention plan R9). Three one-time emails per member,
// sent through Resend, chosen by where the member is in their first week:
//
//   welcome           in the first hours after the account is created
//   day_two           the morning after the first check in, only when the
//                     member has not checked in again yet. The subject is
//                     the counselor's follow up question from that first
//                     day (check_ins.followup_line, written by R8).
//   day_five_insight  five to seven days after the first check in, only
//                     once a weekly journal analysis exists for the member.
//
// Each (user, kind) is recorded once in email_sends, either as sent or as
// skipped when the window closed without a send, so nobody gets the same
// email twice and closed windows are never looked at again. Members who
// signed up before this agent existed are never emailed retroactively:
// the welcome window is a few hours and the other two are tied to a first
// check in that happened this week.
//
// Opt out is profiles.email_opt_out, shared with the admin Email tab. Every
// email carries a one-click unsubscribe link (GET or POST
// /api/email/unsubscribe on the API server) plus the List-Unsubscribe
// headers, so mail clients can show their own unsubscribe button.
//
// Content rule: the only member content that ever appears in an email is
// the member's own intention line for their first day and the counselor's
// follow up question about it. Journal entries, Cabinet conversations, and
// the insight text are never quoted. The day five email only says that an
// insight exists.
//
// Railway cron: 0 * * * * (every hour). Env: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_UNSUBSCRIBE_SECRET.
// Optional: LIFECYCLE_FROM_EMAIL (default Arete <noreply@pursuearete.com>),
// LIFECYCLE_REPLY_TO (default CONTACT_TO_EMAIL, then support@pursuearete.com),
// PUBLIC_API_URL (for the unsubscribe link), LIFECYCLE_ONLY_USER (restrict a
// live run to one user id, for a tester account).
// Dry run: LIFECYCLE_DRY_RUN=1 (no email, no writes; prints user id and kind).

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { unsubscribeUrl } = require('./lib/email-unsubscribe');

const WEB_APP_URL = process.env.WEB_APP_URL || 'https://app.pursuearete.com';
const FROM_EMAIL = process.env.LIFECYCLE_FROM_EMAIL || process.env.INVITE_FROM_EMAIL || 'Arete <noreply@pursuearete.com>';
const REPLY_TO = process.env.LIFECYCLE_REPLY_TO || process.env.CONTACT_TO_EMAIL || 'support@pursuearete.com';
const DEFAULT_TIMEZONE = 'America/New_York';

// welcome: the account must be this young. The cron runs hourly, so in
// normal operation the email lands within an hour of signup; the window is
// wider only so a missed run still sends it the same morning.
const WELCOME_WINDOW_HOURS = 6;
// day_two and day_five_insight go out in the member's own daytime.
const SEND_HOUR_START = 8;
const SEND_HOUR_END = 20;
// day_five_insight: days after the first check in.
const INSIGHT_DAY_MIN = 5;
const INSIGHT_DAY_MAX = 7;
// How far back to look for check ins when finding members in their first
// week. Anyone whose first check in is older than this has no email due.
const CHECKIN_LOOKBACK_DAYS = INSIGHT_DAY_MAX + 2;

const KINDS = ['welcome', 'day_two', 'day_five_insight'];

const FALLBACK_COUNSELOR_NAMES = {
  marcus: 'Marcus Aurelius',
  epictetus: 'Epictetus',
  seneca: 'Seneca',
};

// ─── Time helpers (same shape as dispatch-delivery-agent) ────────────────

function localHourIn(timezone, now = new Date()) {
  try {
    return parseInt(
      now.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }),
      10
    ) % 24;
  } catch {
    return null;
  }
}

function localDateIn(timezone, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const get = (t) => parts.find(p => p.type === t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return null;
  }
}

function addDays(date, n) {
  return new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

// ─── Decisions (pure, exported for tests) ───────────────────────────────

// welcome: send while the account is younger than the window. Older
// accounts are simply never welcomed by email.
function decideWelcome({ createdAt, now }) {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return { action: 'skip', reason: 'window_passed' };
  const ageMs = now.getTime() - created;
  if (ageMs < 0) return { action: 'wait' };
  if (ageMs > WELCOME_WINDOW_HOURS * 3600000) return { action: 'skip', reason: 'window_passed' };
  return { action: 'send' };
}

// day_two: the local day after the first check in, in daytime hours, and
// only if the member has not checked in again today.
function decideDayTwo({ firstCheckinDate, checkedInToday, localDate, localHour }) {
  const target = addDays(firstCheckinDate, 1);
  if (localDate < target) return { action: 'wait' };
  if (localDate > target) return { action: 'skip', reason: 'window_passed' };
  if (checkedInToday) return { action: 'skip', reason: 'checked_in' };
  if (localHour < SEND_HOUR_START || localHour > SEND_HOUR_END) return { action: 'wait' };
  return { action: 'send' };
}

// day_five_insight: days five to seven after the first check in, in
// daytime hours, once an insight exists. With no insight by day seven the
// window closes and nothing is sent.
function decideDayFive({ firstCheckinDate, hasInsight, localDate, localHour }) {
  const days = daysBetween(firstCheckinDate, localDate);
  if (days < INSIGHT_DAY_MIN) return { action: 'wait' };
  if (days > INSIGHT_DAY_MAX) return { action: 'skip', reason: 'window_passed' };
  if (!hasInsight) return { action: 'wait' };
  if (localHour < SEND_HOUR_START || localHour > SEND_HOUR_END) return { action: 'wait' };
  return { action: 'send' };
}

// ─── Templates ──────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Member and counselor lines are shown as written, apart from the house
// rule against dashes in anything Arete sends.
function cleanLine(s) {
  return String(s || '').replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim();
}

function layout({ paragraphs, buttonLabel, buttonUrl, footer, unsubscribe }) {
  const body = paragraphs.map(p => `<p style="margin:0 0 16px;">${p}</p>`).join('\n');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a2e;line-height:1.55;max-width:560px;margin:0 auto;padding:24px 16px;">
  <p style="font-family:Georgia,serif;font-size:22px;margin:0 0 20px;color:#1a1a2e;">Arete</p>
  ${body}
  <p style="margin:24px 0;"><a href="${buttonUrl}" style="display:inline-block;background:#c9a84c;color:#1a1a2e;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">${buttonLabel}</a></p>
  <p style="color:#666;font-size:13px;margin:24px 0 0;">${footer}</p>
  <p style="color:#888;font-size:12px;margin:8px 0 0;">Reply to this email to reach a person. <a href="${unsubscribe}" style="color:#8a6d1f;">Unsubscribe from Arete email</a>.</p>
</div>`;
}

// Returns { subject, text, html }. ctx: { unsubscribe, intention,
// followupLine, counselorName }.
function buildEmail(kind, ctx) {
  const unsubscribe = ctx.unsubscribe;
  if (kind === 'welcome') {
    const url = `${WEB_APP_URL}/morning?from=email_welcome`;
    const para = 'You have a Cabinet now. Your counselors are waiting to hear what you intend to do with today. The whole practice takes two minutes each morning: set one intention, hear what they make of it, and come back tonight to close the day with them. It starts with one check in.';
    const footer = 'You are receiving this because you created an Arete account.';
    return {
      subject: 'Your Cabinet is waiting.',
      text: `${para}\n\nDo your first check in: ${url}\n\n${footer}\nUnsubscribe from Arete email: ${unsubscribe}`,
      html: layout({ paragraphs: [escapeHtml(para)], buttonLabel: 'Do your first check in.', buttonUrl: url, footer: escapeHtml(footer), unsubscribe }),
    };
  }

  if (kind === 'day_two') {
    const url = `${WEB_APP_URL}/cabinet?from=email_day_two`;
    const followup = cleanLine(ctx.followupLine);
    const intention = cleanLine(ctx.intention);
    const who = ctx.counselorName || 'Your Cabinet';
    const subject = followup || 'Your Cabinet has a question for you.';
    const paragraphsText = [];
    const paragraphsHtml = [];
    if (intention) {
      paragraphsText.push(`Yesterday you set out to do this: "${intention}"`);
      paragraphsHtml.push(`Yesterday you set out to do this: <em>&ldquo;${escapeHtml(intention)}&rdquo;</em>`);
    }
    if (followup) {
      paragraphsText.push(`${who} left you a question about it: ${followup}`);
      paragraphsHtml.push(`${escapeHtml(who)} left you a question about it: <strong>${escapeHtml(followup)}</strong>`);
    } else {
      paragraphsText.push(`${who} wants to know how it went.`);
      paragraphsHtml.push(`${escapeHtml(who)} wants to know how it went.`);
    }
    const closing = 'One line back is enough. The practice is the return, not the streak.';
    paragraphsText.push(closing);
    paragraphsHtml.push(escapeHtml(closing));
    const footer = 'You are receiving this because you checked in with your Cabinet yesterday.';
    return {
      subject,
      text: `${paragraphsText.join('\n\n')}\n\nAnswer: ${url}\n\n${footer}\nUnsubscribe from Arete email: ${unsubscribe}`,
      html: layout({ paragraphs: paragraphsHtml, buttonLabel: 'Answer.', buttonUrl: url, footer: escapeHtml(footer), unsubscribe }),
    };
  }

  if (kind === 'day_five_insight') {
    const url = `${WEB_APP_URL}/journal?from=email_day_five_insight`;
    const para1 = 'After a week of check ins, your Cabinet has written its first reading of you: the theme that keeps returning in what you tell them, and what they make of it.';
    const para2 = 'It is waiting in your Journal. It is short, and it is only for you.';
    const footer = 'You are receiving this because you have been checking in with your Cabinet this week.';
    return {
      subject: 'Your counselors noticed a pattern in your week.',
      text: `${para1}\n\n${para2}\n\nRead what they noticed: ${url}\n\n${footer}\nUnsubscribe from Arete email: ${unsubscribe}`,
      html: layout({ paragraphs: [escapeHtml(para1), escapeHtml(para2)], buttonLabel: 'Read what they noticed.', buttonUrl: url, footer: escapeHtml(footer), unsubscribe }),
    };
  }

  throw new Error(`Unknown email kind: ${kind}`);
}

// ─── Data access ────────────────────────────────────────────────────────

// PostgREST caps a select at 1000 rows; page through with range().
async function fetchAll(makeQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

// The plan for one run: which emails are due, and which (user, kind) pairs
// have closed without a send. Pure apart from the supabase reads it is
// handed, so it can run against fixtures.
async function planRun({ supabase, now, onlyUser = null }) {
  const profiles = await fetchAll(() => supabase
    .from('profiles')
    .select('id, email, created_at, email_opt_out, age_band, locked_at')
    .order('id'));
  const sends = await fetchAll(() => supabase
    .from('email_sends')
    .select('user_id, kind')
    .order('id'));
  const settings = await fetchAll(() => supabase
    .from('user_settings')
    .select('user_id, timezone')
    .order('user_id'));

  const recorded = new Map(); // userId -> Set(kind)
  for (const s of sends) {
    if (!recorded.has(s.user_id)) recorded.set(s.user_id, new Set());
    recorded.get(s.user_id).add(s.kind);
  }
  const tzFor = new Map(settings.map(s => [s.user_id, s.timezone || DEFAULT_TIMEZONE]));
  const profileFor = new Map(profiles.map(p => [p.id, p]));

  const has = (userId, kind) => recorded.get(userId)?.has(kind) === true;
  // Run B, Part B5: no marketing email to teens (13-17), under-13 or
  // locked accounts.
  const eligible = (p) => p && !p.email_opt_out && typeof p.email === 'string' && p.email.includes('@')
    && !['under_13', '13_15', '16_17'].includes(p.age_band) && !p.locked_at
    && (!onlyUser || p.id === onlyUser);

  const due = [];    // { userId, email, kind, ctx }
  const closed = []; // { userId, kind, reason }

  // welcome
  for (const p of profiles) {
    if (!eligible(p) || has(p.id, 'welcome')) continue;
    const d = decideWelcome({ createdAt: p.created_at, now });
    if (d.action === 'send') due.push({ userId: p.id, email: p.email, kind: 'welcome', ctx: {} });
    // A passed welcome window is not recorded: the profile's age already
    // excludes it on every future run, and writing a row per old member
    // would just be noise.
  }

  // Members with a completed check in this week: the only ones who can be
  // in their first week. Their first ever check in is looked up per member.
  const lookbackFrom = addDays(now.toISOString().slice(0, 10), -CHECKIN_LOOKBACK_DAYS);
  const recent = await fetchAll(() => supabase
    .from('check_ins')
    .select('user_id, check_in_date, morning_done, evening_done')
    .gte('check_in_date', lookbackFrom)
    .or('morning_done.eq.true,evening_done.eq.true')
    .order('id'));
  const recentByUser = new Map();
  for (const r of recent) {
    if (!recentByUser.has(r.user_id)) recentByUser.set(r.user_id, new Set());
    recentByUser.get(r.user_id).add(r.check_in_date);
  }

  for (const [userId, dates] of recentByUser) {
    const p = profileFor.get(userId);
    if (!eligible(p)) continue;
    const needDayTwo = !has(userId, 'day_two');
    const needDayFive = !has(userId, 'day_five_insight');
    if (!needDayTwo && !needDayFive) continue;

    const { data: first, error } = await supabase
      .from('check_ins')
      .select('check_in_date, intention, followup_line, followup_counselor')
      .eq('user_id', userId)
      .or('morning_done.eq.true,evening_done.eq.true')
      .order('check_in_date', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!first) continue;

    const tz = tzFor.get(userId) || DEFAULT_TIMEZONE;
    const localDate = localDateIn(tz, now) || localDateIn(DEFAULT_TIMEZONE, now);
    const localHour = localHourIn(tz, now) ?? localHourIn(DEFAULT_TIMEZONE, now);

    if (needDayTwo) {
      const d = decideDayTwo({
        firstCheckinDate: first.check_in_date,
        checkedInToday: dates.has(localDate),
        localDate, localHour,
      });
      if (d.action === 'send') {
        due.push({
          userId, email: p.email, kind: 'day_two',
          ctx: { intention: first.intention, followupLine: first.followup_line, counselorSlug: first.followup_counselor },
        });
      } else if (d.action === 'skip') {
        closed.push({ userId, kind: 'day_two', reason: d.reason });
      }
    }

    if (needDayFive) {
      const days = daysBetween(first.check_in_date, localDate);
      let hasInsight = false;
      if (days >= INSIGHT_DAY_MIN && days <= INSIGHT_DAY_MAX) {
        const { data: insight, error: iErr } = await supabase
          .from('journal_analysis')
          .select('id')
          .eq('user_id', userId)
          .eq('distress_flagged', false)
          .limit(1);
        if (iErr) throw new Error(iErr.message);
        hasInsight = (insight || []).length > 0;
      }
      const d = decideDayFive({ firstCheckinDate: first.check_in_date, hasInsight, localDate, localHour });
      if (d.action === 'send') {
        due.push({ userId, email: p.email, kind: 'day_five_insight', ctx: {} });
      } else if (d.action === 'skip') {
        closed.push({ userId, kind: 'day_five_insight', reason: d.reason });
      }
    }
  }

  return { due, closed };
}

async function counselorNames(supabase) {
  const names = { ...FALLBACK_COUNSELOR_NAMES };
  try {
    const { data } = await supabase.from('counselors').select('slug, name');
    for (const c of data || []) if (c.slug && c.name) names[c.slug] = c.name;
  } catch { /* fallback names */ }
  return names;
}

// ─── Run ────────────────────────────────────────────────────────────────

async function runLifecycleEmails({
  now = new Date(),
  dryRun = process.env.LIFECYCLE_DRY_RUN === '1',
  onlyUser = process.env.LIFECYCLE_ONLY_USER || null,
  supabase = null,
  resend = null,
} = {}) {
  console.log(`[lifecycle-email] ${dryRun ? 'DRY RUN ' : ''}${now.toISOString()}${onlyUser ? ` (only ${onlyUser})` : ''}`);

  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  if (!dryRun) {
    if (!process.env.EMAIL_UNSUBSCRIBE_SECRET) {
      throw new Error('EMAIL_UNSUBSCRIBE_SECRET is required: every email must carry a working unsubscribe link');
    }
    if (!resend) {
      if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required');
      resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  const { due, closed } = await planRun({ supabase, now, onlyUser });
  console.log(`[lifecycle-email] due: ${due.length}, windows closed: ${closed.length}`);

  if (dryRun) {
    for (const d of due) console.log(`  would send ${d.kind} to user ${d.userId}`);
    for (const c of closed) console.log(`  would close ${c.kind} for user ${c.userId} (${c.reason})`);
    return { due, closed, sent: 0, failed: 0 };
  }

  const names = await counselorNames(supabase);
  let sent = 0, failed = 0;

  for (const d of due) {
    const unsubscribe = unsubscribeUrl(d.userId);
    const email = buildEmail(d.kind, {
      ...d.ctx,
      unsubscribe,
      counselorName: d.ctx.counselorSlug ? (names[d.ctx.counselorSlug] || null) : null,
    });
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: d.email,
        replyTo: REPLY_TO,
        subject: email.subject,
        text: email.text,
        html: email.html,
        headers: {
          'List-Unsubscribe': `<${unsubscribe}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      if (error) throw new Error(error.message || String(error));
      const { error: insErr } = await supabase
        .from('email_sends')
        .insert({ user_id: d.userId, kind: d.kind, status: 'sent', resend_id: data?.id || null });
      if (insErr) console.error(`[lifecycle-email] ledger insert failed for ${d.userId} ${d.kind}: ${insErr.message}`);
      supabase.from('product_events')
        .insert({ user_id: d.userId, event: 'email_sent', props: { kind: d.kind }, platform: 'email' })
        .then(({ error: evErr }) => { if (evErr) console.error('[lifecycle-email] event insert failed:', evErr.message); }, () => {});
      sent += 1;
      console.log(`  sent ${d.kind} to user ${d.userId}`);
    } catch (err) {
      failed += 1;
      console.error(`  failed ${d.kind} for user ${d.userId}: ${err.message || err}`);
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  for (const c of closed) {
    const { error } = await supabase
      .from('email_sends')
      .insert({ user_id: c.userId, kind: c.kind, status: 'skipped', reason: c.reason });
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.error(`[lifecycle-email] skip insert failed for ${c.userId} ${c.kind}: ${error.message}`);
    }
  }

  console.log(`[lifecycle-email] sent: ${sent}, failed: ${failed}, closed: ${closed.length}`);
  return { due, closed, sent, failed };
}

module.exports = {
  runLifecycleEmails, planRun, buildEmail, decideWelcome, decideDayTwo, decideDayFive,
  localHourIn, localDateIn, addDays, daysBetween, cleanLine,
  KINDS, WELCOME_WINDOW_HOURS, SEND_HOUR_START, SEND_HOUR_END, INSIGHT_DAY_MIN, INSIGHT_DAY_MAX,
};

if (require.main === module) {
  runLifecycleEmails().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
