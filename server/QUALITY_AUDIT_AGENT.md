# Nightly Quality Audit Agent

Autonomous nightly job (`quality-audit-agent.js`) — the fleet's auditor.

The other agents grow the system or measure what it lacks. The Corpus Agent
ingests, the Coverage Gap Agent finds the works the corpus should hold and does
not, the Weekly Self-Reflection Agent narrates how the week went. **None of them
asks whether what is already in there is correct.** This one does, and it covers
the material as well as the code.

It reads and reports. It changes nothing — no deprecations, no re-ingests, no
commits, no pushes. Every finding names what to do; a person decides whether to.

## What it checks

Twenty-nine probes across four domains. A probe is a named check that knows one
thing, returns findings, and never writes.

### `corpus` — the standing rules

| Probe | What it catches |
| --- | --- |
| `corpus.metadata_required` | Post-standard ingests missing `translator`, `source_url` or `edition_year` (Part 5 of the acquisition plan), with the offending works named. |
| `corpus.apparatus` | Editorial apparatus in the verbatim layers, found by shape rather than by reading: Gutenberg headers, producer and transcriber notes, YAML front matter, tables of contents, and runs of the editor's numbered citations. The read pass finds this class only in the chunks it happens to sample; this finds all of it every night. |
| `corpus.copyright_fence` | A verbatim layer carrying an `edition_year` after 1930 — the failure the standing copyright rule exists to prevent. |
| `corpus.mode2_length` | A long Mode 2 work that does **not** name its own author through the text — what a verbatim ingest wearing the summary label looks like. Length alone is only reported as info: a genuine rewrite talks *about* its author ("Holiday argues", "Mates notes"), so voice is the copyright signal and length is a note about how much retrieval mass one modern work carries. |
| `corpus.text_type_fence` | A `text_type` in `rag_corpus` that `server/lib/corpus-fence.js` does not list — a layer whose visibility nobody has decided, and which every surface is therefore free to retrieve. |
| `corpus.identity_collisions` | One work living under two author strings. The filename parser has produced this before. |
| `corpus.write_target_drift` | `source_text_chunks` carrying newer rows than `rag_corpus`. This once cost months of ingests. |
| `corpus.embedding_missing` | Live chunks with no embedding: in the corpus, invisible to every search. |
| `corpus.sequence_gaps` | A `chunk_index` inside a work's range with **no row at any deprecation state** — an ingest that stopped short. Deliberately deprecated apparatus is excluded, which is the difference between a useful finding and 635 false ones. |
| `corpus.duplicate_text` | Identical chunk text: a wasted embedding, and one passage that can return twice in a single retrieval and read as two witnesses. |
| `corpus.locator_quality` | A locator that cannot cite the passage it labels (Part 5 rule 3): a scheme pitched at the wrong level, or a post-standard ingest with no locator at all. The median chunks per locator is the signal and the worst locator is not — `Discourses 4.1` really is that long, and Augustine's 636 locators over 1006 chunks are a correct parse. Yonge's Diogenes Laertius put all 71 chunks of Book 10 under `10.1`. |
| `corpus.question_map` | Works ingested since the standard with no `corpus_question_registrations` row (Part 5 rule 4). |
| `corpus.queue_health` | Failed queue rows nothing retries, and pending rows older than the batch cadence. |
| `corpus.retrieval_latency` | Times `match_rag_corpus` on five fixed out-of-corpus queries through the real PostgREST path. It was written when the function was an exact scan (183k buffers, 7.7s cold against PostgREST's 8s cancel at 13.7k chunks), fired on its first cold reading on 2026-09-20, and that reading is why retrieval now runs on an HNSW index (`20260920153919_rag_corpus_hnsw.sql`, then the author-size routing migration after it: ~2.6k buffers, single-digit ms warm, 99.7% recall on the fixed query set). Warns when the warm median passes `retrieval_warn_ms` or any call passes `retrieval_critical_ms`; critical on a failed call. Runs **before** the fences probe so it takes the cold call. It stays because the planner can abandon the index — it did at `hnsw.ef_search` 250 in testing — and that would look exactly like the old exact scan. |
| `corpus.retrieval_fences` | **End to end**: embeds real queries, calls `match_rag_corpus` with `counselorRetrievalParams()`, and asserts that nothing deprecated and nothing on the exclusion list comes back. Needs `OPENAI_API_KEY`. |

### `library` — the reading rooms and the Garden

`library.exhibit_integrity` (a gallery exhibit missing the passage, citation or
Agora prompt its status promises), `library.exhibit_reachable` (a gallery
exhibit whose page does not load — the row was promoted before the page
shipped, or the Academy's `RELEASED_PLAYGROUND` gate does not list its slug and
404s it), `library.exhibit_thinkers` (an exhibit citing
a thinker the corpus cannot show a passage for), `library.shelf_orphans` (a
`library_overrides` row pointing at a work that was deprecated or re-labelled out
from under it — including a *hidden* override that no longer matches, which
quietly puts a work back on the shelf), and `library.presentation_gaps` (works
still shelved under a one-word filename fragment, authors with no spine colour,
works displaying no era).

### `repo` — the code

`repo.checkout_stale` (is this checkout current with its base?),
`repo.migration_drift` (SQL applied to the project with no committed file, and
files never applied — the convention nothing could previously enforce),
`repo.cron_targets` (a Railway config naming a script that does not exist),
`repo.exhibit_release_gate` (a gallery exhibit whose Academy page this checkout
neither ships nor releases), `repo.checks` (lint and typecheck per workspace),
`repo.secret_scan` (key-shaped strings in tracked files), `repo.doc_links`
(committed docs linking to paths that moved), and
`repo.retrieval_guarantees` (a retrieval path that reaches `rag_corpus`
without restating what `match_rag_corpus` guarantees in SQL — the graph-boost
expansion reading without `deprecated = false`, or an `expandCandidates` call
site passing no fence). Both have been missing there before. The expansion is
behind `GRAPH_BOOST`, so a regression is silent until the flag is on and by
then it is serving text to a reader; and because `opts.fence` is optional and
defaults to allowing everything, a call site that omits it is not an error but
an unfenced path.

`repo.checkout_stale` is a guard as much as a finding. Every repo probe compares
the project against whatever branch is on disk, so a checkout behind its base
reports the base's own work as missing. That is not hypothetical: the drift
probe's first run claimed five uncommitted migrations, three of which had landed
on `main` while the branch was being written, and committing the recovered
copies added duplicate files for migrations the repo already had.

So while the checkout is behind — or while the comparison could not be made at
all — `repo.migration_drift` and `repo.exhibit_release_gate` downgrade their
critical findings to info and say why, because at that point neither can tell
"never written" from "written on the base, not here yet". It fetches the base
branch to decide (a remote-tracking update only: no working tree, no local
branch, nothing to undo), and reports "unknown" rather than assuming current
when the fetch fails, because in a report someone acts on, those two must not
look alike.

`repo.exhibit_release_gate` and `library.exhibit_reachable` ask one question in
two places. The Garden lists every `gallery` row; whether the page behind it
loads depends on a route existing and on the slug appearing in
`RELEASED_PLAYGROUND` in `academy/web/src/middleware.ts`. The library probe asks
the deployed site over the network, so it needs egress and answers only after a
deploy. This one reads the checkout, so it answers before one, offline, and on
the branch where the fix belongs. Where both can run they will usually agree —
and where they disagree they are each right about their own half: a gate fixed
on this branch but not yet deployed fails only the network probe, and a slug
dropped on this branch while still live fails only this one.

### `material` — the part no query can see

`material.sampled_chunks` reads a bounded random sample of live chunks, weighted
toward recent ingests, and flags front matter and publisher boilerplate, editorial
apparatus filed under the philosopher's own name, OCR wreckage, wrong section
labels, and empty chunks. Deliberately conservative: it is told that a chunk
starting mid-sentence is normal (400-word chunks, 50-word overlap) and that
archaic translation is the design. A judgment probe that cries wolf costs more
than it saves, because the report stops being read.

## What makes the report readable

**The diff.** Each run compares its findings against the previous completed run
with the same domain coverage, and marks each `new` or `ongoing`, listing what
cleared. The morning brief leads with what changed.

**Fingerprints.** Every finding carries a stable `fingerprint` (`probe` or
`probe:key`) that must not contain a count or a date, because the diff and the
mute list are keyed on it.

**Mutes.** Accepted debt goes in `quality_audit_mutes` and stops appearing:

```sql
insert into quality_audit_mutes (fingerprint, reason, expires_at) values
  ('library.exhibit_thinkers',
   'Chrysippus survives only in doxographers; revisit if a fragment collection is ingested',
   null);
```

Every finding printed by the agent comes with its own mute statement, ready to
paste. An expired mute stops applying and the finding returns.

**A probe that throws becomes a finding.** A broken probe is a hole in the audit,
not a clean corner, so it is reported as a warning rather than killing the run.

## Running it

```bash
cd server
npm run audit                                  # everything the environment supports
node quality-audit-agent.js --domains corpus   # one domain
node quality-audit-agent.js --probe corpus.mode2_length --dry-run
node quality-audit-agent.js --sample 0         # skip the paid read pass
node quality-audit-agent.js --json             # findings as JSON
node quality-audit-agent.js --fail-on-critical # exit 1 on a surviving critical
```

`--dry-run` writes no report row. `--fail-on-critical` makes it usable as a gate.

## Where it runs, and why that is two places

The repo probes need a checkout on disk. A Railway cron service rooted at
`server/` does not have one, so they declare `needs: ['repo']` and **skip
themselves** there, saying so rather than passing silently.

| | Railway cron (nightly) | A session with the repo (Claude Code, or local) |
| --- | --- | --- |
| `corpus`, `library`, `material` | yes | yes |
| `repo` | skipped — no checkout | yes |

So the nightly Railway run audits the material, and a run with the repo present
additionally audits the code. Both write to the same table and diff against each
other correctly, because the diff only compares runs whose domain coverage
matches.

### Railway scheduling (its own cron service)

A **separate** cron service, matching the corpus, journal and gap agents rather
than bolting onto the API process.

> **The dashboard is authoritative, not the JSON file.** Railway's Config as
> Code (`railway.json` / `railway.toml`) is deprecated: **new services cannot
> opt into it at all**, and existing files stop being read on **2026-12-01**.
> So `server/railway.quality-audit-agent.json` is a record of intent that
> nothing enforces — the settings below are what actually run the service, and
> the file and the dashboard can silently disagree. The replacement is
> Infrastructure as Code (`.railway/railway.ts`, via `railway config migrate`).
> The other fifteen `server/railway.*.json` files are on the same clock.
>
> Two further traps if you do wire a legacy service to a config file: the path
> is absolute from the repo root and does **not** follow the Root Directory
> (`/server/railway.quality-audit-agent.json`, not the bare filename), and a
> config file that is read overrides the dashboard values for that service.

1. In the Railway project, **New → GitHub Repo** pointing at this repo.
2. Set the service's **Root Directory** to `server`.
3. Configure the service (Settings) — these are the settings that run it:
   - **Start command**: `node quality-audit-agent.js`
   - **Cron schedule**: `0 9 * * *` → 09:00 UTC, after the nightly Corpus Agent
     (08:00 UTC) so it measures the freshest corpus.
   - **Restart policy**: `NEVER` (cron jobs run once and exit).
4. Add the environment variables below.

Verified against a `server/`-only install with no parent repo, which is what
the service sees: the agent loads, all probes register, `findRepoRoot` returns
nothing so the repo probes skip rather than crash, and a missing or unreachable
Supabase exits non-zero rather than reporting a clean night.

A cron service sleeps between runs, so the standing cost is one model call for
the brief plus the sampled read pass — four Sonnet calls a night at the default
sample of 40.

#### Running it by hand, and what a merge does to a run

Learned on 2026-09-18, the day the first on-demand runs were attempted:

- **A redeploy does not run a cron service.** It builds and then waits for the
  schedule; a redeploy left alone sat idle for an hour. What runs it now is the
  dashboard's run action on the service, or a **restart of the current
  deployment** (the Railway connector's `restart-service`), which starts the
  container and executes the start command. The Quality tab's **Run now** is a
  third route and runs inside the API service instead.
- **Every merge to main redeploys every service**, this one included, and the
  new deployment replaces the old container whether or not a run is in flight.
  The 19:11 run that day was killed 31 seconds in by the deploy for the next
  merged PR. The 09:00 UTC nightly is rarely exposed; an afternoon run during
  active merging often is. The API service has the same exposure for **Run
  now**.
- The agent handles `SIGTERM` (and `SIGINT`): the open report row is marked
  `failed` with the reason written to `error`, bounded to four seconds so the
  write cannot hold the exit, and the process exits 1. Before this the row
  stayed `running` forever. Only the CLI installs the handler; the in-process
  path the API server uses must not touch the server's own shutdown. A run
  killed this way is not resumed — start it again.

## Environment variables

| Var | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Same project as the API service. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Bypasses RLS to read everything and write the report. |
| `CLAUDE_API_KEY` | no | The sampled read pass and the prose brief. Without it both skip and the report falls back to a plain brief. |
| `OPENAI_API_KEY` | no | Embeddings for the live retrieval fence probe. Without it that probe skips. |

## Configuration

Lives in `agent_config` under `quality-audit-agent`, merged over the defaults in
the agent:

| Key | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | `false` stops scheduled runs; an explicit `--probe` still runs. |
| `model` | `claude-sonnet-4-6` | Read pass and brief. |
| `standards_since` | `2026-09-02` | When Part 5 took effect. Rows older than this are the legacy backfill the plan puts out of scope, counted separately rather than re-litigated nightly. |
| `migration_drift_since` | `20260901` | Migrations older than this predate the convention. |
| `domains` | all four | Default coverage. |
| `material_sample_size` | `40` | Chunks read per night. `0` disables the paid pass. |
| `mode2_max_words` | `1800` | Twice the Paper Agent's 900-word ceiling. Above it, a Mode 2 work is examined rather than flagged. |
| `mode2_min_attribution` | `0.5` | Fraction of a work's chunks that must name its author. Below it, a long Mode 2 work is a copyright finding; above it, a note about weighting. |
| `locator_coarse_median` | `2` | Median chunks per locator at or above which a work's locator scheme is reported as too coarse to cite. Eleven of the twelve located works sit at 1. |
| `locator_min_chunks` | `30` | Below this many chunks a work is too short for that median to mean anything. |
| `queue_stale_days` | `7` | How long a pending queue row may sit. |
| `exhibit_reach_timeout_ms` | `8000` | Per-request timeout when checking that a gallery exhibit's page loads. |
| `base_branch` | `main` | The branch `repo.checkout_stale` measures against. |
| `fetch_before_drift_check` | `true` | Whether to fetch the base before comparing. `false` where there is no network; the comparison then uses the local remote-tracking ref, which may itself be stale. |
| `retrieval_warn_ms` | `500` | Warm median of `match_rag_corpus` above this is a warning. Was 187ms at 13.7k chunks when the line was drawn. |
| `retrieval_critical_ms` | `4000` | Any single call above this is a warning; PostgREST cancels at 8s. |
| `retrieval_latency_samples` | `5` | Fixed canonical-concept embeddings used as query vectors, so nights are comparable. |
| `brief_max_words` | `400` | Length of the prose brief. |

## Reading the report

`quality_audit_reports`, one row per run — `findings` and `resolved` as JSONB,
`counts`, and the `brief`. Latest run:

```sql
select run_date, status, counts, brief
from quality_audit_reports
where status = 'completed'
order by started_at desc limit 1;
```

Findings still open, most severe first:

```sql
select f->>'severity', f->>'state', f->>'title', f->>'action'
from quality_audit_reports r,
     jsonb_array_elements(r.findings) f
where r.id = (select id from quality_audit_reports
              where status = 'completed' order by started_at desc limit 1)
order by case f->>'severity' when 'critical' then 0 when 'warning' then 1 else 2 end;
```

### The Quality tab

`academy.pursuearete.com/admin` → **Quality**, beside Self-Reflection. It shows
the latest completed run's brief, the counts, every finding with its evidence and
its action, what cleared since the last run, the live mute list, and a history
strip of the last 14 runs (including failed ones — a night the agent died is
something the tab should show, not hide).

- **Run now** starts an audit on the Railway server rather than waiting for
  09:00 UTC. It proxies to `POST /api/admin/quality-audit/run` on the backend,
  which fires the run and returns 202. It does **not** reimplement the probes in
  TypeScript: twenty-nine probes in two languages would be two copies of the
  rules, and the probes are the rules.
- **Mute…** on a finding writes its fingerprint and a reason to
  `quality_audit_mutes`. The reason is required — an unexplained mute is
  indistinguishable from a bug being hidden. The mute takes effect from the next
  run, so the finding stays visible (dimmed) in the report that produced it.
- **Lift mute** removes it; the finding returns on the next run, marked new.

A run started from the tab covers `corpus`, `library` and `material` only. The
backend drops `repo` whatever the caller asks for, because those probes need a
checkout the Railway service does not have, and a run that claimed `repo`
coverage while skipping every repo probe would poison the night-to-night diff —
which is keyed on domain coverage.

## Adding a probe

1. Write it in the right `server/lib/quality-audit/probes-*.js`: `{ id, domain,
   title, needs, run(ctx) }`, returning `finding(...)` objects.
2. Give every finding a `key` if the probe can emit more than one, and keep the
   key free of counts and dates.
3. Declare `needs` honestly — `db`, `repo`, `claude`, `openai`. A probe that
   cannot run should skip and say so, never pass. Outbound HTTP is not one of
   the four, so a probe that makes requests has to detect its own missing
   egress: `library.exhibit_reachable` reports one `info` finding when *every*
   request failed at the network layer, rather than one `critical` per exhibit,
   because a probe that cries wolf where it happens to be running costs more
   than the check is worth.
4. Heavy `rag_corpus` aggregates belong in SQL, not in a client `select()`.
   PostgREST caps a response at 1000 rows, which is how the Coverage Gap Agent
   once produced phantom "absent" works. Extend
   `quality_audit_corpus_stats()` with a migration instead.

The registry in `server/lib/quality-audit/index.js` throws at load on a duplicate
probe id or an unknown domain, rather than letting two findings share a
fingerprint and diff wrongly forever after.
