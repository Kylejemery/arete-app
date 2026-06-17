# Post Scheduler (Railway cron trigger)

Direct social platforms (LinkedIn, Bluesky, X) have no native scheduling, so the
admin scheduler enqueues future-dated posts into the `post_queue` table. This
tiny Railway cron service pings the web app every 5 minutes to fire the ones
that are due.

It contains **no posting logic** — `poll.js` just calls the app's
`/api/cron/post-due` route, which holds the platform posters (`lib/social`).
One source of truth, no duplication.

## How it fits together

```
admin /admin  ──schedule future post──▶  post_queue (Supabase, pending)
Railway cron  ──every 5 min──▶  POST /api/cron/post-due  (CRON_SECRET)
  └─ route reads due rows, posts via lib/social, marks sent/failed
```

## Railway setup

1. In the Railway project, **New → GitHub Repo** pointing at this repo.
2. Set the service **Root Directory** to `academy/post-scheduler`. Railway picks
   up `railway.json`:
   - `startCommand: node poll.js`
   - `cronSchedule: */5 * * * *` (every 5 minutes)
   - `restartPolicyType: NEVER`
3. Add the environment variables below.

## Environment variables

| Var | Value |
| --- | --- |
| `SCHEDULER_ENDPOINT` | `https://academy.pursuearete.com/api/cron/post-due` |
| `CRON_SECRET` | A long random string — **must match** `CRON_SECRET` set in Vercel. |

`CRON_SECRET` is the shared secret that authorizes the cron call; set the same
value here and on the Vercel project.
