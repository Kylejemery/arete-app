// server/dispatch-delivery-agent.js
//
// Daily Dispatch Agent (delivery half). Runs every hour on the hour. Finds the
// users whose configured local dispatch hour (default 7 AM) falls within the
// current hour in their own timezone, and sends each of them the dispatch for
// THEIR local date as a push notification teaser. Tapping it opens the full
// dispatch in-app.
//
// Timezones (retention plan R5). Generation runs at 10:00 UTC and writes one
// row per UTC date. The old agent looked up "today's" dispatch by the UTC
// date at send time, so a 7 AM in Berlin (05:00 UTC) found nothing and a
// 7 AM in Sydney (21:00 UTC the previous day) got the previous UTC day's
// dispatch labelled as such. Now each user's local date picks the dispatch,
// and when no dispatch exists for that date yet, the most recent one this
// user has not been sent is used instead. dispatch_deliveries is UNIQUE on
// (dispatch_id, user_id) and rows are claimed pending -> sending in one
// UPDATE, so nobody can receive the same dispatch twice.
//
// Railway cron: 0 * * * * (every hour). Env: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. Dry run: DISPATCH_DRY_RUN=1 (no push, no
// writes; prints who would get what).

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Expo } = require('expo-server-sdk');

// How far back the fallback may reach: a dispatch older than this is stale
// news, better skipped than delivered late.
const FALLBACK_MAX_AGE_DAYS = 2;
const DEFAULT_TIMEZONE = 'America/New_York';
const DEFAULT_DISPATCH_HOUR = 7;

// Current hour (0-23) in an IANA timezone, or null if the zone is invalid.
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

// Calendar date (YYYY-MM-DD) in an IANA timezone, or null if invalid.
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

function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

/**
 * Pure planning step, so it can be run against fixtures. Given the users
 * whose local hour is now their dispatch hour, the recent dispatches (newest
 * first), and the set of (dispatch_id, user_id) pairs already sent, returns
 * one { user, dispatch, reason } per user who should receive something.
 */
function planDeliveries({ now, users, dispatches, alreadySent }) {
  const byDate = new Map(dispatches.map(d => [d.dispatch_date, d]));
  const plan = [];
  for (const u of users) {
    const timezone = u.timezone || DEFAULT_TIMEZONE;
    const localDate = localDateIn(timezone, now) || now.toISOString().slice(0, 10);
    const sentKey = (d) => `${d.id}:${u.user_id}`;
    let chosen = byDate.get(localDate);
    let reason = 'local_date';
    if (chosen && alreadySent.has(sentKey(chosen))) { chosen = null; reason = 'already_sent'; }
    if (!chosen && reason !== 'already_sent') {
      // The newest dispatch before the user's local date, if they have not
      // had it. Only that one: reaching further back would hand someone who
      // got yesterday's an older issue this morning, out of order.
      const candidate = dispatches.find(
        d => d.dispatch_date < localDate && daysBetween(d.dispatch_date, localDate) <= FALLBACK_MAX_AGE_DAYS
      );
      if (candidate && !alreadySent.has(sentKey(candidate))) { chosen = candidate; reason = 'fallback_latest_unsent'; }
    }
    if (chosen) plan.push({ user: u, dispatch: chosen, reason, localDate });
  }
  return plan;
}

// The users whose dispatch hour is the current hour in their own timezone.
function usersDueNow(settingsRows, now) {
  const currentUtcHour = now.getUTCHours();
  return (settingsRows || []).filter(s => {
    if (!s.expo_push_token || !Expo.isExpoPushToken(s.expo_push_token)) return false;
    const timezone = s.timezone || DEFAULT_TIMEZONE;
    const dispatchHour = s.dispatch_hour ?? DEFAULT_DISPATCH_HOUR;
    const localHour = localHourIn(timezone, now);
    if (localHour === null) {
      // Invalid timezone: fall back to ET (7 AM ET = 11/12 UTC depending on DST).
      return currentUtcHour === 11 || currentUtcHour === 12;
    }
    return localHour === dispatchHour;
  });
}

