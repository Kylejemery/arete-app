# Scribe — Phase 0 Discovery

Findings from exploring the `arete-app` monorepo before building the Scribe writing agent.
Date: 2026-07-15. Scope: admin dashboard, RAG corpus, Anthropic call patterns, social
scheduler, existing papers pipeline. Where the build plan conflicts with what exists,
the recommendation adapts to the codebase.

---

## 1. Admin dashboard

- **App**: `academy/web` — Next.js 15 App Router, React 19, Tailwind 3 + CSS modules
  (`admin.module.css` for admin chrome), TypeScript. Deployed on Vercel.
- **Routing**: all admin pages under `src/app/admin/<agent>/page.tsx`; a shared
  [`admin/layout.tsx`](../academy/web/src/app/admin/layout.tsx) renders the tab bar
  (`TABS` array — Scribe gets one new entry) and the auth gate.
- **Auth (two layers, both email-based — there is no `profiles.is_admin` in the web app path)**:
  - Client gate: `supabase.auth.getUser()` email must equal `NEXT_PUBLIC_ADMIN_EMAIL`.
  - Every admin API route re-checks server-side: `user.email !== process.env.ADMIN_EMAIL → 401`
    via `createClient()` from `@/lib/supabase-server`.
  - Scribe follows this exactly. No new auth machinery.
- **Serverless limits**: admin routes run on Vercel; `export const maxDuration = 30` is the
  observed convention. Anything longer is delegated to the always-on Railway server
  (see §5, papers pattern). Scribe's pipeline stages must each fit a single route call
  or be delegated.

## 2. Social scheduler (existing, reused as-is)

- UI: `/admin/scheduler` → `ContentScheduler.tsx`.
- `POST /api/generate-posts` — drafts platform posts with the Anthropic SDK directly
  (`PLATFORM_RULES` per platform: x, linkedin, bluesky, instagram, threads, facebook).
- `POST /api/schedule-posts` — direct platforms (**x, linkedin, bluesky** via
  `lib/social/{x,linkedin,bluesky}.ts`, dispatched through `lib/social/index.ts:postDirect`)
  post immediately, or are inserted into **`post_queue`**
  (`platform, text, scheduled_at, status, error_message, sent_at`) for the cron.
  Non-direct platforms go through Buffer (env-gated).
- `GET /api/cron/post-due` + `academy/post-scheduler` (Railway poller) send due queue rows.
- **Scribe handoff**: insert rows into `post_queue` with a **future `scheduled_at` chosen by
  the user, never auto** — or better, hand the drafted texts to the existing scheduler UI
  flow so review/scheduling stays in one place. Nothing new to build for posting itself.

## 3. RAG corpus (`rag_corpus`)

- **Columns**: `id uuid, program_id ('stoicism-phd', NOT NULL), author, work, section_label,
  chunk_index, chunk_text, word_count, translator, source_url, text_type, language,
  course_relevance, difficulty, embedding vector(1536), source_chunk_index, paired_chunk_id,
  created_at`.
- **Embeddings**: OpenAI **`text-embedding-3-small`, 1536 dims** (fetch-based call in
  [`lib/corpus/ingest.ts:embedChunk`](../academy/web/src/lib/corpus/ingest.ts)).
- **Chunking**: **400 words, 50-word overlap**; upsert conflict key
  `author,work,program_id,chunk_index`; appends via `maxChunkIndex()`.
- **`text_type` values in use**: `primary`, `summary`, `paper_summary`, `synthesis` (+ others).
  11,423 chunks live.
- **Retrieval RPCs**:
  - `match_rag_corpus(query_embedding, match_count, filter_author, filter_language)` —
    returns chunk fields + similarity **but NOT `id`** (deliberately omitted).
  - `match_rag_corpus_ids(...)` — the gap agent's variant that does return ids.
  - `match_academy_chunks` is **deprecated**.
  - **Consequence for Scribe**: citation integrity requires chunk ids at retrieval time →
    Scribe uses `match_rag_corpus_ids` (or one new RPC `match_rag_corpus_cited` returning
    `id + chunk_text + author/work/section_label/translator/text_type + similarity`).
    Do not modify the existing RPCs.

### ⚠ Finding that changes the plan: no passage-level metadata on primary texts

`section_label` is **empty** for the core Stoic works (Epictetus *Discourses* — 459 chunks,
*Enchiridion* — 41, Cicero, Aristotle, etc.). Chunks are 400-word windows over whole works,
not aligned to *Meditations* 4.3-style passages. Therefore:

