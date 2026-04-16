# Arete Web

The browser-based companion to the Arete personal excellence app — built with Next.js 15, TypeScript, and Tailwind CSS.

## What is Arete?

Arete is a Stoic personal excellence app featuring:
- **The Cabinet of Invisible Counselors** — AI-powered coaching from Marcus Aurelius, Epictetus, David Goggins, Theodore Roosevelt, and your Future Self
- **Morning & Evening Routines** — structured daily check-ins with your Cabinet
- **Journal** — daily entries, Commonplace Book, and Belief Workshop
- **Focus Timer** — Pomodoro-style work sessions with reading time tracking
- **Progress** — streak tracking, calendar heatmap, and reading stats
- **Know Thyself** — your personal profile that powers Cabinet conversations

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
cd web
npm install
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_BASE_URL
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL of the Railway backend | `https://your-app.railway.app` |

The backend is the same Express server used by the mobile app (`server/` directory). It proxies requests to Anthropic's Claude API.

## How It Connects to the Backend

The web app uses the same Railway backend as the mobile app:
- `POST /api/chat` — sends messages to Claude via the Cabinet counselors

No changes to the existing backend are needed.

## Data Storage

All user data is stored in **localStorage** (same keys as the mobile app's AsyncStorage), so data is browser-local. A future phase will add Supabase for cross-device sync.

## Deployment to Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Set the root directory to `web/`
4. Add the `NEXT_PUBLIC_API_BASE_URL` environment variable
5. Deploy

```bash
# Or use the Vercel CLI
npm i -g vercel
cd web
vercel
```

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- localStorage for data persistence
