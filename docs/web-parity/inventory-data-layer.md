# Arete — Data & AI Layer Inventory (mobile vs. web)

Repo: `/home/user/arete-app`. Mobile = Expo app at repo root (`lib/`, `services/`, `app/`).
Web = Next.js app at `web/` (`web/src/lib/`, `web/src/app/`). Shared backend = Railway
Express server at `server/index.js` + Supabase (`supabase/migrations/`).

---

## 1. Schema summary

### 1a. Core user tables (the ones the two clients actually contend over)

| Table | Key columns | Mobile | Web | Notes |
|---|---|---|---|---|
| `profiles` | `id` (=auth.users.id, PK), `email`, `expo_push_token`, `handle`, `is_admin`, `is_premium`, `tier` (default `'free'`), `subscription_tier` (legacy, dead — never read), `daily_message_count`, `message_count_date`, `streak`, `streak_last_incremented_date`, `know_thyself_complete`, `created_at`, `updated_at` | R/W | R/W | Mobile writes `streak`, `daily_message_count`; web writes `streak` only. Tier/`is_premium` written only by the Stripe webhook + `grant_manual_premium()`. |
| `user_settings` | `id`, `user_id` (unique), `user_name`, `user_goals`, `kt_background`, `kt_identity`, `kt_goals`, `kt_strengths`, `kt_weaknesses`, `kt_patterns`, `kt_major_events`, `kt_life_situation`, `future_self_years` (default 10), `future_self_description`, `feedback_preference`, `app_usage_intent`, `accountability_style`, `recommended_readings` (jsonb), `archetype`, `cabinet_members` (jsonb array of slugs), `counselor_models` (jsonb, **not in migrations**), `morning_tasks`, `evening_tasks` (jsonb), `timezone`, `expo_push_token`, `dispatch_enabled`, `dispatch_hour`, `created_at`, `updated_at` | R/W | R/W | The single most important shared table. Server also reads it directly (`getParticipantProfiles`, cabinet-members lookup). |
| `check_ins` | `id`, `user_id`, `check_in_date` (date; **UNIQUE(user_id, check_in_date)**), `type`/`user_input`/`cabinet_response` (legacy, nullable), `morning_done`, `morning_tasks` (jsonb), `evening_done`, `evening_tasks` (jsonb), `cabinet_morning_response`, `cabinet_evening_response`, `daily_question_counselor`, `daily_question_response`, `reflection_answer`*, `stoic_answer`*, `streak`*, `reading_streak`*, `created_at`, `updated_at` | R/W | R/W | *Starred columns are read by both clients' types but **do not appear in any migration** — applied directly to the remote project. |
| `journal_entries` | `id`, `user_id`, `type` (`reflection`\|`quote`\|`idea`\|`belief`), `content`, `book_title`, `author`, `source`*, `raw_input`, `dialogue_history` (jsonb), `encoded_belief`, `refined_statement`, `virtue_check` (jsonb), `belief_stage`, `topic`, `created_at`, `updated_at` | R/W | R/W | Server's `getLongitudinalContext()` reads `content, refined_statement, raw_input, topic, type, source, created_at`. `source='evening_reflection'` pairs the prompt in `raw_input` with the answer. |
| `cabinet_conversations` | `id`, `user_id`, `counselor_slugs` (text[]/jsonb — NULL = the group thread), `messages` (jsonb), `session_type` (`solo`\|`shared`), `created_at`, `updated_at` | R/W | R/W (group only) | **Base table not in migrations**; only `session_type` was added by one. Doubles as the shared-session id (`session_participants.session_id` FK). |
| `conversation_memory` | `user_id`, `counselor_slug`, `summary`, `last_updated` (unique on `user_id,counselor_slug`) | R/W | **unused** | **Not in migrations** (only an FK fix migration references it). |
| `reading_data` | `id`, `user_id` (unique), `current_books`, `books_read`, `reading_sessions` (jsonb), `today_reading_seconds`, `today_reading_date`, `created_at`, `updated_at` | R/W | R/W | |
| `routine_templates` | `id`, `user_id`, `type` (`morning`\|`evening`), `title`, `emoji`, `sort_order`, `created_at` | R/W | R/W | Identical on both sides. |
| `goals` | `id`, `user_id`, `title`, `description`, `target_date`, `completed`, `completed_at`, `source` (`onboarding`\|`user`), `category` (default `'GENERAL'`), `created_at`, `updated_at` | R/W | R/W | |
| `counselors` | `slug` (PK), `name`, `category` (`stoics`\|`warriors`\|`athletes`\|`builders`\|`writers`\|`spiritual`), `dates`, `description`, `bio`, `philosophy`, `communication_style`, `challenge_level` (`direct`\|`firm`\|`gentle`), `quotes` (jsonb), `is_default`, `sort_order`, `created_at` | R | R | Seeded by `20260320000001_seed_counselors.sql`. RLS: readable by authenticated. **Mobile's `Counselor` type declares `id` and `one_line`, neither of which is a column** (see §5). |
| `beliefs` | `id`, `user_id`, `raw_input`, `dialogue_history`, `encoded_belief`, `has_virtue_concern`, `virtue_concern`, `encoded_at`, `created_at`, `updated_at` | W (`saveBelief`), R (`getBeliefs`) | W + a **second, incompatible API** (`content`/`category`/`encoded`) | The real belief data lives in `journal_entries` with `type='belief'`; this table is largely legacy. Web's `createBelief/updateBelief/getBeliefs` write columns (`content`, `category`, `encoded`) that **do not exist** on the table. |
| `calendar_data` | `id`, `user_id` (unique), `data` (jsonb `{YYYY-MM-DD: {morning,evening}}`), `created_at`, `updated_at` | **stubbed out** (returns `{}`, no-op write) | R/W | Inverted parity: web uses the table, mobile deliberately stubs it. |
| `scrolls` | `id`, `user_id`, `title`, `body`, `counselor` (`marcus`\|`epictetus`\|`seneca`), `goal_source`, `request_type` (`auto`\|`requested`), `created_at` | R/W | R only | |
| `scroll_reads` | `id`, `scroll_id`, `user_id`, `read_count`, `last_read_at`, `first_read_at`, UNIQUE(scroll_id,user_id) | R/W | R (joined) | Web has no `logScrollRead`. |
| `subscriptions` | `id`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `price_id`, `tier`, `billing_source` (`stripe`\|`apple`\|`manual`), `current_period_end`, `created_at`, `updated_at` | — | W (Stripe webhook, service role) | Partial unique index on `user_id WHERE billing_source='stripe'`. RLS: own-row SELECT only. |
| `paywall_events` | `id`, `user_id`, `source`, `tier_at_view`, `created_at` | W | — | |
| `session_participants` | `id`, `session_id`→`cabinet_conversations`, `user_id`, `display_name`, `status` (`pending`\|`active`\|`declined`), `invite_token` (unique), `invite_email`, `invited_by`, `invite_expires_at`, `joined_at` | R/W (via server) | R (shared-mode restore) | |
| `session_messages` | `id`, `session_id`, `user_id`, `role` (`user`\|`assistant`\|`system`), `content`, `counselor_id`, `counselor_name`, `created_at` | R (realtime) | R (realtime) | Written server-side with the service role during shared sessions. In `supabase_realtime`. |
| `user_longitudinal_models` | `user_id` (unique), `persistent_themes`, `emerging_themes`, `fading_themes`, `growth_edges` (jsonb), `journal_consistency_score`, `cabinet_engagement_score`, `preferred_entry_types`, `counselor_affinity`, `dominant_philosophical_orientation`, `emotional_tone_baseline`, `self_disclosure_depth`, `philosophical_portrait`, `portrait_updated_at`, `delta_summary`, `weeks_analyzed`, `first_analyzed_at`, `last_analyzed_at`, `model_used`, `generation_duration_ms` | R (`/portrait`) | — | RLS: own-row SELECT. Also read server-side into every counselor prompt (`getLongitudinalContext`, gated at `weeks_analyzed >= 4`). |
| `longitudinal_model_history` | `id`, `user_id`, `snapshot_date`, `model_snapshot` (jsonb), `delta_summary`, `created_at` | R | — | |
| `journal_analysis` | `id`, `user_id`, `analysis_week`, `themes`, `journal_only_themes`, `cabinet_only_themes` (jsonb), `insight_text`, `grounding_passages`, `weeks_analyzed`, `dominant_theme`, `distress_flagged`, `distress_notes`, `delivered`, `delivered_at`, `created_at` | R via `GET /api/user/insight` | — | |
| `distress_review_queue` | `id`, `user_id`, `analysis_id`, `distress_notes`, `status`, `reviewed_at`, `created_at` | — | — | Admin only. |
| `daily_dispatches` | `id`, `dispatch_date` (unique), `title`, `body`, `teaser`, `practice`, `community_themes`, `corpus_context`, `generation_model`, `prompt_tokens`, `completion_tokens`, `total_recipients`, `delivered_count`, `failed_count`, `delivery_completed_at`, `created_at` | R via API | — | RLS SELECT: `true` (public to authenticated). |
| `dispatch_deliveries` | `id`, `dispatch_id`, `user_id`, `status` (`pending`\|`sent`\|`failed`\|`dismissed`\|`read`), `sent_at`, `error_message` | R/W via API | — | |
| `library_comments` | `id`, `text_author`, `text_work`, `page`, `para_index`, `anchor_text`, `quote`, `parent_id`, `user_id` (nullable when corpus), `handle`, `body`, `is_corpus`, `requested_by`, `sources` (jsonb), `created_at`, `updated_at` | R/W (`lib/libraryComments.ts`) | — | Public read; users write their own; corpus notes written server-side. |
| `crash_reports` | `message`, `name`, `stack`, `is_fatal`, `at`, `phase`, `launch_id`, `received_at` | W via `POST /api/crash` | — | |