- **Canonical-locator verification (plan Stage D, "Meditations 4.3 must match chunk
  metadata") cannot work today** for primary texts — the metadata doesn't exist.
- What CAN be verified deterministically: (a) every citation resolves to a real chunk id,
  (b) quoted text string-matches the chunk verbatim, (c) author/work match, (d) paraphrase
  support via cheap-model check.
- **v1 policy (recommended)**: primary-source citations render as *Author, Work* + quote,
  with the model's canonical passage number included only as **unverified**, visually
  marked ⚠ in the verification panel ("locator unverifiable — corpus lacks passage
  metadata"). Translator credit comes from `rag_corpus.translator` where present.
- **Future work (separate project, out of Scribe v1)**: enrich `rag_corpus` with
  passage-aligned `section_label`s for the big four authors; the locator check then
  switches on automatically.

## 4. Anthropic call patterns (two, both legitimate)

1. **Railway server** (`server/index.js`): raw `fetch` to the Messages API;
   `agentRouter(agentType)` maps agent → model:
   `claude-opus-4-6` (proctor, examiner, writing-supervisor, philologist, counselor),
   `claude-haiku-4-5-20251001` (language-drills). Personas in `AGENT_PERSONAS`.
2. **Web admin routes**: `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` from
   `@anthropic-ai/sdk` (already a dependency), models observed: `claude-sonnet-4-6`,
   `claude-haiku-4-5-20251001` (e.g. `generate-posts`, `corpus-ingest/summarize`,
   `gap-agent/triage`).

**Scribe uses pattern 2** (web admin routes) — it is interactive, admin-gated, and each
stage is a bounded call. Model routing mirrors `agentRouter` conventions in a small local
map: Distill = sonnet, Draft = **opus-4-6**, Verify-paraphrase = haiku, Format = haiku/sonnet.
No parallel client; one shared helper module `lib/scribe/anthropic.ts` wrapping the SDK with
per-stage `max_tokens` caps and token logging.

## 5. Papers pipeline (existing — significant overlap with the plan's Component 1)

The repo **already has** a scholarly-PDF pipeline:

- `paper_submissions` table (author, work, year, venue, source_url, **storage_path**,
  summary_text, detected_title/authors, key_concepts[], page_count, model_used, status
  queued→summarizing→pending_review→ingested, review_notes, rag_chunk_ids[], ...).
- Private Supabase Storage bucket **`papers`**; browser uploads via signed URL
  (`/api/admin/papers/upload-url`).
- The Railway **paper agent** (`server/agents/paper-agent.js`) sends the **base64 PDF
  straight to Claude** (native PDF support, 20 MB cap) and writes a reviewed summary —
  no pdf-parse/unpdf library anywhere; `pdfjs-dist` is used client-side only (gap-agent page).
- After Kyle approves, `lib/papers/ingest.ts` chunks/embeds the **summary** into
  `rag_corpus` as `text_type='paper_summary'` (deliberate copyright stance: the paper's own
  text is never ingested).

**Conflict with the Scribe plan** (`scribe_sources` + `scribe_source_chunks` with full-text
chunks) and the resolution I recommend:

- **Reuse, don't duplicate**: Scribe's "papers corpus" = the existing pipeline. New sources
  enter through the existing `/admin/papers` flow. `scribe_sources` becomes a thin
  bibliographic overlay (citation_key `hadot1995`, csl-ish fields for APA/Chicago
  rendering, FK → `paper_submissions.id` when the source came through that flow).
- **Full-text grounding is still needed for verbatim quotes** (a summary can't verify a
  quote from the paper). So `scribe_source_chunks` (full text, same 400/50 chunking, same
  embedding model/dim) is created **only when the user opts a source into "quotable"** —
  extracted server-side from the already-stored PDF in the `papers` bucket. These chunks
  are private grounding material: retrieved and verified against, **never ingested into
  `rag_corpus` and never rendered beyond fair-use quotes**. This keeps the repo's
  copyright stance intact while satisfying "quotes are verified verbatim."
- PDF text extraction for this path: `unpdf` (Node, serverless-friendly) as a new
  dependency, OR ask Claude to return page-anchored extractions — recommend `unpdf`
  for determinism.

## 6. Existing tables Scribe will reference (no changes to them)

`rag_corpus`, `paper_submissions`, `post_queue`, `corpus_sources` (bookkeeping for corpus
works; `rag_chunk_ids[]`), `profiles`. New Scribe tables (`scribe_projects`, `scribe_notes`,
`scribe_sources`, `scribe_source_chunks`, `scribe_drafts`, `scribe_style_profiles`) follow
the migration conventions in `supabase/migrations/` (timestamped SQL files, RLS enabled,
service-role writes from admin routes).

## 7. Adaptations to the build plan (summary)

| Plan says | Codebase says | Adaptation |
|---|---|---|
| `chunk_table ∈ {rag_corpus, scribe_source_chunks}` | ✓ compatible | keep |
| Locator sanity vs. `rag_corpus` work/passage metadata | primary texts have **no passage metadata** | quote + author/work verification in v1; locators marked unverified; corpus enrichment = future project |
| Component 1 builds paper ingestion | already exists (`paper_submissions` + Railway agent) | reuse; add citation-key overlay + opt-in full-text chunks for quotability |
| PDF lib "already used in repo if any" | none server-side (Claude-native PDF) | `unpdf` for deterministic full-text extraction |
| `agentRouter` reuse | server-side only; web routes use SDK directly | Scribe = web-route SDK pattern with a local stage→model map (opus-4-6 drafts, haiku mechanical) |
| Admin auth "reuse existing dashboard auth" | email gate (`ADMIN_EMAIL`), not `is_admin` | use email gate |
| Scheduler handoff | `post_queue` + `/api/schedule-posts` | insert drafts for user-scheduled posting only |
| Embeddings "same model/dim" | `text-embedding-3-small`, 1536, 400w/50 overlap | mirror exactly |
| Retrieval | `match_rag_corpus` returns no `id` | use `match_rag_corpus_ids` or add `match_rag_corpus_cited` |
| Long-running stages | Vercel `maxDuration` limits | each stage = one bounded route call, resumable; ingestion loops chunked client-driven like `corpus-ingest` |

## 8. Open questions for Kyle (blocking before Build step 2)

1. **Full-text quotability**: OK to store private full-text chunks of uploaded papers in
   `scribe_source_chunks` (never published, never in `rag_corpus`) so quotes can be
   verified verbatim? If no — papers become paraphrase-only sources (cited via summaries),
   and quote verification applies only to primary texts.
2. **Locator policy**: accept v1's "canonical passage numbers rendered but marked
   unverified" for primary texts, with corpus passage-metadata enrichment as a separate
   later project?
3. **Style exemplars**: paste 3–6 past Substack posts when the style-profile UI lands
   (nothing exists in the repo to import automatically).
