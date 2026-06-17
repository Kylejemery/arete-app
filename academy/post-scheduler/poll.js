// Railway cron trigger for scheduled social posts.
//
// This service does no posting itself — it just pings the Next app's
// /api/cron/post-due route, which holds all the posting logic (lib/social).
// Keeping the logic in one place avoids duplicating the platform posters.
//
// Runs once per cron tick (see railway.json) and exits.

const endpoint = process.env.SCHEDULER_ENDPOINT // e.g. https://academy.pursuearete.com/api/cron/post-due
const secret = process.env.CRON_SECRET

async function run() {
  if (!endpoint || !secret) {
    console.error('Set SCHEDULER_ENDPOINT and CRON_SECRET on this service.')
    process.exit(1)
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = await res.text()
  console.log(`[post-scheduler] ${res.status} ${body}`)
  process.exit(res.ok ? 0 : 1)
}

run().catch(err => {
  console.error('[post-scheduler] failed:', err)
  process.exit(1)
})