### 1b. Corpus / Academy / Observatory tables (server & academy web only — neither app client writes)

`rag_corpus` (author, work, chunk_index, chunk_text, section_label, embedding, translator,
source_url, edition_year, language, text_type, program_id, course_relevance, difficulty,
source_chunk_index, paired_chunk_id, deprecated), `corpus_sources`, `corpus_ingestion_queue`,
`corpus_ingestion_runs`, `corpus_gap_reports`, `corpus_significance_map`, `corpus_dreams`,
`concept_passage_map`, `canonical_concepts`, `concept_aliases`, `concept_edges`,
`synthesis_documents`, `open_inquiries`, `philosophical_tensions`, `convergences`,
`convergence_runs`, `world_observations`, `system_reflections`, `system_greetings`,
`library_overrides`, `paper_submissions`, `post_queue`, `scheduled_posts`,
`scribe_*` (projects/sources/source_chunks/notes/drafts/style_profiles),
`academy_enrollments`, `academy_sessions`, `academy_papers`, `academy_waitlist`,
`session_progress`, `daily_examinations`, `courtyard_threads`, `courtyard_replies`,
`courtyard_presence`, `oracle_rate_limits`, `observatory_rate_limits`, `agent_config`,
`eval.*` (eval harness).

### 1c. RPCs the clients / server depend on

`try_increment_message_count(p_user_id, p_today, p_limit)` (atomic message limit — server),
`match_rag_corpus(query_embedding, match_count, filter_author, filter_language)`,
`match_academy_chunks(...)`, `library_shelf()`, `upsert_oracle_rate_limit(p_ip)`,
`upsert_observatory_rate_limit(p_ip)`, `corpus_work_counts()`, `grant_manual_premium(p_user_id, p_days)`,
`is_session_participant(p_session_id)`.

### 1d. Schema-drift warning

`cabinet_conversations`, `conversation_memory`, `crash_reports`, `user_settings.counselor_models`,
and `check_ins.reflection_answer / stoic_answer / streak / reading_streak` are all read/written
by shipped code but have **no migration** in `supabase/migrations/`. Anyone rebuilding a
local/branch database from migrations will get a schema both clients crash against. Worth a
catch-up migration before the web parity work starts.

---

## 2. Server endpoints (`server/index.js` + `server/routes/*`)

Base URL: mobile `EXPO_PUBLIC_API_BASE_URL`, web `NEXT_PUBLIC_API_BASE_URL`.
CORS allowlist is `app.pursuearete.com`, `academy.pursuearete.com`, `www.pursuearete.com`,
`pursuearete.com` — **no localhost**, so local web dev against prod Railway is blocked.

Auth legend: **JWT** = `Authorization: Bearer <supabase access_token>` verified via
`supabase.auth.getUser(token)`; **soft** = `resolveUserTier()` prefers the JWT but falls back to
`body.user_id`/`body.userId`; **admin** = JWT + `profiles.is_admin`; **none** = public.

### 2a. Chat / Cabinet

| Method | Path | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/chat` | soft + `enforceMessageLimit` | Generic single-shot Claude call with web search. Appends a resource instruction + `SELF_KNOWLEDGE` + local-time line + observatory pulse; prompt-caches the static half. Model clamped by tier. | `{system, messages[], max_tokens?, model?, tzOffsetMinutes?, user_id?}` | Anthropic messages response (`{content:[{type:'text',text}], ...}`); 403 `{error:'daily_limit_reached', tier, limit}` |
| POST | `/api/chat/counselor` | soft + `enforceMessageLimit` | The main Cabinet endpoint. Two modes. **Parallel** (when `activeCounselorId` is not a single-counselor id): one shared `match_rag_corpus` retrieval, a Haiku "director" picks solo/dialogue/chorus (1–3 counselors from a server-side roster filtered to `cabinetMembers`), then counselors fire sequentially as a relay, each seeing colleagues' replies. **Single**: injects `[KNOW THYSELF]` from `userProfile`, counselor-specific RAG (`retrieveChunks(msg, counselorSlug)`), corpus-wide `[LIBRARY PASSAGES]`, shelf catalog, shared-session block, longitudinal block. Mirrors shared sessions into `session_messages`. Routes non-Anthropic models through OpenAI-compatible clients. | `{system, messages[], max_tokens?, model?, userProfile?, counselorSlug?, tzOffsetMinutes?, activeCounselorId?, userId?, checkInContext?, priorResponses?, counselorModels?, cabinetMembers?, sessionType?, sessionId?, participantIds?}` + optional header `x-subscription-tier` (free\|arete\|arete_pro → 1500/2500/4000 max tokens) | parallel: `{mode:'parallel', responses:[{counselorId, counselorName, response, error, sources:[{author,work}]}], request_id}`; single: Anthropic shape + `request_id` |
| POST | `/api/memory/summarize` | none | Haiku summary of the last ≤20 turns for `conversation_memory`. | `{counselorSlug, counselorName, userName, messages[]}` | `{summary: string \| null}` |

### 2b. User / dispatch / insight

| Method | Path | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/user/insight` | JWT | Latest non-distress `journal_analysis` row; marks it delivered. | — | `{insight: row \| null}` |
| POST | `/api/user/push-token` | JWT | Upsert `user_settings.expo_push_token`. | `{token}` (must start `ExponentPushToken[`) | `{success:true}` |
| POST | `/api/user/timezone` | JWT | Upsert `user_settings.timezone`. | `{timezone}` (≤50 chars) | `{success:true}` |
| GET | `/api/dispatch/today` | JWT | Today's community dispatch; flips this user's pending `dispatch_deliveries` row to `read`. | — | `{dispatch: {...} \| null}` |
| GET | `/api/dispatch/:id` | JWT | One dispatch by id. | — | `{dispatch}` / 404 |

