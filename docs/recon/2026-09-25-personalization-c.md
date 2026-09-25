# Personalization run C: recon, 2026-09-25

This recon describes what Run C builds on. Decisions are in `docs/decisions/2026-09-25-personalization-c.md`.

## Home screens (additive only)
- **Mobile:** `app/(tabs)/index.tsx` is one ScrollView. From top to bottom it holds the greeting, the yesterday card, the Know Thyself banner, the quote, the check-in pills, the primary CTA, the streak card, and Today's Question, which is the last child.
- **Web:** `web/src/app/page.tsx` (signed in) holds the header with quick-link pills, the yesterday card, the streak row, Today's Question, and the daily quote, which is the last child. Signed-out visitors see a landing page, which is untouched.
- **Where "Your practices" goes:** after the last existing child on each screen. It renders nothing when no practice is pinned.

## The four modules against what exists
| Module | Exists today | Registry tier |
| --- | --- | --- |
| `focus_timer` | Yes: mobile tab `/timer`, web `/focus` | surface_existing (pin a shortcut) |
| `evening_review` | Yes: mobile and web `/evening` | surface_existing (pin a shortcut) |
| `premeditatio` | No | enable_module (new home card) |
| `habit_tracker` | No. Goals and routine tasks exist, a per-day habit tick does not | enable_module (new home card) |

## How the Cabinet can do things today
- **No tool use:** counselor replies are plain text completions. The parallel Cabinet fans out several voices at once, and the single path is used for 1:1 chats.
- **Actions ride end-of-reply markers:** `[[GOAL|...]]` and `[[TASK|...]]` are one-line markers the server strips, records in `cabinet_offers`, and returns as `offer` for a card. The rules live in `server/lib/cabinet-offers.js`, and the three wiring points are in `/api/chat/counselor`.
- **Personal context:** `buildPersonalContext` already knows several things, so Run C gates on them rather than re-deriving them:
  - the session and the user's turn count
  - distress, meaning the 7-day journal flag or distress words in the conversation
  - teen status
  - the thread (`activeCounselorId` is `cabinet` for the group thread)

## Pieces reused
- **Distress in the last 14 days:** `profileExtraction.hasRecentDistressFlag(supabase, userId, 14)` reads `distress_review_queue` and fails closed.
- **Teens:** `profiles.age_band` in (`13_15`, `16_17`).
- **Tier:** `req.areteTier`, set by `resolveUserTier`, takes the values free / premium / pro. The paywall sources are closed unions in `lib/paywall.ts` and `web/src/lib/paywall.ts`.
- **Push:** `expo-server-sdk` is already a server dependency. Tokens are in `user_settings.expo_push_token`, and the broadcast agent shows the message shape.
- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dimensions), as used by `server/lib/canonical-concepts.js`. pgvector is installed, since `rag_corpus` uses it.
- **Haiku:** the extraction model is already used for Know Thyself extraction.
- **Admin:** academy `/admin/*`.
  - **The Email tab:** sits under the "Outward" group in `academy/web/src/app/admin/layout.tsx`.
  - **API routes:** they gate on `ADMIN_EMAIL`.
  - **Server actions:** these are proxied to the Railway server with the admin's bearer token. The server checks `isAdmin`.
- **Tunable limits:** `agent_config (agent_name, config jsonb)` holds these.
- **zod:** not a server dependency. It is added to `server/package.json`, and the registry is validated server-side.
- **Measurement:** `measured_profiles` excludes admin and internal accounts (Run B).