async function runDispatchDelivery({ now = new Date(), dryRun = process.env.DISPATCH_DRY_RUN === '1' } = {}) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const expo = new Expo();
  console.log(`=== Dispatch Delivery — UTC hour ${now.getUTCHours()} — ${now.toISOString()}${dryRun ? ' (DRY RUN)' : ''} ===`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }

  // 1. Everyone opted in with a token; keep those due this hour.
  const { data: settingsRows, error: settingsError } = await supabase
    .from('user_settings')
    .select('user_id, expo_push_token, timezone, dispatch_hour')
    .eq('dispatch_enabled', true)
    .not('expo_push_token', 'is', null);
  if (settingsError) { console.error('Could not load user settings:', settingsError.message); return; }
  const due = usersDueNow(settingsRows, now);
  if (due.length === 0) { console.log(`No users with their dispatch hour in this UTC hour (${now.getUTCHours()}).`); return; }

  // 2. Recent dispatches (newest first) and what these users already got.
  const since = new Date(now.getTime() - (FALLBACK_MAX_AGE_DAYS + 1) * 86400000).toISOString().slice(0, 10);
  const { data: dispatches } = await supabase
    .from('daily_dispatches')
    .select('id, dispatch_date, title, teaser')
    .gte('dispatch_date', since)
    .order('dispatch_date', { ascending: false });
  if (!dispatches || dispatches.length === 0) { console.log('No recent dispatch exists. Exiting.'); return; }

  const { data: deliveryRows } = await supabase
    .from('dispatch_deliveries')
    .select('dispatch_id, user_id, status')
    .in('dispatch_id', dispatches.map(d => d.id))
    .in('user_id', due.map(u => u.user_id));
  // Anything past 'pending' counts as had: sending, sent, read, dismissed.
  // 'failed' is also excluded so a bad token is not retried every hour.
  const alreadySent = new Set((deliveryRows || []).filter(r => r.status !== 'pending').map(r => `${r.dispatch_id}:${r.user_id}`));
  const existingPending = new Set((deliveryRows || []).filter(r => r.status === 'pending').map(r => `${r.dispatch_id}:${r.user_id}`));

  const plan = planDeliveries({ now, users: due, dispatches, alreadySent });
  if (plan.length === 0) { console.log(`${due.length} user(s) due, nothing new to send them.`); return; }
  for (const p of plan) {
    console.log(`  ${p.user.user_id} [${p.user.timezone || DEFAULT_TIMEZONE}, local ${p.localDate}] -> ${p.dispatch.dispatch_date} (${p.reason})`);
  }
  if (dryRun) { console.log(`DRY RUN: would send ${plan.length} push(es).`); return plan; }

  // 3. Make sure a pending row exists for every planned pair (the generation
  //    agent pre-creates rows for the UTC date only), then claim them
  //    pending -> sending in one UPDATE. Only rows that flip are sent, so an
  //    overlapping run cannot push the same row twice.
  const missing = plan.filter(p => !existingPending.has(`${p.dispatch.id}:${p.user.user_id}`));
  if (missing.length > 0) {
    const { error: insertError } = await supabase
      .from('dispatch_deliveries')
      .upsert(
        missing.map(p => ({ dispatch_id: p.dispatch.id, user_id: p.user.user_id, status: 'pending' })),
        { onConflict: 'dispatch_id,user_id', ignoreDuplicates: true }
      );
    if (insertError) console.error('Could not create delivery rows:', insertError.message);
  }
  const { data: claimedRows, error: claimError } = await supabase
    .from('dispatch_deliveries')
    .update({ status: 'sending' })
    .in('dispatch_id', [...new Set(plan.map(p => p.dispatch.id))])
    .in('user_id', plan.map(p => p.user.user_id))
    .eq('status', 'pending')
    .select('id, dispatch_id, user_id');
  if (claimError) { console.error('Could not claim deliveries:', claimError.message); return; }
  const claimed = new Map((claimedRows || []).map(r => [`${r.dispatch_id}:${r.user_id}`, r.id]));
  const sendable = plan.filter(p => claimed.has(`${p.dispatch.id}:${p.user.user_id}`));
  if (sendable.length < plan.length) console.log(`${plan.length - sendable.length} delivery(ies) already claimed by another run — skipping.`);
  if (sendable.length === 0) return;
  console.log(`Sending to ${sendable.length} user(s)...`);

  // 4. Send in chunks (Expo limit: 100 per request). Tickets are parallel to
  //    the chunk, which is parallel to `sendable` — track a global cursor.
  const messages = sendable.map(p => ({
    to: p.user.expo_push_token,
    sound: 'default',
    title: `Arete — ${p.dispatch.title}`,
    body: p.dispatch.teaser,
    data: { type: 'daily_dispatch', dispatch_id: p.dispatch.id, dispatch_date: p.dispatch.dispatch_date },
    channelId: 'daily-dispatch',
  }));
  const chunks = expo.chunkPushNotifications(messages);
  const perDispatch = new Map(); // dispatch_id -> { sent, failed }
  const tally = (id, key) => { const t = perDispatch.get(id) || { sent: 0, failed: 0 }; t[key]++; perDispatch.set(id, t); };
  const failedUserIds = [];
  let cursor = 0;
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const p = sendable[cursor + i];
        const rowId = claimed.get(`${p.dispatch.id}:${p.user.user_id}`);
        if (ticket.status === 'ok') {
          await supabase.from('dispatch_deliveries').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', rowId);
          tally(p.dispatch.id, 'sent');
        } else {
          await supabase.from('dispatch_deliveries').update({ status: 'failed', error_message: ticket.message || 'Unknown error' }).eq('id', rowId);
          failedUserIds.push(p.user.user_id);
          tally(p.dispatch.id, 'failed');
        }
      }
    } catch (err) {
      console.error('Chunk send error:', err.message);
      for (let i = 0; i < chunk.length; i++) {
        const p = sendable[cursor + i];
        if (!p) continue;
        const rowId = claimed.get(`${p.dispatch.id}:${p.user.user_id}`);
        await supabase.from('dispatch_deliveries').update({ status: 'failed', error_message: err.message?.slice(0, 300) || 'Chunk send error' }).eq('id', rowId);
        failedUserIds.push(p.user.user_id);
        tally(p.dispatch.id, 'failed');
      }
    }
    cursor += chunk.length;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 5. Roll the per-run counts into each dispatch touched.
  let sentCount = 0, failedCount = 0;
  for (const [dispatchId, t] of perDispatch) {
    sentCount += t.sent; failedCount += t.failed;
    const { data: current } = await supabase.from('daily_dispatches').select('delivered_count, failed_count').eq('id', dispatchId).single();
    await supabase.from('daily_dispatches').update({
      delivered_count: (current?.delivered_count || 0) + t.sent,
      failed_count: (current?.failed_count || 0) + t.failed,
      delivery_completed_at: new Date().toISOString(),
    }).eq('id', dispatchId);
  }
  console.log(`✓ Sent: ${sentCount} | Failed: ${failedCount}`);
  if (failedUserIds.length > 0) console.log(`  Failed user IDs: ${failedUserIds.join(', ')}`);
  return plan;
}

module.exports = { runDispatchDelivery, localHourIn, localDateIn, planDeliveries, usersDueNow, FALLBACK_MAX_AGE_DAYS };

if (require.main === module) {
  runDispatchDelivery().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
