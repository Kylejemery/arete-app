import styles from '../admin.module.css'

// Static reference document: how the whole Arete system fits together.
// No data fetching — update this page when the architecture changes.

function Row({ left, title, tag, children }: {
  left: string
  title: string
  tag?: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.guideStep}>
      <div className={styles.guideWhen}>{left}</div>
      <div className={styles.guideBody}>
        <div className={styles.guideName}>
          <span>{title}</span>
          {tag && <span className={styles.guideTag}>{tag}</span>}
        </div>
        <div className={styles.guideText}>{children}</div>
      </div>
    </div>
  )
}

export default function ArchitecturePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>System architecture</h1>
        <p>The complete map of Arete — every surface, service, and connection.</p>
      </div>

      {/* ── The big picture ──────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>The big picture</div>
        <p className={styles.flowLine}>
          Arete is <strong>four user-facing surfaces</strong> sharing <strong>one backend</strong> and{' '}
          <strong>one database</strong>. The marketing site introduces the idea; the iOS app and the
          web app are the daily practice; the Academy is the school. Behind all of them sit a single
          Express API on Railway, a fleet of autonomous agents running as separate Railway cron
          services, and one Supabase project (Postgres + pgvector) holding everything: users,
          journals, conversations, the philosophical corpus, and every agent&apos;s output.
        </p>
        <Row left="pursuearete.com" title="Marketing site" tag="static">
          Standalone static site (separate <code>arete-website</code> repo). Landing page, the
          anonymous Oracle chat, privacy policy, and the SMS opt-in policy pages.
        </Row>
        <Row left="App Store" title="iOS app" tag="Expo / React Native">
          The daily-practice app. Expo Router screens, built and shipped with EAS. Talks to the
          Railway API; signs in through Supabase Auth.
        </Row>
        <Row left="app.pursuearete.com" title="App on the web" tag="Next.js / Vercel">
          The same practice in the browser — morning and evening rituals, journal, Cabinet, Scrolls
          — plus Stripe billing.
        </Row>
        <Row left="academy.pursuearete.com" title="Arete Academy" tag="Next.js / Vercel">
          The school: PhD-style curriculum, AI seminars, quizzes, vivas, the dissertation track —
          and this admin dashboard.
        </Row>
        <Row left="Railway" title="Backend API + agent fleet" tag="Node / Express">
          One always-on Express API (<code>server/index.js</code>) proxying every AI call, plus each
          autonomous agent deployed as its own Railway cron service.
        </Row>
        <Row left="Supabase" title="Database & auth" tag="Postgres + pgvector">
          One project for the entire system. Auth for all surfaces, row-level security on user data,
          vector search over the corpus.
        </Row>
      </div>

      {/* ── Repository map ───────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Repository map</div>
        <p className={styles.muted} style={{ marginBottom: 12, lineHeight: 1.6 }}>
          Two git repos. The main <code>arete-app</code> repo is a monorepo containing every
          deployable except the marketing site.
        </p>
        <Row left="arete-app" title="app/" tag="iOS app">
          Expo Router screens — tabs, morning, evening, journal, my-cabinet, counselor-chat,
          scrolls, library, observatory, dispatch, know-thyself, belief-journal, weekly-review,
          timer, progress, paywall, join-session, onboarding. <code>services/claudeService.ts</code>{' '}
          points at the Railway API via <code>EXPO_PUBLIC_API_BASE_URL</code>.
        </Row>
        <Row left="arete-app" title="web/" tag="app.pursuearete.com">
          Next.js 15 app mirroring the iOS experience for the browser, plus Stripe checkout,
          customer portal, and the Stripe webhook.
        </Row>
        <Row left="arete-app" title="academy/web/" tag="academy.pursuearete.com">
          Next.js 15. Public pages (landing, framework, library, waitlist), the student dashboard,
          all course content under <code>src/data/</code>, its own API routes for grading /
          evaluation / Scribe, and <code>/admin</code> — this dashboard.
        </Row>
        <Row left="arete-app" title="academy/corpus-ingestion/" tag="corpus tooling">
          Node scripts that fetch, clean, chunk, embed, and label primary texts into{' '}
          <code>rag_corpus</code> (generic <code>ingest-labeled-work.ts</code> plus per-work
          scripts). Runs locally or on Railway; holds the OpenAI + service-role keys in its{' '}
          <code>.env</code>.
        </Row>
        <Row left="arete-app" title="academy/post-scheduler/" tag="social">
          The Content Scheduler service — publishes approved posts to X, Bluesky, and LinkedIn.
        </Row>
        <Row left="arete-app" title="server/" tag="Railway">
          The Express API, the agent fleet (root-level <code>*-agent.js</code> plus{' '}
          <code>agents/</code>), retrieval and graph-boost libraries, and one{' '}
          <code>railway.*.json</code> per agent service.
        </Row>
        <Row left="arete-app" title="supabase/" tag="migrations">
          SQL migrations for the shared Supabase project.
        </Row>
        <Row left="arete-website" title="(separate repo)" tag="marketing">
          Static React-via-Babel site: landing page components, Oracle chat page, privacy, SMS
          opt-in policy. No build step; deployable to any static host.
        </Row>
      </div>

      {/* ── The iOS app ──────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>The iOS app — daily practice</div>
        <p className={styles.flowLine}>
          The app is the member&apos;s daily companion. <strong>Morning</strong> and{' '}
          <strong>evening rituals</strong> bookend the day; the <strong>journal</strong> captures
          reflections (and feeds the Journal Analysis agent); the <strong>Cabinet</strong> is a
          council of counselors — Marcus Aurelius, Seneca, Epictetus, and the rest — each defined by
          a reference document that becomes their system prompt, each remembering the user through
          the longitudinal model. <strong>Scrolls</strong> are generated personal texts;{' '}
          <strong>Know Thyself</strong> and the <strong>belief journal</strong> probe the user&apos;s
          own positions; the <strong>weekly review</strong> closes each week.
        </p>
        <p className={styles.flowLine}>
          The <strong>Library</strong> tab reads primary texts served from the corpus, and the{' '}
          <strong>Observatory</strong> is the public window onto the agent fleet — approved
          tensions, inquiries, world responses, and dreams. The <strong>Daily Dispatch</strong>{' '}
          arrives as a push notification at the user&apos;s local 7 AM. <strong>Shared sessions</strong>{' '}
          let a member invite someone by email (sent via Resend) into a joint conversation.
        </p>
        <p className={styles.flowLine}>
          Technically: Expo / React Native with Expo Router, built with EAS. All AI traffic goes to
          the Railway API — no model keys ever ship in the binary. Supabase handles auth and data.
          Subscriptions on iOS run through Apple; the <code>subscriptions</code> table&apos;s{' '}
          <code>billing_source</code> column keeps Apple, Stripe, and manual grants from clobbering
          each other.
        </p>
      </div>

      {/* ── The web app ──────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>The web app — app.pursuearete.com</div>
        <p className={styles.flowLine}>
          The same account and practice in the browser: morning, evening, journal, cabinet,
          scrolls, beliefs, goals, focus, and progress routes under <code>web/src/app/</code>.
          Deployed on Vercel; middleware auth-gates every route.
        </p>
        <p className={styles.flowLine}>
          <strong>Billing lives here.</strong> The upgrade page sends a plan
          (monthly / yearly / pro) to <code>/api/create-checkout</code>; Stripe price IDs stay in
          server-only env. The webhook at <code>/api/stripe-webhook</code> (explicitly exempted from
          the auth middleware — its signature is its auth) writes the <code>subscriptions</code> row
          and the profile tier: monthly/yearly → <code>premium</code>, pro → <code>pro</code>. It
          never downgrades a profile that has an <code>apple</code> or <code>manual</code> billing
          row — Stripe is only the source of truth for Stripe customers.
        </p>
      </div>

      {/* ── The Academy ──────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>The Academy — academy.pursuearete.com</div>
        <p className={styles.flowLine}>
          A degree-style program in Stoicism: <strong>PHIL 701–704</strong> (the core sequence),{' '}
          <strong>PHIL 705</strong> (Stoic Logic), <strong>PHIL 706</strong> (anger and Socratic
          intellectualism, with a five-week practicum), <strong>PHIL 707</strong> (the Prokopton in
          the Digital Age, fast-gated capstone), and parallel language tracks{' '}
          <strong>GREK 101/201</strong> and <strong>LATN 101/201</strong>. All course content lives
          as TypeScript data in <code>academy/web/src/data/</code>.
        </p>
        <p className={styles.flowLine}>
          <strong>Progression is quiz-gated:</strong> pass session N&apos;s quiz (≥70%) to unlock
          N+1, recorded in <code>session_progress</code>. Quizzes mix open (AI-graded via{' '}
          <code>/api/academy/grade</code>, Opus with structured outputs), multiple-choice, and
          multi-select questions.
        </p>
        <p className={styles.flowLine}>
          <strong>Seminars use a two-role design:</strong> the <strong>Proctor</strong> teaches (a
          Railway endpoint with course-scoped RAG over the corpus) while the{' '}
          <strong>Evaluator</strong> judges (<code>/api/academy/evaluate</code>) against per-session
          objectives — recitation caps at &quot;partial&quot;, evidence quotes are verified
          near-verbatim, status only moves up without misconceptions. Seminar threads persist per
          (user, course, session) in <code>academy_sessions</code>.
        </p>
        <p className={styles.flowLine}>
          Beyond seminars: <strong>vivas</strong> (six-question oral exams with the Examiner),
          the <strong>dissertation track</strong> (proposal → chapters → defense, with a Writing
          Supervisor), the <strong>practicum</strong> pages (anger protocol, digital fast), the{' '}
          <strong>vocab drill</strong> (SM-2-lite spaced repetition over the full Greek and Latin
          decks), and the <strong>Paidagōgos advisor panel</strong> on the dashboard, which reads
          progress across every course and points to the next task.
        </p>
      </div>

      {/* ── Library & corpus ─────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>The Library &amp; the corpus</div>
        <p className={styles.flowLine}>
          <strong><code>rag_corpus</code> is the substrate of the whole system</strong> — 11,000+
          embedded chunks of primary Stoic and adjacent texts (Epictetus, Seneca&apos;s letters and
          essays, Marcus Aurelius, Musonius Rufus, Plato, Cicero, Plutarch, Diogenes Laertius, and
          growing). Chunks carry passage locators (&quot;Discourses 1.24&quot;, &quot;Letters
          47&quot;, &quot;Meditations 5.1&quot;) and translator metadata, which is what lets Scribe
          verify citations deterministically.
        </p>
        <p className={styles.flowLine}>
          Ingestion happens through <code>academy/corpus-ingestion</code> scripts, fed by the admin
          Corpus Ingestion queue — which the Coverage Gap and Inquiry agents populate with approved
          recommendations. Approved Synthesis and Consolidation documents are the only agent output
          ever ingested back in.
        </p>
        <p className={styles.flowLine}>
          The corpus surfaces in three places: the <strong>Library of Arete</strong> shelves (a{' '}
          <code>library_shelf()</code> RPC derived directly from <code>rag_corpus</code>), the
          curated static list on the Academy dashboard&apos;s library page, and the{' '}
          <strong>iOS Library reader</strong> via the API&apos;s <code>/api/library/*</code> routes.
          The <strong>Observatory</strong> (app + API routes) is the corpus&apos;s public voice.
        </p>
      </div>

      {/* ── Backend API ──────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>The backend API — Railway</div>
        <p className={styles.muted} style={{ marginBottom: 12, lineHeight: 1.6 }}>
          One Express service (<code>server/index.js</code>) fronts every model call so no API key
          ever reaches a client. Claude powers counselors and agents; OpenAI provides embeddings;
          Gemini and Grok keys optionally enable those counselor models. Endpoint families:
        </p>
        <Row left="conversation" title="Chat & counselors">
          <code>/api/chat</code>, <code>/api/chat/counselor</code>, <code>/api/memory/summarize</code>,
          shared sessions (<code>/api/sessions/*</code> — invites emailed via Resend),{' '}
          <code>/oracle</code> (the marketing site&apos;s anonymous chat), and an OpenAI-compatible{' '}
          <code>/v1/chat/completions</code>.
        </Row>
        <Row left="academy" title="Seminar AI">
          <code>/api/academy/seminar</code> and <code>/api/academy/agent</code> — Opus with RAG
          scoped per course (PHIL 701–704 retrieve via counselor slug; 706/707 via author-scoped{' '}
          <code>match_rag_corpus</code>), plus <code>/api/examine/proctor</code>.
        </Row>
        <Row left="content" title="Generation & delivery">
          <code>/api/scrolls/generate</code>, <code>/api/onboard</code> +{' '}
          <code>/api/onboard-web</code>, <code>/api/dispatch/today</code>,{' '}
          <code>/api/user/push-token</code> and <code>/api/user/timezone</code> (dispatch
          targeting), <code>/api/user/insight</code>.
        </Row>
        <Row left="library" title="Library & Observatory">
          <code>/api/library/texts</code> / <code>text</code> / <code>debate</code> /{' '}
          <code>related</code>, <code>/api/library/observatory</code>, and the public{' '}
          <code>/api/observatory/*</code> feeds (tensions, inquiries, world, dreams).
        </Row>
        <Row left="admin" title="Run-now hooks">
          <code>/api/admin/&lt;agent&gt;/run</code> endpoints let this dashboard fire any agent
          on demand between its scheduled runs.
        </Row>
      </div>

      {/* ── Agent fleet ──────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>The agent fleet</div>
        <p className={styles.flowLine}>
          Thirteen autonomous agents run on a nightly/weekly cadence, each as its{' '}
          <strong>own Railway cron service</strong> (one <code>railway.*.json</code> per agent;
          crons are scheduled manually in Railway by convention). They communicate only through
          shared Supabase tables — no agent calls another directly. The daily agents grow the
          corpus and read the community; the Monday chain (Gap → Tension → Synthesis → Inquiry)
          turns that into thinking; the Dispatch carries it to users; Sunday the fleet reflects on
          itself, then dreams; and the nightly Consolidation agent strengthens the concept graph
          the retrieval layer learns from.
        </p>
        <p className={styles.flowLine}>
          <strong>Nothing reaches the corpus or a user without human approval.</strong> Every
          generative agent writes to a pending-review state; the admin tabs are the gates. The full
          pipeline, schedule, and interaction map live on the{' '}
          <strong>Overview tab</strong> (&quot;How the fleet works&quot;), so it isn&apos;t repeated
          here. Roster: RAG Corpus, World, Journal Analysis, Longitudinal Model, Coverage Gap,
          Tension, Synthesis, Inquiry, Daily Dispatch (a generation agent plus an hourly delivery
          agent honoring each user&apos;s local 7 AM), Counselor Broadcast delivery (the one agent
          that generates nothing — it carries a hand-written message from a counselor to the
          Cabinet chat, hourly, at each member&apos;s chosen local hour), Content Scheduler,
          Self-Reflection, Dreaming, and Consolidation — plus the Paper agent behind the Papers
          tab.
        </p>
      </div>

      {/* ── Learning system ──────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>The learning system</div>
        <p className={styles.flowLine}>
          The retrieval layer learns from outcomes. <strong>Every retrieval is logged</strong> to{' '}
          <code>retrieval_log</code> (seminar, cabinet, counselor, and oracle paths), and{' '}
          <code>response_outcomes</code> records how the response landed — Evaluator verdicts fan
          out to a session&apos;s requests, and the Consolidation agent adds heuristic labels (a
          quick rephrase of the same question counts against the passages that failed to help).
        </p>
        <p className={styles.flowLine}>
          Nightly, the <strong>Consolidation agent</strong> runs five passes: a Hebbian update
          strengthening <code>concept_edges</code> between passages that succeed together; a
          synthesis pass where Opus writes scholarly notes over strong cross-work clusters
          (approved notes are embedded into the corpus); decay and pruning; selection pressure
          (approved syntheses that underperform get deprecated out of retrieval); and a morning
          report. With <code>GRAPH_BOOST</code> enabled, retrieval expands vector hits through the
          learned graph — <code>retrieval_log.retrieval_mode</code> records vector vs. graph-boost
          for comparison. The planned final phase is a trainable reranker, waiting on ~2,000
          outcome-labeled retrievals.
        </p>
      </div>

      {/* ── Scribe ───────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Scribe — the writing desk</div>
        <p className={styles.flowLine}>
          Scribe turns rough notes into cited essays, entirely inside this admin.{' '}
          <strong>The pipeline</strong> (Scribe tab): Distill a brief → Retrieve per-claim over the
          corpus → Draft with Opus using citation handles that are mapped server-side to chunk
          UUIDs (a fabricated citation cannot be expressed) → Verify every quote verbatim and every
          locator numerically → emit deterministic APA/Chicago references. Social-format output
          queues into the Content Scheduler as pending posts.
        </p>
        <p className={styles.flowLine}>
          <strong>Scribe Chat</strong> is the conversational mode — essay development where the
          model drives a <code>search_corpus</code> tool per turn; primary and public-domain text
          may be quoted, summaries only paraphrased. <strong>The Log</strong> is the commonplace
          book: journal fragments, thoughts, and clippings, embedded on save, semantically
          searchable, and pullable into any chat via a <code>search_journal</code> tool — your own
          words rank senior to the corpus and are always quotable.
        </p>
      </div>

      {/* ── Admin ────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>This admin dashboard</div>
        <p className={styles.flowLine}>
          <code>/admin</code> lives inside the Academy web app. A single layout gate checks the
          signed-in Supabase user against <code>NEXT_PUBLIC_ADMIN_EMAIL</code>; everyone else is
          redirected home. Admin API routes use the service-role key server-side.
        </p>
        <p className={styles.flowLine}>
          The tabs follow the fleet&apos;s weekly pipeline: agent monitoring and review gates
          (Overview through Dreams), the writing desk (Scribe, Chat, Log), and operations
          (Scheduler, Corpus Ingestion, Papers). The Overview page documents the admin&apos;s
          responsibilities in full — in short: approve everything generative, triage distress
          flags, curate the ingestion queue, and keep the Railway crons healthy.
        </p>
      </div>

      {/* ── Data layer ───────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Data layer — one Supabase project</div>
        <Row left="identity" title="Users & billing">
          Supabase Auth, <code>profiles</code> (tier flags), <code>subscriptions</code> (one row
          per source: stripe / apple / manual).
        </Row>
        <Row left="practice" title="App data">
          Journals and entries, cabinet/counselor threads, scrolls, beliefs, goals, dispatch
          deliveries, push tokens, shared sessions.
        </Row>
        <Row left="corpus" title="Corpus & library">
          <code>rag_corpus</code> (labeled, embedded chunks with <code>source_type</code> /{' '}
          <code>deprecated</code> lifecycle columns), ingestion queue, significance map,{' '}
          <code>scribe_source_chunks</code> (private paper full-texts, never published).
        </Row>
        <Row left="agents" title="Fleet output">
          Per-agent tables: journal analyses, gap reports, tensions, syntheses, inquiries, world
          observations, dreams (<code>corpus_dreams</code>), reflection reports, consolidation
          reports, longitudinal user models, <code>post_queue</code>.
        </Row>
        <Row left="academy" title="School records">
          <code>session_progress</code> (quiz grades, gating), <code>academy_sessions</code>{' '}
          (seminar threads), <code>objective_status</code> + <code>evaluations</code>,{' '}
          <code>practice_log</code>, <code>practicum_logs</code>, <code>vocab_progress</code>,{' '}
          <code>dissertations</code> + chapters, <code>academy_enrollments</code>.
        </Row>
        <Row left="learning" title="Learning loop">
          <code>retrieval_log</code>, <code>response_outcomes</code>, <code>concept_edges</code>{' '}
          (the Hebbian graph). Note: <code>retrieval_events</code> is a different, older table —
          the Observatory&apos;s per-concept &quot;Living Sky&quot;.
        </Row>
        <Row left="scribe" title="Writing desk">
          <code>scribe_projects</code> + pipeline drafts, <code>scribe_entries</code> /{' '}
          <code>scribe_messages</code> / <code>scribe_entry_drafts</code> (chat),{' '}
          <code>scribe_log_items</code> (the Log). All RLS deny-all; service-role only.
        </Row>
      </div>

      {/* ── Keys & configuration ─────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Keys &amp; configuration</div>
        <p className={styles.flowLine}>
          Secrets are runtime-only, never committed or baked into images. The{' '}
          <strong>Railway API and each agent service</strong> carry their own variables (Anthropic,
          OpenAI, Supabase URL + service-role, optional Gemini / Grok / Resend, feature flags like{' '}
          <code>GRAPH_BOOST</code>). The <strong>web app on Vercel</strong> holds the Stripe secret,
          webhook secret, and price IDs. The <strong>Academy on Vercel</strong> holds its Anthropic
          key (grading, evaluation, Scribe), Supabase creds, and <code>NEXT_PUBLIC_ADMIN_EMAIL</code>.
          The <strong>iOS app</strong> ships only the public API base URL and Supabase anon key.
        </p>
      </div>

      {/* ── How it all connects ──────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Three flows that tie it together</div>
        <p className={styles.flowLine}>
          <strong>A member&apos;s morning:</strong> the Dispatch delivery agent notices it&apos;s 7 AM
          in their timezone and pushes today&apos;s reflection (community themes + latest synthesis +
          world context, generated before dawn). They open the app, do the morning ritual, journal,
          maybe consult the Cabinet — where their counselors already know them through the
          longitudinal portrait. Tonight, the Journal Analysis agent reads what they wrote, and the
          fleet&apos;s picture of the community sharpens.
        </p>
        <p className={styles.flowLine}>
          <strong>A seminar session:</strong> a student opens PHIL 703 session 4. The Proctor
          (Railway, Opus + course-scoped corpus retrieval) teaches; every retrieval is logged.
          Every five turns the Evaluator silently scores the objectives and steers the Proctor.
          All objectives demonstrated → closing synthesis → quiz → AI-graded → next session
          unlocks. The Evaluator&apos;s verdict flows back into the learning loop as retrieval
          outcomes.
        </p>
        <p className={styles.flowLine}>
          <strong>A Monday:</strong> World scans the week&apos;s signals; Journal Analysis has been
          reading all week; Coverage Gap turns demand into ingestion recommendations; Tension
          surfaces contradictions; Synthesis writes across thinkers; Inquiry poses what remains
          open. You approve the good work in these tabs — syntheses join the corpus, tensions and
          inquiries light up the Observatory, reading queues into ingestion — and Sunday night the
          fleet writes its own health report, then dreams.
        </p>
      </div>
    </div>
  )
}
