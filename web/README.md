# Arete Web

The browser version of Arete, the Stoic personal-excellence app. Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Supabase, and Stripe. It shares its database, its Railway API server, and its AI counselors with the Expo mobile app in the repository root.

## What it covers

Feature parity with the mobile app, except iOS-only capabilities (Screen Time monitoring, HealthKit, local notifications), which are deliberately left out. Every screen below reads and writes the same Supabase tables the mobile app uses, so a user can move between phone and browser freely.

- **Home** — greeting, Cabinet quote, routine status, streak, today's counselor question
- **Morning and Evening routines** — checklists from your routine templates, Stoic journal prompt, Cabinet check-ins
- **The Cabinet** — group chat with your counselors, one-to-one counselor conversations with memory, shared sessions (Arete for Couples), message limits by tier
- **Journal, Goals, Beliefs** — entries, quotes with book sources, goals, the three-stage Belief Journal, Daily Dispatch, Weekly Insight
- **Focus** — Pomodoro timer whose sessions the Cabinet can see, reading timer and book tracking
- **Scrolls** — counselor-written scrolls with read tracking
- **Progress** — streak, week and month grids, milestones, reading stats, Weekly Review, Portrait
- **The Library** — the full primary-source reading room with marginalia, the Symposium, the Observatory
- **Know Thyself, Settings, Upgrade** — profile, preferences, Stripe subscriptions, account deletion

`docs/web-parity/` in the repository root holds the inventories the port was built from.

## Getting started

```bash
cd web
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

Open http://localhost:3000. Note that the production API server only allows the `pursuearete.com` origins, so local development needs either a local copy of `server/` or a CORS entry for localhost.

## Environment variables

See `.env.example` for the full list with comments. In short: the Railway API base URL, the Supabase URL and anon key, the Supabase service-role key (server only, used by the Stripe webhook and account deletion), the Stripe secret, webhook secret, and price ids, and an optional `NEXT_PUBLIC_DEV_MODE` flag that reveals developer tools.

## Data storage

All user data lives in Supabase. localStorage holds only per-browser conveniences: the daily message counter shown under the composer, focus-session counts, dismissed banners, the reader view preference, and the "Cabinet sees routine completion" toggle.

## Deployment

The app deploys to Vercel from the `web/` directory. `vercel.json` skips the build when nothing under `web/` changed.

## Checks

```bash
npx tsc --noEmit
npx next lint
npm run build
```
