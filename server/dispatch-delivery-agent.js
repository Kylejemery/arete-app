// server/dispatch-delivery-agent.js
//
// Daily Dispatch Agent (delivery half). Runs every hour on the hour. Finds the
// users whose configured local dispatch hour (default 7 AM) falls within the
// current hour in their own timezone, and sends them today's dispatch as a push
// notification teaser. Tapping it opens the full dispatch in-app.
//
// Generation (dispatch-generation-agent.js, 10:00 UTC) and delivery are
// decoupled: this job is cheap, idempotent per-user (pending -> sent/failed),
// and safe to run hourly across all timezones.
//
// Note: dispatch_deliveries has no direct FK to user_settings, so we fetch
// pending deliveries and the matching user_settings rows separately and join in
// JS rather than relying on a PostgREST embedded resource.
//
// Railway cron: 0 * * * * (every hour). Env: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Expo } = require('expo-server-sdk');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Current hour (0-23) in an IANA timezone, or null if the zone is invalid.
function localHourIn(timezone) {
  try {
    return parseInt(
      new Date().toLocaleString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      }),
      10
    );
  } catch {
    return null;
  }
}

async function runDispatchDelivery() {
  const expo = new Expo();
  const now = new Date();
  const currentUtcHour = now.getUTCHours();
  console.log(`=== Dispatch Delivery — UTC hour ${currentUtcHour} — ${now.toISOString()} ===`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }

  // Today's dispatch.
  const dispatchDate = now.toISOString().split('T')[0];
  const { data: dispatch } = await supabase
    .from('daily_dispatches')
    .select('*')
    .eq('dispatch_date', dispatchDate)
    .maybeSingle();
  if (!dispatch) {
    console.log('No dispatch generated for today yet. Exiting.');
    return;
  }

  // Pending deliveries for today's dispatch.
  const { data: pending } = await supabase
    .from('dispatch_deliveries')
    .select('id, user_id')
    .eq('dispatch_id', dispatch.id)
    .eq('status', 'pending');
  if (!pending || pending.length === 0) {
    console.log('No pending deliveries for this dispatch.');
    return;
  }

  // Fetch the matching user_settings (token + timezone + hour) and join in JS.
  const userIds = pending.map(p => p.user_id);
  const { data: settingsRows } = await supabase
    .from('user_settings')
    .select('user_id, expo_push_token, timezone, dispatch_hour')
    .in('user_id', userIds);
  const settingsByUser = {};
  for (const s of settingsRows || []) settingsByUser[s.user_id] = s;

  // Keep deliveries whose user's current local hour matches their dispatch hour.
  const targets = pending.filter(d => {
    const s = settingsByUser[d.user_id];
    if (!s || !s.expo_push_token) return false;
    const timezone = s.timezone || 'America/New_York';
    const dispatchHour = s.dispatch_hour ?? 7;
    const localHour = localHourIn(timezone);
    if (localHour === null) {
      // Invalid timezone — fall back to ET (7 AM ET = 11/12 UTC depending on DST).
      return currentUtcHour === 11 || currentUtcHour === 12;
    }
    return localHour === dispatchHour;
  });

  if (targets.length === 0) {
    console.log(`No users with their dispatch hour in this UTC hour (${currentUtcHour}).`);
    return;
  }
  console.log(`Sending to ${targets.length} user(s)...`);

  // Build Expo messages (only for valid Expo tokens).
  const sendable = targets.filter(d =>
    Expo.isExpoPushToken(settingsByUser[d.user_id]?.expo_push_token)
  );
  const messages = sendable.map(d => ({
    to: settingsByUser[d.user_id].expo_push_token,
    sound: 'default',
    title: `Arete — ${dispatch.title}`,
    body: dispatch.teaser,
    data: {
      type: 'daily_dispatch',
      dispatch_id: dispatch.id,
      dispatch_date: dispatch.dispatch_date,
    },
    channelId: 'daily-dispatch',
  }));

  // Send in chunks (Expo limit: 100 per request). The tickets array is parallel
  // to the chunk, which is parallel to `sendable` — track a global cursor.
  const chunks = expo.chunkPushNotifications(messages);
  let sentCount = 0;
  let failedCount = 0;
  let cursor = 0;
  const failedUserIds = [];

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const delivery = sendable[cursor + i];
        if (ticket.status === 'ok') {
          await supabase
            .from('dispatch_deliveries')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', delivery.id);
          sentCount++;
        } else {
          await supabase
            .from('dispatch_deliveries')
            .update({ status: 'failed', error_message: ticket.message || 'Unknown error' })
            .eq('id', delivery.id);
          failedUserIds.push(delivery.user_id);
          failedCount++;
        }
      }
    } catch (err) {
      console.error('Chunk send error:', err.message);
      // Mark this chunk's deliveries failed so they aren't retried forever.
      for (let i = 0; i < chunk.length; i++) {
        const delivery = sendable[cursor + i];
        if (!delivery) continue;
        await supabase
          .from('dispatch_deliveries')
          .update({ status: 'failed', error_message: err.message?.slice(0, 300) || 'Chunk send error' })
          .eq('id', delivery.id);
        failedUserIds.push(delivery.user_id);
        failedCount++;
      }
    }
    cursor += chunk.length;
    await new Promise(resolve => setTimeout(resolve, 100)); // brief pause between chunks
  }

  // Roll the per-run counts into the dispatch.
  const { data: current } = await supabase
    .from('daily_dispatches')
    .select('delivered_count, failed_count')
    .eq('id', dispatch.id)
    .single();
  await supabase
    .from('daily_dispatches')
    .update({
      delivered_count: (current?.delivered_count || 0) + sentCount,
      failed_count: (current?.failed_count || 0) + failedCount,
      delivery_completed_at: new Date().toISOString(),
    })
    .eq('id', dispatch.id);

  console.log(`✓ Sent: ${sentCount} | Failed: ${failedCount}`);
  if (failedUserIds.length > 0) {
    console.log(`  Failed user IDs: ${failedUserIds.join(', ')}`);
  }
}

module.exports = { runDispatchDelivery, localHourIn };

if (require.main === module) {
  runDispatchDelivery().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