### 2c. Shared sessions (Arete for Couples)

| Method | Path | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/sessions/invite` | JWT + **premium** | Creates a pending `session_participants` row (48h token) and emails the partner via Resend (or returns the link for an SMS composer). | `{sessionId, partnerEmail?, partnerPhone?}` | `{...}`; 403 `{error, code:'premium_required'}` |
| GET | `/api/sessions/pending-invite` | JWT | Finds an unexpired pending invite matching the caller's email. | — | `{invite: {invite_token, inviterName, ...} \| null}` |
| GET | `/api/sessions/join?token=` | none | HTML interstitial that deep-links `arete://join-session?token=`; redirects to `PUBLIC_WEB_URL?invite=expired` if invalid. | query `token` | `text/html` or 302 |
| POST | `/api/sessions/accept` | JWT | Consumes the token, sets participant `status='active'`. | `{token, partnerDisplayName?}` | `{...}`; 410 if expired |

### 2d. Onboarding / scrolls / resources / contact

| Method | Path | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/onboard` | none | Raw Claude passthrough with client-supplied system + tools (mobile onboarding agent). | `{system, messages[], tools?, max_tokens?, model?}` | Anthropic response |
| POST | `/api/onboard-web` | none | Server-owned Future-Self onboarding agent (12-area interview) with the `extract_profile` tool. Used by **both** clients. | `{messages[], futureYears?}` | `{complete:false, message}` or `{complete:true, profile:{identity,goals,obstacle,virtues,challenge_style,work_meaning,future_vision,future_years,...}, futureYears}` |
| POST | `/api/scrolls/generate` | none | Generates a 600–900 word scroll in a counselor's voice; returns JSON only (the client inserts the row). | `{goal, counselor?, userName?, requestType?}` | `{title, body, counselor}` |
| POST | `/api/resources/fetch` | none | Two-call (search + structure) reading-list generator from goals. | `{goals:[{title,description?}]}` | `{resources:[...]}` |
| POST | `/api/contact` | none, honeypot + 5/IP/hour | Contact form → Resend. | `{name,email,message,website(honeypot)}` | `{success:true}` / 400 / 429 |

### 2e. Academy / Courtyard / Examination

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/academy/seminar` | none + limit | Socratic Proctor seminar turn with course-corpus RAG. Body `{courseId, agentId, sessionId, sessionNumber, userId, systemPrompt, messages}`. |
| POST | `/api/academy/agent` | none + limit | Multi-model agent router. Body `{agent_type, messages, course_id, user_id, course_context, session_id}`. |
| POST | `/api/courtyard/stoa` | soft + limit | The Stoa's RAG-grounded reply to a Courtyard thread. Body `{thread_id, thread_title, thread_body, replies?, query?}`. |
| POST | `/api/courtyard/rag-preview` | JWT | Top-5 corpus chunks for a draft. Body `{query}` → `{chunks}`. |
| POST | `/api/examine/proctor` | JWT + limit | Grades a morning/evening examination. Body `{responses:[{prompt,response}], sessionId, period}`. |

### 2f. Library of Arete (public reading rooms over `rag_corpus`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/library/texts` | none | Shelf catalog via `library_shelf()` RPC + `library_overrides`. |
| GET | `/api/library/text?author&work&page` | none | Paginated reader text (`LIBRARY_PAGE_CHUNKS` rows/page). 404 if unknown. |
| GET | `/api/library/outline?author&work` | none | Two-level TOC with start pages; 6h in-process cache. |
| GET | `/api/library/search?q&author?&work?` | none | ILIKE search over `chunk_text` (≥3 chars, ≤20 hits). |
| POST | `/api/library/related` | Pro gate* | "Related works" for a work. Body `{author, work}`. |
| POST | `/api/library/debate` | Pro gate* + 15/IP/day | Two-counselor debate on a question. Body `{question, a?, b?}`. |
| POST | `/api/library/annotate` | Pro gate* + JWT | Corpus marginalia on a paragraph; dedupes and stores in `library_comments`. Body `{author, work, page, paraIndex, anchorText, passage, quote?, parentId?}` → `{comment, existing?, remaining?}`; 403 `{error:'pro_required', message}`. |
| GET | `/api/library/observatory` | none | Aggregated Observatory payload (concepts, syntheses, journal themes, gap report). |
| GET | `/api/library/observatory/pulse?since=` | none | Ephemeral live concept pulses. |
| GET | `/api/observatory/inquiries` \| `/convergences` \| `/tensions` \| `/world` \| `/dreams` | none | Approved rows from `open_inquiries`, `convergences`, `philosophical_tensions`, `world_observations`, `corpus_dreams`. |
| GET | `/api/observatory/live` | none | SSE stream (capacity-limited). |
| GET | `/api/observatory/state` \| `/greeting` | none | Sky state / daily Haiku greeting (cached per UTC day). |
| POST | `/api/observatory/passage` | none + IP rate limit | A passage for a concept. Body `{concept}`. |

\* Pro gate active only when `PRO_LIBRARY_GATES === 'true'`.

### 2g. Oracle / RAG / misc

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/oracle` | none + 15/IP/day | The Stoic Oracle / Symposium "sit with a master": corpus retrieval + persona prompt (Marcus/Epictetus/Seneca/Montaigne or unified Oracle), Haiku. Body `{question (≤500), author?, history?}` → `{answer, sources:[{author,work,sectionLabel,sourceUrl,textType}], remaining, request_id}`. |
| POST | `/ask` | none | Legacy RAG Q&A. Body `{question, author?, top_k?}`. |
| POST | `/v1/chat/completions` | none | OpenAI-compatible RAG shim. |
| GET | `/v1/models` | none | Lists `stoic-rag-1`. |
| GET | `/health` | none | Corpus stats: `{status, total_chunks, sources}`. |
| GET | `/api/widget/quote` | none | Day-of-year quote, 1h cache. |
| POST | `/api/crash` | none | Ingest a crash record → `crash_reports`. Body `{message,name,stack,isFatal,at,phase,launchId}`. |
| GET | `/api/crash` | none | Last 200 crash reports. **Unauthenticated read of crash data.** |
| POST | `/mcp/corpus` | `ARETE_MCP_TOKEN` | JSON-RPC MCP corpus server. GET returns 405. |

### 2h. Admin agent runners (all JWT + `is_admin`)

`POST /api/admin/dispatch/generate`, `/synthesis/generate`, `/reflection/generate`,
`/corpus/run`, `/papers/run`, `/journal/run`, `/world/generate`, `/longitudinal/run`,
`/interlocutor-profile/run`, `/tensions/run`, `/inquiry/run`, `/dreams/run`,
`/consolidation/run`, `/convergence/run`, `/stoic-replies/run`.
The `makeAgentRunEndpoint` family returns `202 {ok:true, started:true}`, `409` if a run is
already in flight, `500` naming missing env vars.

### 2i. Server-side model policy (matters for web parity)

```
ALLOWED_COUNSELOR_MODELS = { claude-opus-4-6, claude-sonnet-4-6, gpt-5.1,
                             gemini-3-pro-preview, grok-4-fast-non-reasoning }
