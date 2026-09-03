// server/broadcast-delivery-agent.js
//
// Counselor Broadcast delivery — the push half. Runs every hour on the hour
// and sends the notification for any scheduled broadcast whose send hour has
// arrived in the member's own timezone.
//
// This job only nudges. The message itself is delivered by the app, which
// sweeps GET /api/broadcasts/pending on every foreground and seeds the line
// into the member's Cabinet thread (lib/counselorLines.ts). That split is
// deliberate: most members never grant notification permission, and a member
// who swipes a push away without tapping it must still find the message
// waiting in the chat. A member with no usable token is marked 'skipped', not
// 'failed' — they lose the nudge, not the message.
//
// Idempotent per delivery row (pending -> sent/failed/skipped), so it is safe
// to run hourly across every timezone and safe to re-run after a crash.
//
// Railway cron: 0 * * * * (every hour, its own service, `node
// broadcast-delivery-agent.js`). Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Expo } = require('expo-server-sdk');
const {
  DEFAULT_TIMEZONE,
  isDue,
  resolveSpeaker,
  loadCounselorNames,
} = require('./lib/broadcasts');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PUSH_CHUNK_PAUSE_MS = 100;

// A member's local date can run a day ahead of UTC, so look one day past
// today when picking up broadcasts.
function utcDatePlus(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

async function runBroadcastDelivery() {
  const now = new Date();
  console.log(`=== Counselor Broadcast delivery — ${now.toISOString()} ===`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }

  const { data: cfgRow } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'broadcast_agent')
    .maybeSingle();
  const config = cfgRow?.config || {};
  if (config.enabled === false) {
    console.log('broadcast_agent disabled in agent_config. Exiting.');
    return { broadcasts: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const { data: broadcasts } = await supabase
    .from('counselor_broadcasts')
    .select('id, counselor_slug, fallback_counselor_slug, title, push_body, message, route, send_date, send_hour, status, pushed_count, failed_count')
    .in('status', ['scheduled', 'sending'])
    .not('send_date', 'is', null)
    .lte('send_date', utcDatePlus(1))
    .order('send_date', { ascending: true });

  if (!broadcasts || broadcasts.length === 0) {
    console.log('No scheduled broadcasts due. Exiting.');
    return { broadcasts: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const counselorNames = await loadCounselorNames(supabase);
  const expo = new Expo();
  const totals = { broadcasts: 0, sent: 0, failed: 0, skipped: 0 };

  for (const broadcast of broadcasts) {
    const result = await deliverOne(broadcast, { expo, counselorNames, pushEnabled: config.push_enabled !== false });
    totals.broadcasts++;
    totals.sent += result.sent;
    totals.failed += result.failed;
    totals.skipped += result.skipped;
  }

  console.log(`✓ Broadcasts ${totals.broadcasts} | pushed ${totals.sent} | failed ${totals.failed} | skipped ${totals.skipped}`);
  return totals;
}

async function deliverOne(broadcast, { expo, counselorNames, pushEnabled }) {
  const tally = { sent: 0, failed: 0, skipped: 0 };
  console.log(`— "${broadcast.title}" (${broadcast.id}) due ${broadcast.send_date} @ ${broadcast.send_hour ?? 'asap'}`);

  // A membership larger than PostgREST's page cap is delivered across
  // successive hourly runs — every row stays 'pending' until it is actually
  // sent, so nothing is lost, it just takes another hour.
  const { data: pending } = await supabase
    .from('counselor_broadcast_deliveries')
    .select('id, user_id')
    .eq('broadcast_id', broadcast.id)
    .eq('push_status', 'pending');

  if (!pending || pending.length === 0) {
    await closeIfFinished(broadcast);
    return tally;
  }

  // Settings hold the token, the timezone the send hour is measured in, and
  // the cabinet a per-member speaker is drawn from. No FK to join on, so
  // fetch and join in JS (same shape as the dispatch delivery agent).
  const { data: settingsRows } = await supabase
    .from('user_settings')
    .select('user_id, expo_push_token, timezone, cabinet_members')
    .in('user_id', pending.map(p => p.user_id));
  const settingsByUser = {};
  for (const s of settingsRows || []) settingsByUser[s.user_id] = s;

  const due = pending.filter(d =>
    isDue(broadcast, settingsByUser[d.user_id]?.timezone || DEFAULT_TIMEZONE)
  );
  if (due.length === 0) {
    console.log(`  no members at their send hour yet (${pending.length} pending)`);
    return tally;
  }

  await supabase
    .from('counselor_broadcasts')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', broadcast.id)
    .eq('status', 'scheduled');

  // No usable token: the nudge is skipped, the Cabinet post is not. Their
  // delivery row keeps seeded_at NULL, so the pending sweep still owes it.
  const sendable = [];
  const skipped = [];
  for (const delivery of due) {
    const token = settingsByUser[delivery.user_id]?.expo_push_token;
    if (!pushEnabled || !token || !Expo.isExpoPushToken(token)) skipped.push(delivery);
    else sendable.push(delivery);
  }

  if (skipped.length > 0) {
    await supabase
      .from('counselor_broadcast_deliveries')
      .update({ push_status: 'skipped' })
      .in('id', skipped.map(d => d.id));
    tally.skipped += skipped.length;
    console.log(`  ${skipped.length} without a push token — Cabinet post only`);
  }

  const messages = sendable.map(delivery => {
    const settings = settingsByUser[delivery.user_id];
    const speaker = resolveSpeaker(broadcast, settings?.cabinet_members, counselorNames);
    return {
      to: settings.expo_push_token,
      sound: 'default',
      title: speaker.name,
      body: broadcast.push_body,
      // seedMessage + counselorName are what seedFromNotification() needs to
      // turn the notification into a Cabinet post; broadcastId is the dedupe
      // key shared with the pending sweep, so a member who taps the push and
      // one who never sees it both end up with exactly one post.
      data: {
        type: 'counselor_broadcast',
        broadcastId: broadcast.id,
        counselorName: speaker.name,
        seedMessage: broadcast.message,
        route: broadcast.route || '/cabinet',
      },
      channelId: 'counselor-messages',
    };
  });

  // Tickets come back parallel to the chunk, which is parallel to `sendable` —
  // track a global cursor across chunks.
  let cursor = 0;
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const delivery = sendable[cursor + i];
        if (!delivery) continue;
        if (tickets[i].status === 'ok') {
          await supabase
            .from('counselor_broadcast_deliveries')
            .update({ push_status: 'sent', pushed_at: new Date().toISOString() })
            .eq('id', delivery.id);
          tally.sent++;
        } else {
          await supabase
            .from('counselor_broadcast_deliveries')
            .update({ push_status: 'failed', error_message: (tickets[i].message || 'Unknown error').slice(0, 300) })
            .eq('id', delivery.id);
          tally.failed++;
        }
      }
    } catch (err) {
      console.error('  chunk send error:', err.message);
      for (let i = 0; i < chunk.length; i++) {
        const delivery = sendable[cursor + i];
        if (!delivery) continue;
        await supabase
          .from('counselor_broadcast_deliveries')
          .update({ push_status: 'failed', error_message: (err.message || 'Chunk send error').slice(0, 300) })
          .eq('id', delivery.id);
        tally.failed++;
      }
    }
    cursor += chunk.length;
    await new Promise(resolve => setTimeout(resolve, PUSH_CHUNK_PAUSE_MS));
  }

  // Re-read rather than trusting the counts from the top of the run: the admin
  // "run now" trigger and the hourly cron can overlap.
  const { data: current } = await supabase
    .from('counselor_broadcasts')
    .select('pushed_count, failed_count')
    .eq('id', broadcast.id)
    .maybeSingle();
  await supabase
    .from('counselor_broadcasts')
    .update({
      pushed_count: (current?.pushed_count || 0) + tally.sent,
      failed_count: (current?.failed_count || 0) + tally.failed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', broadcast.id);

  await closeIfFinished(broadcast);
  console.log(`  pushed ${tally.sent} | failed ${tally.failed} | skipped ${tally.skipped}`);
  return tally;
}

/**
 * A broadcast is 'sent' once no delivery row is still awaiting a push. The
 * Cabinet posts may still be owed after that — seeded_count is what tracks
 * those, and the pending sweep reads 'sent' broadcasts too.
 */
async function closeIfFinished(broadcast) {
  const { count } = await supabase
    .from('counselor_broadcast_deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('broadcast_id', broadcast.id)
    .eq('push_status', 'pending');
  if ((count ?? 0) > 0) return;
  await supabase
    .from('counselor_broadcasts')
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', broadcast.id)
    .in('status', ['scheduled', 'sending']);
}

module.exports = { runBroadcastDelivery };

if (require.main === module) {
  runBroadcastDelivery()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
