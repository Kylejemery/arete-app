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

Twenty-three probes across four domains. A probe is a named check that knows one
thing, returns findings, and never writes.

### `corpus` — the standing rules

| Probe | What it catches |
| --- | --- |
| `corpus.metadata_required` | Post-standard ingests missing `translator`, `source_url` or `edition_year` (Part 5 of the acquisition plan), with the offending works named. |
| `corpus.copyright_fence` | A verbatim layer carrying an `edition_year` after 1930 — the failure the standing copyright rule exists to prevent. |
| `corpus.mode2_length` | A long Mode 2 work that does **not** name its own author through the text — what a verbatim ingest wearing the summary label looks like. Length alone is only reported as info: a genuine rewrite talks *about* its author ("Holiday argues", "Mates notes"), so voice is the copyright signal and length is a note about how much retrieval mass one modern work carries. |
| `corpus.text_type_fence` | A `text_type` in `rag_corpus` that `server/lib/corpus-fence.js` does not list — a layer whose visibility nobody has decided, and which every surface is therefore free to retrieve. |
| `corpus.identity_collisions` | One work living under two author strings. The filename parser has produced this before. |
| `corpus.write_target_drift` | `source_text_chunks` carrying newer rows than `rag_corpus`. This once cost months of ingests. |
| `corpus.embedding_missing` | Live chunks with no embedding: in the corpus, invisible to every search. |
| `corpus.sequence_gaps` | A `chunk_index` inside a work's range with **no row at any deprecation state** — an ingest that stopped short. Deliberately deprecated apparatus is excluded, which is the difference between a useful finding and 635 false ones. |
| `corpus.duplicate_text` | Identical chunk text: a wasted embedding, and one passage that can return twice in a single retrieval and read as two witnesses. |
| `corpus.question_map` | Works ingested since the standard with no `corpus_question_registrations` row (Part 5 rule 4). |
| `corpus.queue_health` | Failed queue rows nothing retries, and pending rows older than the batch cadence. |
| `corpus.retrieval_fences` | **End to end**: embeds real queries, calls `match_rag_corpus` with `counselorRetrievalParams()`, and asserts that nothing deprecated and nothing on the exclusion list comes back. Needs `OPENAI_API_KEY`. |

### `library` — the reading rooms and the Garden

`library.exhibit_integrity` (a gallery exhibit missing the passage, citation or
Agora prompt its status promises), `library.exhibit_thinkers` (an exhibit citing
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
`repo.checks` (lint and typecheck per workspace), `repo.secret_scan` (key-shaped
strings in tracked files), `repo.doc_links` (committed docs linking to paths that
moved).

`repo.checkout_stale` is a guard as much as a finding. Every repo probe compares
the project against whatever branch is on disk, so a checkout behind its base
reports the base's own work as missing. That is not hypothetical: the drift
probe's first run claimed five uncommitted migrations, three of which had landed
on `main` while the branch was being written, and committing the recovered
copies added duplicate files for migrations the repo already had.

So while the checkout is behind — or while the comparison could not be made at
all — `repo.migration_drift` downgrades its applied-but-not-committed finding
from critical to info and says why, because at that point it cannot tell "never
committed" from "committed on the base, not here yet". It fetches the base
branch to decide (a remote-tracking update only: no working tree, no local
branch, nothing to undo), and reports "unknown" rather than assuming current
when the fetch fails, because in a report someone acts on, those two must not
look alike.

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
| `queue_stale_days` | `7` | How long a pending queue row may sit. |
| `base_branch` | `main` | The branch `repo.checkout_stale` measures against. |
| `fetch_before_drift_check` | `true` | Whether to fetch the base before comparing. `false` where there is no network; the comparison then uses the local remote-tracking ref, which may itself be stale. |
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
  TypeScript: twenty-three probes in two languages would be two copies of the
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
   cannot run should skip and say so, never pass.
4. Heavy `rag_corpus` aggregates belong in SQL, not in a client `select()`.
   PostgREST caps a response at 1000 rows, which is how the Coverage Gap Agent
   once produced phantom "absent" works. Extend
   `quality_audit_corpus_stats()` with a migration instead.

The registry in `server/lib/quality-audit/index.js` throws at load on a duplicate
probe id or an unknown domain, rather than letting two findings share a
fingerprint and diff wrongly forever after.