DEFAULT_COUNSELOR_MODEL  = claude-opus-4-6
resolveModelForTier(tier, requested):
  pro     → requested (if allowlisted) else default; haiku honored
  premium → claude-sonnet-4-6 (haiku honored)
  free    → claude-haiku-4-5, always
```
Whatever `model` a client sends is advisory only. `PROVIDER_MODEL_ALIAS` maps
`gemini-3-pro-preview` → `gemini-3.1-pro-preview` at call time.
`MESSAGE_LIMITS = {free:10, premium:50, pro:null}` enforced atomically via
`try_increment_message_count`.

---

## 3. `lib/db.ts` (mobile) vs `web/src/lib/db.ts`

| Mobile function | Web equivalent | Status |
|---|---|---|
| `getUserSettings()` | `getUserSettings()` | **Identical** |
| `upsertUserSettings(data)` | `upsertUserSettings(data)` | **Identical** |
| `getProfileStreak()` | — | **Missing on web** (web reads `profiles.streak` ad hoc in pages) |
| `checkAndResetStreakIfMissed()` | `checkAndResetStreakIfMissed()` | **Identical** (2-missed-day forgiveness logic matches) |
| `incrementStreak()` | `incrementStreak()` | **Drifted (web better):** web adds an `.or(streak_last_incremented_date.is.null,...lt.today)` race guard mobile lacks |
| `getTodayCheckin(): DailyCheckin` | `getTodayCheckin(): Record<string,unknown>` | **Drifted:** web is untyped (`Record<string,unknown>`), forcing casts at every call site; mobile uses `.single()` + PGRST116 tolerance, web uses `.maybeSingle()` |
| `upsertTodayCheckin(Partial<DailyCheckin>)` | `upsertTodayCheckin(Record<string,unknown>)` | **Drifted:** same typing loss; behaviour otherwise identical |
| `getDailyQuestionCache()` | `getDailyQuestionCache()` | **Identical** |
| `saveDailyQuestionCache(slug, response)` | — | **Missing on web** (web can read the cache but never writes it) |
| — | `hasCheckInToday(type)` | Web-only, `@deprecated` shim |
| — | `getLatestCheckIn(type)` | Web-only, `@deprecated` shim — **but still the sole check-in source used by web `gatherAppContext()`** |
| — | `createCheckIn(type, _input, response)` | Web-only wrapper over `upsertTodayCheckin` |
| `getJournalEntries()` | `getJournalEntries()` | **Identical** |
| `createJournalEntry(entry)` | `createJournalEntry(entry)` | **Identical** |
| `updateJournalEntry(id, data)` | `updateJournalEntry(id, data)` | **Identical** |
| `deleteJournalEntry(id)` | `deleteJournalEntry(id)` | **Identical** |
| `saveBelief(belief)` | `saveBelief(belief)` | **Identical** (writes `beliefs`) |
| `getBeliefs()` (no args, own rows) | `getLegacyBeliefs()` | **Renamed**; web's `getBeliefs(userId)` is a *different* function against a different column set |
| — | `getBeliefs(userId)`, `createBelief`, `updateBelief`, `deleteBelief`, `encodeBelief` | Web-only, and **broken**: they read/write `content`, `category`, `encoded` columns that don't exist on `beliefs` |
| `saveCabinetConversation(messages)` | `saveCabinetConversation(messages)` | **Drifted:** mobile's `getCabinetConversation` filters `.is('counselor_slugs', null)` so the group thread can't collide with a per-counselor row; web has no such filter and will happily return a counselor row as "the cabinet" |
| `getCabinetConversation()` | `getCabinetConversation()` | **Drifted** (see above) |
| `getOrCreateCabinetConversationId()` | `getOrCreateCabinetConversationId()` | **Identical** |
| `getCounselorConversation(counselorId)` | — | **Missing on web** |
| `saveCounselorConversation(counselorId, msgs)` | — | **Missing on web** |
| `getThread(threadId)` | `getThread(threadId)` | **Drifted — this is a real feature gap:** mobile resolves any counselor id to its own `cabinet_conversations` row; **web returns `[]` for anything but `'cabinet'`** |
| `upsertThread(threadId, messages)` | `upsertThread(threadId, messages)` | **Drifted:** web is a **no-op** for non-`'cabinet'` threads ("stored locally" — but nothing stores them). 1:1 counselor chats on web do not persist across reloads |
| `getReadingData()` | `getReadingData()` | **Near-identical** (`.single()`+PGRST116 vs `.maybeSingle()`) |
| `upsertReadingData(data)` | `upsertReadingData(data)` | **Identical** |
| `getCalendarData()` (stub → `{}`) | `getCalendarData()` (reads `calendar_data`) | **Inverted:** web implements it, mobile stubs it. Mobile's `gatherWeeklyContext` therefore has no morning/evening grid |
| `upsertCalendarData()` (no-op) | `upsertCalendarData(data)` (writes table) | **Inverted** (same) |
| `getCounselors()` | `getCounselors()` | **Identical** |
| `getCounselorsByCategory(cat)` | `getCounselorsByCategory(cat)` | **Identical** |
| `getCounselorsBySlugs(slugs)` | `getCounselorsBySlugs(slugs)` | **Identical** |
| `getUserCabinet()` | `getUserCabinet()` | **Drifted:** mobile fetches the tier and **filters the cabinet to `FREE_COUNSELOR_SLUGS` for free users** (falling back to `['marcus','roosevelt']`); web applies **no tier filter at all**. Defaults also differ: mobile `['marcus','roosevelt']`, web `['marcus-aurelius','epictetus','david-goggins','theodore-roosevelt']` (long slugs that don't match the seeded `counselors.slug` values) |
| `saveCabinetSelection(slugs)` | `saveCabinetSelection(slugs)` | **Identical** |
| `getKnowThyselfProfile()` | — | **Missing on web** — this is what feeds the server's `[KNOW THYSELF]` block on the single-counselor path |
| `getKnowThyselfComplete()` | `getKnowThyselfComplete()` | **Identical** |
| `saveOnboardingProfile(profile)` | `saveOnboardingProfile(profile)` | **Identical** (same field→column map, deliberately kept in sync) |
| `getRandomCabinetQuote(slugs)` | — | **Missing on web** (web uses a hardcoded `lib/quotes.ts` list instead of `counselors.quotes`) |
| `getDefaultCabinet()` | `getDefaultCabinet()` | **Identical** |
| `normalizeTier(raw, isPremium)` | — | **Missing on web** |
| `getSubscriptionTier(): 'free'\|'premium'\|'pro'` | — | **Missing on web** (web only has boolean `getIsPremium`, so it cannot distinguish premium from pro) |
| `getIsPremium()` | `getIsPremium()` | **Drifted:** mobile delegates to `normalizeTier` (accepts `premium`/`arete`/`scholar`/`pro` + `is_premium`); web hardcodes `isPrem \|\| tier==='premium' \|\| tier==='scholar'` — **a `tier='pro'` or `tier='arete'` user with `is_premium=false` reads as free on web** |
| `checkAndIncrementMessageCount(): MessageLimitStatus` | — | **Missing on web.** Web does no client-side quota accounting at all; it relies entirely on the server's 403 |
| `MESSAGE_LIMITS`, `MAX_TOKENS_BY_TIER`, `FREE_COUNSELOR_SLUGS`, `STARTER_CABINET_SLUGS`, `FUTURE_SELF_SLUG` | — | **Missing on web** (`FUTURE_SELF_SLUG` exists as a private const) |
| `getGoals(userId)` | `getGoals(userId)` | **Drifted:** mobile `throw`s on error, web logs and returns `[]` |
| `upsertGoal(goal)` | `upsertGoal(goal)` | **Identical** |
| `completeGoal(id): Goal` | `completeGoal(id): void` | **Drifted:** return type only |
| `deleteGoal(id)` | `deleteGoal(id)` | **Identical** |
| `getRoutineTemplates(type)` | `getRoutineTemplates(type)` | **Identical** |
| `addRoutineTemplate(...)` | `addRoutineTemplate(...)` | **Identical** |
| `deleteRoutineTemplate(id)` | `deleteRoutineTemplate(id)` | **Identical** |
| `getConversationMemory(slug)` | — | **Missing on web** |
| `saveConversationMemory(slug, summary)` | — | **Missing on web** |
| `getLongitudinalPortrait()` | — | **Missing on web** |
| `getPortraitHistory()` | — | **Missing on web** |
| (in `lib/scrolls.ts`) `getUserScrolls(userId)` | `getScrolls(userId)` | **Renamed, identical query** |
| (in `lib/scrolls.ts`) `getScroll(id)` | — | **Missing on web** |
| (in `lib/scrolls.ts`) `logScrollRead(scrollId, userId)` | — | **Missing on web** (web shows `read_count` but never increments it) |
| (in `lib/scrolls.ts`) `triggerScrollGeneration(userId, name, goalsText)` | — | **Missing on web** (web can never create a scroll) |
| — | `getConversations(userId)`, `getConversation(id)`, `createConversation(slugs)`, `appendMessage(id, msg)` | Web-only structured conversation API, largely unused by the pages |

---

## 4. `services/claudeService.ts` (mobile) vs `web/src/lib/claudeService.ts`

### 4a. Exported surface

| Mobile export | Web export | Status |
|---|---|---|
| `MessageLimitError` (tier, used, limit) | — | **Missing on web** |
| `DailyLimitError` | — | **Missing on web** — web never detects the server's 403 `daily_limit_reached`; it renders it as "The Cabinet is temporarily unavailable. (Error 403)" |
| `API_BASE_URL` | `API_BASE_URL` | Identical (different env var name) |
| `Message`, `BeliefDialogueTurn`, `VirtueCheck`, `BeliefEntry` | same | **Identical** |
| `gatherAppContext()` | `gatherAppContext()` | **Heavily drifted** — see §4c |
| `gatherUserProfile()` *(private)* | `gatherUserProfile()` *(exported)* | **Drifted:** mobile prepends an `INSTRUCTION:` paragraph telling the counselors not to recite the profile and to name patterns/weaknesses when they appear; web's version omits it entirely |
| `buildSystemPrompt()` *(private)* | `buildSystemPrompt()` *(exported)* | **Drifted** — see §4b |
| `buildCounselorSystemPrompt(id)` *(private)* | same *(private)* | **Drifted:** mobile injects a `[MEMORY — PREVIOUS SESSIONS]` block from `conversation_memory` and a fuller principles list; web has no memory block and a truncated principles list. Web *does* fall back to a dynamic DB profile for unknown slugs; mobile emits `(Unknown counselor)` |
| `generateWeeklyReview()` | — | **Missing on web** |
| `CabinetReply` | `CabinetReply` | Identical |
| `sendMessageToCabinet(messages, sessionOptions?)` | same signature | **Drifted** — see §4d |
| `sendCheckInToCabinet(type)` | `sendCheckInToCabinet(type)` | **Drifted** — see §4e |
| `sendMessageToCounselor(id, messages)` | same signature | **Drifted** — see §4f |
| `prefetchDailyQuestion(counselorId, question)` | — | **Missing on web** |
| `buildBeliefJournalSystemPrompt(stage)` *(private)* | same | **Drifted:** mobile's is ~3× longer (the full three cardinal rules, format guidance, explicit tag instructions per stage). Web's stage-1 wording also says "In Stage 1: ask questions only" where mobile says "In Stage 2" — the stage numbering diverges |
| `sendBeliefJournalMessage(entry, stage)` | same | **Near-identical** (same `[REFINED_BELIEF]` / `[VIRTUE_CHECK]` tag parsing). Web omits `user_id` in the body |
| `authHeaders()` *(private helper)* | — | Web inlines `Authorization: Bearer ${session?.access_token}` (sends the literal `Bearer undefined` when signed out) |
| `MARCUS/EPICTETUS/GOGGINS/ROOSEVELT_PROFILE`, `COUNSELOR_PROFILE_MAP` (in-file) | in `web/src/lib/counselors.ts` | **Byte-identical prose**, different module. Both keyed by long slugs (`marcus-aurelius`, `david-goggins`, `theodore-roosevelt`) |

### 4b. System prompt construction (`buildSystemPrompt`)

Both build: instructions → Napoleon Hill cabinet intro → per-counselor profile sections
(hardcoded map first, then dynamic profiles fetched from `counselors` for unknown slugs) →
Future Self profile → `gatherUserProfile()` → today's date.

Differences:

| Element | Mobile | Web |
|---|---|---|
| Default `activeMembers` | `['marcus-aurelius','epictetus','david-goggins','theodore-roosevelt','futureSelf']` | same |
| "encoded beliefs" principles (3 bullets: reference them, name contradictions, flag half-formed assumptions for the Belief Journal) | **present** | **absent** |
| "have them engage with one another / banter, disagreement" paragraph | **present** | **absent** |
| Active goals appended (`getGoals`, filtered to incomplete, `- title: description (target: date)`) | **present** | **absent** |
| Future Self closing line (*"Trust the process. I know how this ends — if you do the work."*) | **present** | **absent** |

### 4c. `gatherAppContext()` — the biggest single drift

| Block | Mobile | Web |
|---|---|---|
| Header `=== NAME'S CURRENT APP DATA (as of <date>) ===` | yes (the server keys off `'S CURRENT APP DATA` to re-inject this tail into every parallel counselor) | yes |
| "Know Thyself not complete" note | yes (`getKnowThyselfComplete`) | **no** |
| Morning / evening routine tasks | from `check_ins.morning_tasks/evening_tasks`, gated on `getShareRoutinesWithCabinet()` | from `localStorage['arete_morning_tasks'/'arete_evening_tasks']` — **keys nothing in the web app ever writes** (pages write `check_ins` and `arete_morning_done_ids`). So the Cabinet on web never sees routines |
| Evening reflection / Stoic journal | `check_ins.reflection_answer` / `stoic_answer` | `localStorage['arete_reflection_answer'/'arete_stoic_answer']` — **also never written** (the evening page writes `check_ins.stoic_answer`) |
| Recent journal reflections (last 3) | yes | yes |
| Encoded beliefs | listed **twice** — once as a count list, once as a fuller block with virtue-concern annotations and an instruction to name contradictions | listed once, no instruction |
| Commonplace quotes (last 5) | yes | **no** (only counted in stats) |
| Currently reading / today's reading time / last 5 sessions / books finished | yes | yes |
| Overall stats | `Streak: N days`, total journal entries, total quotes | `Morning/Evening check-in today: Done/Not done`, totals — **no streak** |
| Focus sessions (`buildFocusContext`) | yes | **no** |
| Accountability meta-signals (`buildMetaSignalsContext`) | yes | **no** |
| Attend / Screen Time (`buildAttendContext`, premium-gated) | yes | n/a (out of scope) |
| Apple Health (`buildHealthContext`, premium-gated) | yes | n/a (out of scope) |
| Calendar (`buildCalendarContext`, premium-gated) | yes | **no** — but web *could* source this |

### 4d. `sendMessageToCabinet`

| | Mobile | Web |
|---|---|---|
| Quota | `checkAndIncrementMessageCount()` first, throws `MessageLimitError` | none |
| Context window | 15 messages (`threadService.CONTEXT_WINDOW_SIZE`) | 30 |
| One-time "what's new" note | `takeCabinetWhatsNewNote()` appended | none |
| Endpoint | `POST /api/chat/counselor` | same |
| Headers | `x-subscription-tier: <tier>` + Bearer | Bearer only → server falls back to `max_tokens \|\| 2500` |
| Body | `model:'claude-opus-4-5'`, `counselorModels`, `cabinetMembers`, `max_tokens: MAX_TOKENS_BY_TIER[tier]` (400/600/1000), `system`, name-labelled `messages`, `tzOffsetMinutes`, `activeCounselorId:'cabinet'`, `userId`, `sessionType`, `sessionId`, `participantIds` | same minus `max_tokens` |
| 403 handling | parses `daily_limit_reached` → `DailyLimitError` | generic error string |
| Parallel response parsing | identical | identical |

Note: both send `model: 'claude-opus-4-5'`, which is **not** in `ALLOWED_COUNSELOR_MODELS`
(`claude-opus-4-6` is), so it silently resolves to the default for pro and is clamped for
everyone else. Harmless today, but it means the group-cabinet model is never actually chosen.

### 4e. `sendCheckInToCabinet`

Same 7-affirmation rotation and same `[Morning check-in] … / [Evening check-in] …` message
shape (mobile says "he/him", web says "they/them"). Both `POST /api/chat` and append the pair
to the `'cabinet'` thread. Differences: mobile `max_tokens: 350` vs web `2000`; mobile passes
`user_id` and the what's-new note; web reads tasks/answers from the phantom localStorage keys.

### 4f. `sendMessageToCounselor`

| | Mobile | Web |
|---|---|---|
| Quota | `checkAndIncrementMessageCount()` | none |
| Model | `modelForCounselor(settings.counselor_models, counselorId)` — the user's per-counselor pick | hardcoded `'claude-opus-4-5'`; **`counselor_models` is never consulted**, so the per-counselor LLM picker has no effect on web |
| `max_tokens` | `MAX_TOKENS_BY_TIER[tier]` | `1500` |
| `userProfile` | `getKnowThyselfProfile()` → server builds `[KNOW THYSELF]` | **not sent** — the block is silently omitted |
| `counselorSlug` | sent → drives counselor-specific RAG (`retrieveChunks`) | **not sent** → the counselor's own source texts are never retrieved |
| `activeCounselorId` | short thread ids (`marcus`,`epictetus`,`goggins`,`roosevelt`,`futureSelf`) | the cabinet slug from `getUserCabinet()` (short, OK) **or** `COUNSELOR_LIST` ids (`marcus-aurelius`, …) on the fallback path. The server's `SINGLE_COUNSELOR_IDS` is `{marcus, epictetus, seneca, goggins, roosevelt, montaigne, future-self}` — so the long-slug fallback silently drops into **parallel Cabinet mode for a 1:1 chat**. (Both clients also miss `futureSelf` ≠ `future-self` here.) |
| Memory summarisation | fires `POST /api/memory/summarize` when ≥4 messages and persists via `saveConversationMemory` | **absent** — web counselors have no cross-session memory |
| Header `x-subscription-tier` | sent | not sent |

### 4g. Mobile-only AI features (no web counterpart at all)

- **Weekly Review** — `generateWeeklyReview()` + `gatherWeeklyContext()` (streak, reading
  streak, 7-day morning/evening grid from `calendar_data`, week's journal entries, reflections,
  reading sessions, books, quotes) → `POST /api/chat`, `max_tokens: 2000`, formal Chair-led
  review prompt. Screen: `app/weekly-review.tsx`.
- **Portrait** — `app/portrait.tsx` reading `getLongitudinalPortrait()` + `getPortraitHistory()`.
- **Daily question prefetch** — `prefetchDailyQuestion()` warming `check_ins.daily_question_*`.
- **Dispatch** — `app/dispatch.tsx` + `GET /api/dispatch/today` / `:id`, push token + timezone
  registration.
- **Symposium / Library / Observatory** — `app/library/{index,reader,symposium,observatory}.tsx`
  over `/oracle`, `/api/library/*`, `lib/libraryComments.ts`.
- **Insight** — `GET /api/user/insight` (weekly `journal_analysis`).
- **Attend, Health, Calendar** context blocks (see §6).
- **Academy** — `app/academy.tsx`.
- **Crash capture** — `lib/crashCapture.ts` → `POST /api/crash`.

Web-only: the Stripe billing routes and the cookie-session middleware (below).

---

## 5. `threadService` and `types` comparison

### threadService

| | Mobile (`services/threadService.ts`) | Web (`web/src/lib/threadService.ts`) |
|---|---|---|
| `ThreadMessage`, `Thread` | identical shapes | identical shapes |
| `MAX_STORED_MESSAGES` | 200 | 200 |
| `CONTEXT_WINDOW_SIZE` | **15** | **30** |
| `normalizeCounselorId(slug)` + `COUNSELOR_SLUG_TO_ID` map (`marcus-aurelius`→`marcus`, `david-goggins`→`goggins`, `theodore-roosevelt`→`roosevelt`, `future-self`→`futureSelf`) | present | **missing** — this is exactly the mapping web needs to stop long slugs leaking into `activeCounselorId` |
| `normalizeTimestamp()` (seconds→ms repair for notification-seeded lines) | present | missing |
| `loadThread / saveThread / appendMessages / clearThread` | persist via `db.getThread/upsertThread` | same calls, but `upsertThread` is a **no-op** for non-`'cabinet'` ids, so per-counselor threads evaporate |
| `getAllThreadSummaries()` thread ids | `['marcus','epictetus','goggins','roosevelt','futureSelf','cabinet']` | `['marcus-aurelius','epictetus','david-goggins','theodore-roosevelt','futureSelf','cabinet']` |
| `getContextWindow()` | identical logic | identical logic |

### types

| Type | Difference |
|---|---|
| `Task`, `Book`, `ReadingSession`, `ThreadMessage`, `JournalEntry`, `CabinetThread`, `ReadingData`, `CalendarDay`, `Goal` | **Identical** on both sides |
| `UserSettings` | Web is **missing** `kt_life_situation`, `feedback_preference`, `app_usage_intent`, `accountability_style`, `recommended_readings`, `archetype` (all real columns, several written by `saveOnboardingProfile`). Both have `counselor_models` |
| `DailyCheckin` | Web is **missing** `daily_question_counselor` / `daily_question_response` |
| `Counselor` | **Completely different shapes.** Mobile: `{id, name, slug, category, one_line, bio?, challenge_level?, is_active?, is_default?, sort_order?}`. Web: the full DB row `{slug, name, category, dates, description, bio, philosophy, communication_style, challenge_level, quotes, is_default, sort_order, created_at}`. **Web's matches the actual table; mobile's `id` and `one_line` are not columns** — yet `components/CounselorCard.tsx` and `app/(tabs)/cabinet.tsx` render `counselor.one_line`. Either the remote table has an out-of-band `one_line` column or those fields render blank. Verify before copying either type |
| `SubscriptionTier`, `LongitudinalTheme`, `CounselorAffinity`, `EntryTypeShare`, `LongitudinalPortrait` | **Mobile only** |
| `CabinetConversation`, `ConversationMessage`, `Belief`, `Scroll` | **Web only** (`Belief` describes columns the table doesn't have; `Scroll` duplicates mobile's `lib/scrolls.ts` interface) |

### llmModels

Both export `COUNSELOR_MODEL_OPTIONS`, `DEFAULT_COUNSELOR_MODEL`, `counselorModelKey`,
`modelForCounselor`. Two drifts:
1. **Mobile's list includes `claude-haiku-4-5`; web's does not.** Since `modelForCounselor`
   validates against the list, a web user whose saved pick is Haiku silently gets Opus back.
   (`claude-haiku-4-5` is also absent from the server allowlist but is special-cased by
   `resolveModelForTier`, so it *is* a legitimate selection.)
2. Key mapping differs: mobile maps only `futureSelf → future-self`; web maps
   `marcus-aurelius→marcus`, `david-goggins→goggins`, `theodore-roosevelt→roosevelt`,
   `future-self→future-self`, `futureSelf→future-self`. Web's is the more complete one and
   should become the shared implementation.

### supabase clients / middleware

- Mobile `lib/supabase.ts`: `createClient` with AsyncStorage, `detectSessionInUrl: false`.
- Web `lib/supabase.ts`: `createBrowserClient` (@supabase/ssr, cookie storage).
- Web `lib/supabaseServer.ts`: `createSupabaseServerClient()` (cookie-based, for route handlers)
  and `createSupabaseAdminClient()` (service role, RLS bypass — billing + account deletion only),
  plus `requireEnv()`.
- Web `middleware.ts`: matcher covers everything except static assets. Public: `/login`,
  `/privacy`, `/reset-password`. Self-authenticating and therefore exempt: `/api/stripe-webhook`,
  `/api/delete-account`. Everything else redirects unauthenticated users to
  `/login?redirectTo=<path+search>`. **Consequence for parity: any new web API route that the
  mobile app or a webhook calls with a Bearer token must be added to that exemption list, or it
  gets a 307 to an HTML login page.**
- Web API routes: `POST /api/create-checkout` (cookie auth; plan→price from server env; reuses
  or creates a Stripe customer; 7-day trial for first-timers; idempotency key), `POST
  /api/create-portal` (cookie auth → billing portal URL), `POST /api/stripe-webhook` (signature
  auth; syncs `subscriptions` + `profiles.tier/is_premium`; product-id map first, price-id
  fallback; grants on `active`/`trialing`, revokes on `canceled`/`unpaid`/`incomplete_expired`/
  `paused` unless an `apple`/`manual` row exists; `past_due` is a grace period), `POST
  /api/delete-account` (Bearer JWT; cancels live Stripe subs, sweeps FK-less tables, deletes the
  auth user — used by mobile too), `POST /api/onboard` (thin proxy to Railway `/api/onboard-web`).

---

## 6. `lib/cabinetSignals.ts` — what the counselors can see

`cabinetSignals.ts` itself holds two signal families plus a one-shot announcement:

| Signal | Source | Storage | Platform |
|---|---|---|---|
| **Focus sessions (pomodoro)** — today's completed count + a 7-day total/day-count, via `buildFocusContext()` | the timer tab | AsyncStorage `arete:pomodoro_sessions`, a rolling 30-day `{YYYY-MM-DD: count}` map (with forward-migration from the legacy `{date,count}` shape) | **Portable.** Web has a `/focus` page; needs the same rolling map in `localStorage` (or, better, a Supabase table so it survives devices) |
| **Accountability meta-signals** — `buildMetaSignalsContext({journalEntries, goals})`: days since the last `reflection` entry, days since the last `belief` entry, and per-open-goal staleness (target date passed, or untouched ≥14 days), closed with a "watch, don't audit, never shame" instruction | **pure function over data the caller already fetched** (`getJournalEntries()`, `getGoals()`) | none | **Fully portable — zero platform dependency.** Copy the file verbatim |
| **Pomodoro accessors** `getPomodoroHistory`, `getPomodoroCountToday`, `setPomodoroCountToday`, `POMODORO_SESSIONS_KEY` | AsyncStorage | | Portable behind the `web/src/lib/storage.ts` wrapper |
| **`takeCabinetWhatsNewNote()`** — one-time, version-gated, Cabinet-voiced note announcing expanded sight | `Constants.expoConfig.version` + AsyncStorage `cabinet_whats_new_announced_version` | | Mobile-specific (expo-constants + the specific announcement text); skip or re-word for web |

Signals injected by `gatherAppContext` but living in other modules:

| Signal | Module | Web viability |
|---|---|---|
| **Screen Time / Attend** — coarse threshold crossings only, opt-in, premium-gated for Cabinet visibility; `buildAttendContext(cabinetCanSee)` plus watchlists, goal ladders, focus blocking | `lib/attend.ts` (Apple Screen Time / DeviceActivity) | **OUT OF SCOPE** — no web equivalent |
| **Steps / sleep / exercise** — `buildHealthContext(cabinetCanSee)`, last night's sleep, today's steps and exercise minutes, read at prompt-build time, never stored | `lib/health.ts` (`@kingstinct/react-native-healthkit`, iOS only, lazy-required) | **OUT OF SCOPE** — HealthKit is iOS-native |
| **Calendar** — `buildCalendarContext(cabinetCanSee)`: today's events, total scheduled minutes, next event, tomorrow's first event; opt-in, on-device reduction, premium-gated | `lib/calendar.ts` (expo-calendar, iOS + Android) | **PORTABLE with work** — via Google Calendar OAuth or an .ics import. Reuse the *shape* of `buildCalendarContext` including its honesty contract (see below) |
| **Routine sharing toggle** — `getShareRoutinesWithCabinet()` gates the morning/evening block | `lib/attend.ts` | Trivial to port as a plain setting |
| **Journal entries, goals, beliefs, reading, streak** | `lib/db.ts` | Already available on web |

**The honesty contract worth preserving:** every one of these blocks is *always* injected —
with real data when available, otherwise an explicit "You cannot see their X because …" line plus
"never invent events or times". That is what stops a counselor fabricating an answer to "what's
on today?". Any web port should keep it.

---

## 7. Prioritised data-layer gaps for web parity

### P0 — correctness bugs that make existing web features quietly wrong

| # | Gap | Recommended approach |
|---|---|---|
| 1 | `gatherAppContext()` reads `localStorage['arete_morning_tasks'/'arete_evening_tasks'/'arete_reflection_answer'/'arete_stoic_answer']`, **keys nothing writes**. The web Cabinet has never seen the user's routines or reflections. | **Adapt from mobile:** read `getTodayCheckin()` and pull `morning_tasks`, `evening_tasks`, `reflection_answer`, `stoic_answer` — the web pages already write all four to `check_ins`. |
| 2 | `getThread`/`upsertThread` return `[]` / no-op for every non-`'cabinet'` thread, so 1:1 counselor conversations do not persist. | **Copy from mobile:** port `getCounselorConversation` / `saveCounselorConversation` (`.contains('counselor_slugs',[id])`) and the `.is('counselor_slugs', null)` filter on `getCabinetConversation`. |
| 3 | `getIsPremium()` misses `tier='pro'` and `tier='arete'`. A Pro subscriber can read as free. | **Copy from mobile:** port `normalizeTier()` + `getSubscriptionTier()` and reimplement `getIsPremium()` on top of them. Delete the local OR expression. |
| 4 | `sendMessageToCounselor` sends the `COUNSELOR_LIST` long slug on the fallback path, so the server drops a 1:1 chat into parallel Cabinet mode. | **Copy from mobile:** port `normalizeCounselorId()` into web's threadService and apply it to `activeCounselorId` (and add `futureSelf → future-self`, which both clients currently get wrong). |
| 5 | Web's `getBeliefs/createBelief/updateBelief/encodeBelief` write `content`/`category`/`encoded` — columns the `beliefs` table doesn't have. | **Delete.** Belief data lives in `journal_entries` with `type='belief'`; keep `saveBelief` + `getLegacyBeliefs` only. |
| 6 | Web `llmModels.COUNSELOR_MODEL_OPTIONS` omits `claude-haiku-4-5`, so a saved Haiku pick is silently rewritten to Opus. | **Copy from mobile** (add the entry); then adopt web's richer `counselorModelKey` map on both sides. |
| 7 | Five real `user_settings` columns and both `daily_question_*` columns are absent from web's types. | **Copy from mobile** `types.ts` wholesale (see #14). |

### P1 — parity of the Cabinet's intelligence (highest user-visible value)

| # | Gap | Recommended approach |
|---|---|---|
| 8 | No per-counselor model routing: web hardcodes `claude-opus-4-5` and never reads `counselor_models`. | **Copy from mobile:** call `modelForCounselor(settings?.counselor_models, counselorId)` in `sendMessageToCounselor`. |
| 9 | No `userProfile` / `counselorSlug` in the counselor request → the server's `[KNOW THYSELF]` block and counselor-specific RAG never fire on web. | **Copy from mobile:** port `getKnowThyselfProfile()` and pass both fields. Pure win, no new infrastructure. |
| 10 | No conversation memory: web never calls `/api/memory/summarize` and never reads `conversation_memory`. | **Copy from mobile:** port `getConversationMemory`/`saveConversationMemory` + the `[MEMORY — PREVIOUS SESSIONS]` block in `buildCounselorSystemPrompt` + the fire-and-forget summarise call. |
| 11 | `gatherAppContext` lacks the meta-signals block, focus sessions, commonplace quotes, streak, Know-Thyself-incomplete note, and the fuller encoded-beliefs block with its "name the contradiction" instruction. | **Copy `buildMetaSignalsContext` verbatim** (pure function). **Adapt `buildFocusContext`** onto `localStorage` (or a new `focus_sessions` table). Port the remaining blocks straight across. |
| 12 | `buildSystemPrompt` on web drops the encoded-belief principles, the inter-counselor banter paragraph, and the active-goals appendix; `gatherUserProfile` drops the `INSTRUCTION:` paragraph. | **Copy from mobile.** These are prompt strings — a literal copy, no plumbing. |
| 13 | No message-limit accounting or `daily_limit_reached` handling; no `x-subscription-tier` header, so the server can't apply the right token ceiling. | **Copy from mobile:** port `MESSAGE_LIMITS`, `MAX_TOKENS_BY_TIER`, `checkAndIncrementMessageCount`, `MessageLimitError`, `DailyLimitError`; send the header and `max_tokens`. Note the client counter (`profiles.daily_message_count`, local date) and the server RPC (UTC date) are two separate counters — worth consolidating on the server RPC while you're here. |
| 14 | No tier gating of the cabinet roster: `getUserCabinet()` applies no `FREE_COUNSELOR_SLUGS` filter, and its defaults are long slugs that don't match seeded `counselors.slug` values. | **Copy from mobile:** port `FREE_COUNSELOR_SLUGS`, `STARTER_CABINET_SLUGS`, and the tier filter; fix the default to `['marcus','roosevelt']`. |
| 15 | `CONTEXT_WINDOW_SIZE` 30 (web) vs 15 (mobile) — different cost and different recall between platforms. | **Pick one** (15 matches the server's own `truncateMessages(…, 12)` and the tier token ceilings) and note it in a shared comment. |

### P2 — features present on mobile, absent on web

| # | Feature | Recommended approach |
|---|---|---|
| 16 | **Weekly Review** | **Copy + adapt:** `generateWeeklyReview()` and `gatherWeeklyContext()` port almost unchanged — and web is actually *better* placed, since it already implements `getCalendarData()` (the 7-day grid mobile stubs out). |
| 17 | **Portrait** (`user_longitudinal_models` + history) | **Copy from mobile:** `getLongitudinalPortrait()`, `getPortraitHistory()`, the `LongitudinalPortrait` types. Read-only, RLS already grants own-row SELECT. Cheapest high-value feature on this list. |
| 18 | **Dispatch** | **Adapt:** `GET /api/dispatch/today` / `/:id` work from any client with a Bearer token. Skip push tokens (`/api/user/push-token` is Expo-specific); do call `/api/user/timezone` so the delivery agent schedules correctly. |
| 19 | **Insight** (`GET /api/user/insight`) | **Copy:** one authenticated fetch, no client-side schema work. |
| 20 | **Scrolls write path** | **Copy from `lib/scrolls.ts`:** `triggerScrollGeneration` (calls `/api/scrolls/generate` then inserts) and `logScrollRead`. Web currently displays scrolls it can neither create nor mark read. |
| 21 | **Daily question prefetch** | **Copy:** `prefetchDailyQuestion` + `saveDailyQuestionCache` (web already has the read half). |
| 22 | **Library / Symposium / Observatory** | **Adapt:** all server endpoints are public or JWT-only. `lib/libraryComments.ts` is plain supabase-js + one fetch and ports as-is. The academy web app already has a reader to borrow layout from. |
| 23 | **Calendar signal** | **Adapt, don't copy:** replace expo-calendar with Google Calendar OAuth (or .ics import), keep `buildCalendarContext`'s output format, premium gate, and "you cannot see it because…" honesty contract verbatim. |
| 24 | **Attend / Screen Time, HealthKit vitals** | **Skip.** No web equivalent. Keep emitting the honest "not available in this build" line so a web counselor asked about steps or screen time still answers truthfully rather than inventing. |
| 25 | **Crash capture** | **Skip / replace.** `lib/crashCapture.ts` is entirely React-Native boot-failure machinery; the web equivalent is a standard error boundary. Separately: `GET /api/crash` is unauthenticated and returns 200 crash reports — worth locking down. |

### P3 — hygiene that de-risks all of the above

| # | Item | Approach |
|---|---|---|
| 26 | `cabinet_conversations`, `conversation_memory`, `crash_reports`, `user_settings.counselor_models`, `check_ins.reflection_answer/stoic_answer/streak/reading_streak` exist only in the remote DB, not in `supabase/migrations/`. | Write a catch-up migration (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) so the schema is reproducible before two clients start depending on it. |
| 27 | `types.ts`, `llmModels.ts`, `counselors.ts`/`COUNSELOR_PROFILE_MAP`, `threadService.ts`, and the streak logic are all maintained as literal twins that have already diverged. | Extract a `shared/` package (or a generated copy step) for the pure modules — types, llmModels, counselor profile prose, `buildMetaSignalsContext`, streak math. Everything with a platform dependency (storage, supabase client) stays per-app behind a thin interface. |
| 28 | Server CORS allowlist has no `localhost`. | Add a dev-only origin, or the web parity work can't be tested against the real API. |
| 29 | Mobile's `Counselor.one_line` and `Counselor.id` don't match the `counselors` table (which has `description` and `slug`). | Confirm against the live table; if `one_line` genuinely doesn't exist, fix mobile's type + `CounselorCard` to use `description`, and adopt web's (correct) `Counselor` type as the shared one. |
| 30 | Both clients send `model: 'claude-opus-4-5'` for the group Cabinet, which is not in `ALLOWED_COUNSELOR_MODELS`. | Change to `claude-opus-4-6` (or drop the field and let the server default) so pro users actually get the model they're paying for. |
