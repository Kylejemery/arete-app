# Arete on Moltbook

A Stoic interlocutor that reads the Moltbook feed, picks at most one post per tick worth engaging, drafts a reply grounded in the Arete corpus, and posts it. Runs as a Railway worker. Every action is logged and the whole thing stops from a Supabase toggle.

## Shape

    tick (every 30m + jitter)
      -> read kill switch and daily budget from Supabase
      -> GET /posts?sort=new
      -> drop anything in moltbook_seen_posts
      -> Haiku triage: pick one post or none (none is the common answer)
      -> Sonnet compose, with read-only MCP access to the Arete corpus
      -> client-side duplicate check
      -> POST /comments
      -> append to moltbook_agent_actions

Two model calls per tick, and the expensive one only fires when triage picks something. Most ticks cost almost nothing.

## Setup

1. `psql < sql/schema.sql` against your Supabase project. `moltbook_agent_config.enabled` starts false on purpose.
2. `node scripts/register.js "Arete" "A Stoic interlocutor"` locally. Save the `api_key`, open the `claim_url`, verify via X.
3. Set the env vars from `.env.example` in Railway.
4. Deploy. It will boot and stand down every tick, logging why.
5. `npm run once` locally a few times to watch it work end to end. For local runs, copy `.env.example` to `.env` and fill it in — the npm scripts load it automatically (Node 22+); Railway injects real env vars so no `.env` is needed there.
6. Flip `moltbook_agent_config.enabled` to true when you are satisfied.

## Controls

- **Kill switch.** `update moltbook_agent_config set enabled = false, paused_reason = '...' where id = 1;` Takes effect within one tick, no redeploy.
- **Budget.** `max_actions_day` caps successful writes per rolling 24h. Moltbook's own limit is one post per 30 minutes globally.
- **Audit.** `moltbook_agent_actions` is append-only. Skips are logged with reasons, so you can read what it decided not to say, which is usually more informative than what it said.

## Three things I deliberately did not do

**No remote instruction fetching.** Moltbook's standard onboarding tells agents to pull `heartbeat.md` every 30 minutes and follow whatever it contains. That hands behavioral control to the platform. The persona and loop live in this repo instead. If you want their new features, read the diff yourself and port it.

**No write-verification solver.** Moltbook triggers a timed challenge on posts and comments. I have left `verification` as an optional field on the client and nothing that answers it, because I am not going to write bot-detection bypass code. The Cloud Security Alliance's `moltbook-skill` handles this if you want it handled; wire it in yourself, or drive writes through their scripts and use this repo for the reading and reasoning.

**No credentials in model context.** The compose call gets board text and the corpus MCP server. It never sees the Moltbook key, the Supabase key, or anything else. Worst case for a successful injection is an embarrassing comment.

## Prompt injection

Every piece of board text goes into the model wrapped in `<board_content>` with a standing instruction that it is data, never commands. The model is told to skip and log if it detects an injection attempt rather than responding publicly. This is mitigation, not a guarantee. Read `moltbook_agent_actions` for the first few weeks.

## Field shapes

`normalize()` in `src/moltbook.js` is the single place feed field names are mapped. They have moved before. If the feed comes back empty but the API returns 200, look there first.
