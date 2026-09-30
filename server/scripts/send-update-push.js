// One-off: ask users still on an old iOS build to update from the App Store.
//
// Build 94 (v1.4.1) sends no Authorization header to /api/onboard-web and no
// over-the-air update can reach it (fingerprint runtime policy), so its users
// get errors the app cannot explain. Build 101 is live in the store. Approved
// by Kyle on 2026-09-30, recipients and wording included.
//
// Recipients: every account with a push token that is not admin or internal
// and has not been seen on a current build, meaning profiles.last_app_build is
// unset or below MIN_CURRENT_BUILD, and no product_events row from the iOS
// app (build 94 predates event logging, so any iOS event means a newer build).
// There are no Android builds, so every push token is an iPhone.
//
// Dry run by default: prints the count and the recipients' emails. Sending
// needs --send, and a network that can reach exp.host.
//
//   node scripts/send-update-push.js           # dry run
//   node scripts/send-update-push.js --send    # send once
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server/.env).
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Expo } = require('expo-server-sdk');

const MIN_CURRENT_BUILD = 101;
const TITLE = 'A new version of Arete';
const BODY = 'The version on your phone is out of date, and some of it no longer works, the Future Self conversation among them. Update from the App Store to continue.';
// No seedMessage, counselorName or route: build 94 neither seeds this into the
// Cabinet thread nor routes the tap anywhere. A tap just opens the app.
const DATA = { type: 'update_required', min_build: MIN_CURRENT_BUILD };

async function main() {
  const send = process.argv.includes('--send');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: settings, error: sErr } = await supabase
    .from('user_settings')
    .select('user_id, expo_push_token')
    .not('expo_push_token', 'is', null);
  if (sErr) throw new Error(`user_settings: ${sErr.message}`);

  const ids = settings.map(s => s.user_id);
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, is_admin, is_internal, last_app_build')
    .in('id', ids);
  if (pErr) throw new Error(`profiles: ${pErr.message}`);

  const { data: events, error: eErr } = await supabase
    .from('product_events')
    .select('user_id')
    .eq('platform', 'ios')
    .not('app_version', 'is', null)
    .in('user_id', ids);
  if (eErr) throw new Error(`product_events: ${eErr.message}`);
  const onNewerBuild = new Set(events.map(e => e.user_id));

  const profileById = new Map(profiles.map(p => [p.id, p]));
  const seenTokens = new Set();
  const recipients = [];
  for (const s of settings) {
    const p = profileById.get(s.user_id);
    if (!p || p.is_admin || p.is_internal) continue;
    if (p.last_app_build != null && p.last_app_build >= MIN_CURRENT_BUILD) continue;
    if (onNewerBuild.has(s.user_id)) continue;
    if (!Expo.isExpoPushToken(s.expo_push_token) || seenTokens.has(s.expo_push_token)) continue;
    seenTokens.add(s.expo_push_token);
    recipients.push({ email: p.email, token: s.expo_push_token });
  }

  recipients.sort((a, b) => String(a.email).localeCompare(String(b.email)));
  console.log(`${recipients.length} recipient(s):`);
  for (const r of recipients) console.log(`  ${r.email}`);
  if (!send) {
    console.log('\nDry run. Nothing sent. Add --send to send.');
    return;
  }

  const expo = new Expo();
  const messages = recipients.map(r => ({ to: r.token, title: TITLE, body: BODY, data: DATA, sound: 'default' }));
  let ok = 0;
  const failed = [];
  // Sent once. A chunk that errors is reported, not retried: a retry after an
  // ambiguous failure could deliver the same notice twice.
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((t, i) => {
        if (t.status === 'ok') ok++;
        else failed.push({ email: recipients[messages.indexOf(chunk[i])].email, error: t.details?.error || t.message });
      });
    } catch (err) {
      for (const m of chunk) failed.push({ email: recipients[messages.indexOf(m)].email, error: err.message });
    }
  }
  console.log(`\nSent: ${ok} accepted by Expo, ${failed.length} failed.`);
  for (const f of failed) console.log(`  ${f.email}: ${f.error}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
