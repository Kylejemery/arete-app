// server/lib/quality-audit/probes-repo.js
//
// Code and repository probes. These need a checkout on disk, which a Railway
// cron service rooted at server/ does not have — they declare `needs: ['repo']`
// and skip cleanly there, so the nightly Railway run covers the material and a
// run with the repo present (a scheduled Claude Code session, or `node
// quality-audit-agent.js` locally) additionally covers the code.
//
// The checks are the ones this repo's own conventions imply and nothing
// enforces: migrations applied without a committed file beside them, a cron
// service pointed at a script that has since been renamed, a doc linking to a
// path that moved, a key that made it into a tracked file.
//
// Everything here compares the project against whatever branch is on disk, so
// a checkout behind its base reports the base's own work as missing. That is
// not hypothetical: the drift probe's first run claimed five uncommitted
// migrations, three of which had landed on main while the branch was being
// written, and the recovered copies would have been committed as duplicates.
// checkoutStaleness() is therefore a guard and not merely another finding —
// while the checkout is behind, the drift probe cannot call anything critical.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { finding } = require('./framework');

const DOMAIN = 'repo';

// Drift older than this is the pre-convention backlog and is reported as
// information rather than as tonight's problem.
const DEFAULT_DRIFT_SINCE = '20260901';

// Where a Railway service's Root Directory can plausibly point.
const ROOT_DIRECTORY_CANDIDATES = ['server', 'academy/corpus-ingestion', 'moltbook-agent', 'academy/web'];

// Walk up for the checkout root. A Railway service rooted at server/ will not
// find it, which is the point.
function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'CLAUDE.md')) &&
        fs.existsSync(path.join(dir, 'supabase', 'migrations'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// Run a command for its output, returning the failure rather than throwing.
function run(cmd, cwd, timeoutMs = 300000) {
  try {
    const stdout = execSync(cmd, {
      cwd, timeout: timeoutMs, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, stdout, stderr: '' };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout ? String(err.stdout) : '',
      stderr: err.stderr ? String(err.stderr) : String(err.message),
      timedOut: err.signal === 'SIGTERM',
    };
  }
}

// --- Is this checkout current? ---------------------------------------------
//
// Fetches the base branch (a remote-tracking update only: no working tree, no
// local branch, nothing to undo) and counts how far behind HEAD is. Cached on
// ctx so the probes that depend on it agree and only one fetch happens.
//
// A fetch that fails is not an error. It means the answer is unknown, which is
// itself worth reporting, because "unknown" and "current" must not look alike.
function checkoutStaleness(ctx) {
  if (ctx._staleness) return ctx._staleness;
  ctx._staleness = computeStaleness(ctx);
  return ctx._staleness;
}

function computeStaleness(ctx) {
  const base = ctx.config.base_branch || 'main';
  const ref = `origin/${base}`;

  let fetched = false;
  let fetchError = null;
  if (ctx.config.fetch_before_drift_check !== false) {
    const res = run(`git fetch origin ${base} --quiet`, ctx.repoRoot, 60000);
    fetched = res.ok;
    if (!res.ok) fetchError = (res.stderr || '').trim().split('\n').slice(-1)[0] || 'fetch failed';
  }

  const counted = run(`git rev-list --count HEAD..${ref}`, ctx.repoRoot, 30000);
  if (!counted.ok) {
    return { known: false, fetched, behind: null, base, ref, error: fetchError || 'could not compare against the base branch' };
  }

  const behind = parseInt((counted.stdout || '').trim(), 10);
  if (!Number.isFinite(behind)) {
    return { known: false, fetched, behind: null, base, ref, error: 'unreadable commit count' };
  }

  return { known: true, fetched, behind, base, ref, error: fetchError };
}

// A migration filename normalised to the name the Supabase migration tool
// records: timestamp prefix and extension removed.
function migrationName(filename) {
  return filename.replace(/\.sql$/, '').replace(/^[0-9]{8,14}_/, '');
}

function fileTimestamp(filename) {
  const m = filename.match(/^([0-9]{8,14})_/);
  return m ? m[1] : '';
}

// --- The Academy's Playground release gate ---------------------------------
//
// The Garden's gallery advertises an exhibit; the Academy's middleware decides
// whether its page is reachable at all. Those two live in different places and
// nothing made them agree, which is how three exhibits came to be listed in
// the Garden while every one of them 404'd in the frame.
//
// library.exhibit_reachable asks the deployed site the same question over the
// network. This one asks the checkout, so it answers before a deploy and
// without egress. They overlap only where both a repo and a network are
// present, and there the interesting case is disagreement: a gate fixed on
// this branch but not yet deployed reads as reachable-fails/gate-passes, and a
// slug dropped on this branch but still live reads the other way round.
const GATE_FILE = path.join('academy', 'web', 'src', 'middleware.ts');
const GATE_CONST = 'RELEASED_PLAYGROUND';
const PLAYGROUND_PREFIX = '/playground/';

// The released slugs as the middleware itself lists them. Returns null when the
// constant cannot be found, which must be reported rather than read as "the
// list is empty" — an unreadable gate would otherwise fail every exhibit.
function releasedPlaygroundSlugs(repoRoot) {
  let src;
  try {
    src = fs.readFileSync(path.join(repoRoot, GATE_FILE), 'utf8');
  } catch (err) {
    return { slugs: null, error: `${GATE_FILE} could not be read (${err.code || err.message})` };
  }
  const block = src.match(new RegExp(`const\\s+${GATE_CONST}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!block) {
    return { slugs: null, error: `${GATE_CONST} was not found in ${GATE_FILE}` };
  }
  // A commented-out slug is not released. Reading one as released would be a
  // false negative, which is the failure this probe exists to prevent.
  const body = block[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const slugs = [...body.matchAll(/['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
  return { slugs, error: null };
}

// What the middleware will compare against its list, for an exhibit's URL:
// everything after /playground/. Anything else is not a Playground page and is
// not this probe's business. A trailing slash is dropped so one is not reported
// as a gate miss on the strength of a normalisation nobody has tested.
function playgroundSlug(embedUrl) {
  let pathname;
  try {
    pathname = new URL(embedUrl).pathname;
  } catch {
    return null;
  }
  if (!pathname.startsWith(PLAYGROUND_PREFIX)) return null;
  const slug = pathname.slice(PLAYGROUND_PREFIX.length).replace(/\/+$/, '');
  return slug || null;
}

// Does this checkout hold a page for that Playground slug? A dynamic segment at
// any level of the route can serve it, so its presence means the answer is yes
// as far as this probe can tell — claiming a missing page where [slug]/page.tsx
// would have answered is the kind of false positive that gets a probe ignored.
function playgroundPageExists(repoRoot, slug) {
  const appDir = path.join(repoRoot, 'academy', 'web', 'src', 'app', 'playground');
  const segments = slug.split('/');
  let dir = appDir;
  for (const segment of segments) {
    const literal = path.join(dir, segment);
    if (fs.existsSync(literal)) {
      dir = literal;
      continue;
    }
    let siblings = [];
    try {
      siblings = fs.readdirSync(dir);
    } catch {
      return false;
    }
    const dynamic = siblings.find(name => name.startsWith('[') && name.endsWith(']'));
    if (!dynamic) return false;
    dir = path.join(dir, dynamic);
  }
  return ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].some(f => fs.existsSync(path.join(dir, f)));
}

// Workspaces that have their own checks, in the order it is useful to run them.
const WORKSPACES = [
  { name: 'academy/web', dir: 'academy/web', lint: 'npm run lint', typecheck: 'npm run typecheck' },
  { name: 'mobile app',  dir: '.',           lint: 'npm run lint', typecheck: 'npx tsc --noEmit' },
];

const probes = [
  {
    id: 'repo.checkout_stale',
    domain: DOMAIN,
    title: 'The checkout is current with its base',
    needs: ['repo'],
    async run(ctx) {
      const s = checkoutStaleness(ctx);

      if (!s.known) {
        return [finding({
          probe: 'repo.checkout_stale',
          domain: DOMAIN,
          severity: 'info',
          key: 'unknown',
          title: 'Could not tell whether this checkout is current',
          detail:
            `Comparing HEAD against ${s.ref} failed (${s.error}). Every repo finding below is ` +
            'measured against this checkout, so if it is behind, the base\'s own work reads as ' +
            'missing. Unknown is reported rather than assumed current, because the two must not ' +
            'look alike in a report someone acts on.',
          action:
            'Run the repo probes somewhere the base branch is reachable, or set ' +
            '`fetch_before_drift_check: false` in agent_config if this environment has no network ' +
            'and you are fetching by hand.',
        })];
      }

      if (s.behind === 0) return [];

      return [finding({
        probe: 'repo.checkout_stale',
        domain: DOMAIN,
        severity: 'warning',
        key: 'behind',
        title: `This checkout is ${s.behind} commit(s) behind ${s.ref}`,
        detail:
          'The repo probes compare the project against whatever branch is on disk. Behind its ' +
          'base, a checkout reports the base\'s own work as missing — which is how the drift ' +
          'probe once claimed five uncommitted migrations when three had simply landed on the ' +
          'base while this branch was being written. Acting on that reading committed duplicates. ' +
          'The drift probe below has downgraded itself accordingly.',
        count: s.behind,
        action: `Merge or rebase onto ${s.ref} and run the audit again before acting on any repo finding.`,
      })];
    },
  },

  {
    id: 'repo.migration_drift',
    domain: DOMAIN,
    title: 'Applied SQL is committed SQL',
    needs: ['db', 'repo'],
    async run(ctx) {
      const { data, error } = await ctx.supabase.rpc('quality_audit_migration_versions');
      if (error) throw new Error(`quality_audit_migration_versions failed: ${error.message}`);

      const driftSince = ctx.config.migration_drift_since || DEFAULT_DRIFT_SINCE;
      const dir = path.join(ctx.repoRoot, 'supabase', 'migrations');
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));

      const committed = new Map();            // normalised name -> filename
      for (const f of files) committed.set(migrationName(f), f);

      const applied = new Map();              // normalised name -> version
      for (const row of data || []) applied.set(migrationName(row.name), row.version);

      const appliedNotCommitted = [...applied.entries()]
        .filter(([name]) => !committed.has(name))
        .map(([name, version]) => ({ name, version }));
      const committedNotApplied = [...committed.entries()]
        .filter(([name]) => !applied.has(name))
        .map(([name, file]) => ({ name, file }));

      const out = [];

      const recentUncommitted = appliedNotCommitted.filter(m => m.version >= driftSince);
      if (recentUncommitted.length) {
        // A checkout behind its base cannot distinguish "never committed" from
        // "committed on the base, not yet here". Reporting that as critical is
        // what produced duplicate migration files once already, so while the
        // checkout is stale this is a lead to verify, not a defect to act on.
        const stale = checkoutStaleness(ctx);
        const unreliable = !stale.known || stale.behind > 0;
        const caveat = !stale.known
          ? ' This checkout could not be compared against its base, so some of these may already be committed there.'
          : stale.behind > 0
            ? ` This checkout is ${stale.behind} commit(s) behind ${stale.ref}, so some of these are likely already committed there under a different timestamp prefix — check before committing a recovered copy, or you will add a duplicate.`
            : '';

        out.push(finding({
          probe: 'repo.migration_drift',
          domain: DOMAIN,
          severity: unreliable ? 'info' : 'critical',
          key: 'applied-not-committed',
          title: unreliable
            ? `${recentUncommitted.length} migration(s) applied since ${driftSince} have no committed file in this checkout`
            : `${recentUncommitted.length} migration(s) applied since ${driftSince} have no committed file`,
          detail:
            'The convention is that the file and the applied SQL are identical, and that SQL which is ' +
            'not committed is never applied. A migration that exists only in the database cannot be ' +
            'reviewed, cannot be replayed onto a new environment, and is invisible to anyone reading ' +
            'the repo to learn what the schema is. ' +
            `(${appliedNotCommitted.length} in total, most of them predating the convention.)` +
            caveat,
          count: recentUncommitted.length,
          evidence: recentUncommitted.map(m => `${m.version} ${m.name}`),
          action: unreliable
            ? `Bring the checkout up to date with ${stale.ref || 'its base'} and re-run before recovering any of these. ` +
              'Match by name with the timestamp prefix stripped: the base may carry the same migration under a different prefix.'
            : 'For each, dump the applied SQL and commit it under supabase/migrations/ with its ' +
              'timestamp prefix, so the file and the database agree.',
        }));
      }

      const recentUnapplied = committedNotApplied.filter(m => fileTimestamp(m.file) >= driftSince);
      if (recentUnapplied.length) {
        out.push(finding({
          probe: 'repo.migration_drift',
          domain: DOMAIN,
          severity: 'warning',
          key: 'committed-not-applied',
          title: `${recentUnapplied.length} migration file(s) written since ${driftSince} are not in the applied history`,
          detail:
            'A committed migration the project has never run is either dead code or a schema change ' +
            'someone believes shipped and did not. Older files here are the pre-history backlog, ' +
            `applied before the migration tool recorded anything (${committedNotApplied.length} in total).`,
          count: recentUnapplied.length,
          evidence: recentUnapplied.map(m => m.file),
          action: 'Apply it through the Supabase migration tool so it is recorded, or delete the file if it is dead.',
        }));
      }

      return out;
    },
  },

  {
    id: 'repo.exhibit_release_gate',
    domain: DOMAIN,
    title: 'Every gallery exhibit has a page this checkout ships and releases',
    needs: ['db', 'repo'],
    async run(ctx) {
      const { data, error } = await ctx.supabase
        .from('exhibits')
        .select('slug, title, status, embed_url')
        .not('embed_url', 'is', null);
      if (error) throw new Error(`exhibits read failed: ${error.message}`);

      const gate = releasedPlaygroundSlugs(ctx.repoRoot);
      if (!gate.slugs) {
        // Never read an unparseable gate as an empty one: that would report
        // every exhibit as unreleased and bury the one real finding if there
        // were one.
        return [finding({
          probe: 'repo.exhibit_release_gate',
          domain: DOMAIN,
          severity: 'warning',
          key: 'gate-unreadable',
          title: 'Could not read the Playground release list, so no exhibit was checked',
          detail:
            `${gate.error}. This probe decides whether an exhibit's page is reachable by reading the ` +
            `same list the middleware gates on, so a list it cannot find means the question went ` +
            'unanswered rather than answered yes.',
          action:
            `Check that ${GATE_CONST} in ${GATE_FILE} is still a literal array of slugs. If the gate ` +
            'has moved or changed shape, point this probe at its new home.',
        })];
      }

      const released = new Set(gate.slugs);
      const gallery = [];
      const workshop = [];
      for (const ex of data || []) {
        const slug = playgroundSlug(ex.embed_url);
        if (!slug) continue;                 // not an Academy Playground page
        const row = {
          ...ex,
          playgroundSlug: slug,
          released: released.has(slug),
          hasPage: playgroundPageExists(ctx.repoRoot, slug),
        };
        (ex.status === 'gallery' ? gallery : workshop).push(row);
      }

      // An exhibit can fail both ways at once, and each failure is reported
      // where its fix is — but an unreleased exhibit whose page is also absent
      // says so, because releasing the slug alone would not make it load.
      const unreleased = gallery.filter(ex => !ex.released);
      const pageless = gallery.filter(ex => ex.released && !ex.hasPage);

      const workshopGated = workshop.filter(ex => !ex.released);
      if (!unreleased.length && !pageless.length && !workshopGated.length) return [];

      // The same trap the migration drift probe fell into: a checkout behind
      // its base reports the base's own work as missing. A slug released on
      // main but not yet here is not a defect, so while the checkout is stale
      // these are leads to verify rather than failures to act on. Asked for
      // only once there is something to qualify, so a clean run costs no fetch.
      const stale = checkoutStaleness(ctx);
      const unreliable = !stale.known || stale.behind > 0;
      const caveat = !stale.known
        ? ' This checkout could not be compared against its base, so some of these may already be released there.'
        : stale.behind > 0
          ? ` This checkout is ${stale.behind} commit(s) behind ${stale.ref}, so some of these may already be released there.`
          : '';

      const out = [];

      if (unreleased.length) {
        out.push(finding({
          probe: 'repo.exhibit_release_gate',
          domain: DOMAIN,
          severity: unreliable ? 'info' : 'critical',
          key: 'unreleased',
          title: `${unreleased.length} gallery exhibit(s) point at a Playground slug this checkout does not release`,
          detail:
            'The Garden index lists every gallery row, and the Academy 404s any Playground path whose ' +
            `slug is absent from ${GATE_CONST}. A reader who opens one of these gets an empty frame. ` +
            'Releasing a piece is adding its slug to that list and nothing else, so the fix is one line ' +
            'per exhibit — or moving the row back to workshop until its page is ready.' + caveat,
          count: unreleased.length,
          evidence: unreleased.map(ex =>
            `${ex.slug} → /playground/${ex.playgroundSlug} (not released${ex.hasPage ? '' : '; no page here either'})`),
          action: unreliable
            ? `Bring the checkout up to date with ${stale.ref || 'its base'} and re-run before acting on these.`
            : `Add each slug to ${GATE_CONST} in ${GATE_FILE} — and ship the page first for any marked as ` +
              'having none — or set the exhibit back to workshop.',
        }));
      }

      if (pageless.length) {
        out.push(finding({
          probe: 'repo.exhibit_release_gate',
          domain: DOMAIN,
          severity: unreliable ? 'info' : 'critical',
          key: 'page-missing',
          title: `${pageless.length} gallery exhibit(s) are released but have no page in this checkout`,
          detail:
            'The slug is through the gate, and there is no route behind it — which 404s exactly as ' +
            'being unlisted would, one layer further in. The usual cause is a row promoted to gallery ' +
            'while its page was still on a branch.' + caveat,
          count: pageless.length,
          evidence: pageless.map(ex => `${ex.slug} → academy/web/src/app/playground/${ex.playgroundSlug}/page.tsx`),
          action: unreliable
            ? `Bring the checkout up to date with ${stale.ref || 'its base'} and re-run before acting on these.`
            : 'Ship the page, or set the exhibit back to workshop until it exists.',
        }));
      }

      // Workshop rows are unlisted by design, but the design also says they
      // stay reachable at an exact link for testing. A gated one is not.
      if (workshopGated.length) {
        out.push(finding({
          probe: 'repo.exhibit_release_gate',
          domain: DOMAIN,
          severity: 'info',
          key: 'workshop-gated',
          title: `${workshopGated.length} workshop exhibit(s) point at a Playground slug this checkout does not release`,
          detail:
            'A workshop exhibit is meant to be absent from the index and still reachable by exact link, ' +
            'which is what makes it testable before promotion. Gated at the Academy it is reachable by ' +
            'nobody, and promoting it to gallery would ship a 404. Not a defect today — a promotion ' +
            'that will fail unless the slug is released first.' + caveat,
          count: workshopGated.length,
          evidence: workshopGated.map(ex => `${ex.slug} → /playground/${ex.playgroundSlug} (not released)`),
          action: `Release the slug in ${GATE_FILE} when the piece is ready to be looked at, or leave it if it is not.`,
        }));
      }

      return out;
    },
  },

  {
    id: 'repo.cron_targets',
    domain: DOMAIN,
    title: 'Every cron service points at a script that exists',
    needs: ['repo'],
    async run(ctx) {
      const out = [];
      const broken = [];
      const ambiguous = [];

      const roots = ['server', 'academy/corpus-ingestion', 'moltbook-agent', '.'];
      for (const rel of roots) {
        const dir = path.join(ctx.repoRoot, rel);
        if (!fs.existsSync(dir)) continue;
        for (const file of fs.readdirSync(dir).filter(f => /^railway.*\.json$/.test(f))) {
          const full = path.join(dir, file);
          let cfg;
          try {
            cfg = JSON.parse(fs.readFileSync(full, 'utf8'));
          } catch (err) {
            broken.push(`${rel}/${file} — not valid JSON (${err.message})`);
            continue;
          }
          const start = cfg?.deploy?.startCommand;
          if (!start) continue;
          const script = (start.match(/([\w./-]+\.js)/) || [])[1];
          if (!script) continue;
          if (fs.existsSync(path.join(dir, script))) continue;

          // A Railway service sets its own Root Directory, so a config at the
          // repo root can legitimately name a script that lives one level down
          // (the API service is `node index.js` with root directory server/).
          // That is a convention worth noting, not a broken service.
          const elsewhere = ROOT_DIRECTORY_CANDIDATES
            .map(sub => path.join(ctx.repoRoot, sub, script))
            .filter(p => fs.existsSync(p))
            .map(p => path.relative(ctx.repoRoot, p));

          if (elsewhere.length) {
            ambiguous.push(
              `${rel}/${file} starts \`${start}\`, which resolves only if the service's Root ` +
              `Directory is set (found ${elsewhere.join(', ')})`);
          } else {
            broken.push(`${rel}/${file} starts \`${start}\` but ${script} exists nowhere in the repo`);
          }
        }
      }

      if (broken.length) {
        out.push(finding({
          probe: 'repo.cron_targets',
          domain: DOMAIN,
          severity: 'critical',
          key: 'missing',
          title: `${broken.length} Railway config(s) point at a script that does not exist`,
          detail:
            'A cron service whose start command names a script that is not there fails at boot, once ' +
            'a night, silently — cron services sleep between runs and nobody watches a service that ' +
            'is supposed to be quiet.',
          count: broken.length,
          evidence: broken,
          action: 'Fix the startCommand or restore the script. Check the service in Railway is on the same config.',
        }));
      }

      if (ambiguous.length) {
        out.push(finding({
          probe: 'repo.cron_targets',
          domain: DOMAIN,
          severity: 'info',
          key: 'root-directory',
          title: `${ambiguous.length} Railway config(s) depend on a Root Directory set in the dashboard`,
          detail:
            'The script exists, but not beside the config that names it, so the service only boots ' +
            'because its Root Directory is set in Railway. That setting lives outside the repo, which ' +
            'means nothing here records it and nothing here would catch it being wrong.',
          count: ambiguous.length,
          evidence: ambiguous,
          action:
            'Leave as is if the Root Directory is set deliberately — this is a note, not a fault. ' +
            'Worth recording the setting in the service\'s agent doc so it survives a rebuild.',
        }));
      }
      return out;
    },
  },

  {
    id: 'repo.checks',
    domain: DOMAIN,
    title: 'Lint and typecheck pass',
    needs: ['repo'],
    async run(ctx) {
      const out = [];

      for (const ws of WORKSPACES) {
        const dir = path.join(ctx.repoRoot, ws.dir);
        if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
        if (!fs.existsSync(path.join(dir, 'node_modules'))) {
          ctx.log(`    (${ws.name}: no node_modules, skipping lint/typecheck)`);
          continue;
        }

        for (const [kind, cmd] of [['lint', ws.lint], ['typecheck', ws.typecheck]]) {
          if (!cmd) continue;
          const res = run(cmd, dir);
          if (res.ok) continue;

          const output = `${res.stdout}\n${res.stderr}`.trim();
          const lines = output.split('\n').filter(l => l.trim()).slice(-12);
          out.push(finding({
            probe: 'repo.checks',
            domain: DOMAIN,
            severity: kind === 'typecheck' ? 'critical' : 'warning',
            key: `${ws.dir}:${kind}`,
            title: res.timedOut
              ? `${ws.name} ${kind} timed out`
              : `${ws.name} ${kind} is failing`,
            detail:
              kind === 'typecheck'
                ? `\`${cmd}\` exits non-zero in ${ws.dir}. A type error that survives in the repo means ` +
                  'the next person to run it cannot tell their error from the standing one.'
                : `\`${cmd}\` exits non-zero in ${ws.dir}.`,
            evidence: lines,
            action: `Run \`${cmd}\` in ${ws.dir} and clear it.`,
          }));
        }
      }
      return out;
    },
  },

  {
    id: 'repo.secret_scan',
    domain: DOMAIN,
    title: 'No credentials in tracked files',
    needs: ['repo'],
    async run(ctx) {
      // Tracked files only — git grep never walks node_modules or build output.
      const patterns = [
        ['OpenAI key',        'sk-[A-Za-z0-9]{32,}'],
        ['Anthropic key',     'sk-ant-[A-Za-z0-9_-]{24,}'],
        ['Supabase/JWT key',  'eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.'],
      ];
      const hits = [];

      for (const [label, pattern] of patterns) {
        const res = run(
          `git grep -nIE ${JSON.stringify(pattern)} -- . ':(exclude)*.lock' ':(exclude)*lock.json' ':(exclude)*.example'`,
          ctx.repoRoot,
          60000,
        );
        // git grep exits 1 with no output when there is no match; that is a pass.
        const lines = (res.stdout || '').split('\n').filter(l => l.trim());
        for (const line of lines.slice(0, 5)) {
          const [file, lineNo] = line.split(':');
          hits.push(`${label} — ${file}:${lineNo}`);
        }
      }

      if (!hits.length) return [];
      return [finding({
        probe: 'repo.secret_scan',
        domain: DOMAIN,
        severity: 'critical',
        title: `${hits.length} possible credential(s) in tracked files`,
        detail:
          'These keys must only ever be runtime service variables. A key in a tracked file is in the ' +
          'history for good, so the fix is rotation and not deletion. False positives happen — a ' +
          'sample JWT in a doc reads the same as a real one — so confirm before acting.',
        count: hits.length,
        evidence: hits,
        action: 'Confirm each hit. If it is a live key: rotate it first, then remove it from the file.',
      })];
    },
  },

  {
    id: 'repo.doc_links',
    domain: DOMAIN,
    title: 'Docs link to paths that exist',
    needs: ['repo'],
    async run(ctx) {
      const res = run("git ls-files '*.md'", ctx.repoRoot, 60000);
      const files = (res.stdout || '').split('\n').filter(Boolean);
      const broken = [];

      for (const rel of files) {
        if (rel.includes('node_modules/')) continue;
        let body;
        try {
          body = fs.readFileSync(path.join(ctx.repoRoot, rel), 'utf8');
        } catch {
          continue;
        }
        const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
        let m;
        while ((m = linkRe.exec(body)) !== null) {
          const target = m[1];
          if (/^(https?:|mailto:|#|tel:|data:)/.test(target)) continue;
          const clean = target.split('#')[0].split('?')[0];
          if (!clean) continue;
          const resolved = clean.startsWith('/')
            ? path.join(ctx.repoRoot, clean.slice(1))
            : path.resolve(path.dirname(path.join(ctx.repoRoot, rel)), clean);
          if (!fs.existsSync(resolved)) broken.push(`${rel} → ${target}`);
        }
      }

      if (!broken.length) return [];
      return [finding({
        probe: 'repo.doc_links',
        domain: DOMAIN,
        severity: 'info',
        title: `${broken.length} link(s) in committed docs point at a path that does not exist`,
        detail:
          'The docs are how the conventions are transmitted — CLAUDE.md sends readers to the ' +
          'acquisition plan, the acquisition plan sends them on. A dead link is a convention that ' +
          'stops being read.',
        count: broken.length,
        evidence: broken,
        action: 'Re-point or remove each link. A file that moved usually wants the link updated, not deleted.',
      })];
    },
  },
  {
    id: 'repo.retrieval_guarantees',
    domain: DOMAIN,
    title: 'Retrieval paths that bypass match_rag_corpus restate its guarantees',
    needs: ['repo'],
    async run(ctx) {
      // match_rag_corpus carries two guarantees in SQL: deprecated = false, and
      // the caller's exclude_text_types fence. Graph-boost expansion reaches
      // rag_corpus directly instead, so it has to restate both in JavaScript —
      // and both have been missing there before, serving a deprecated chunk
      // through an edge to its own replacement and letting a fenced row hold a
      // top-k slot. Nothing but this probe notices if either goes again: the
      // expansion is behind GRAPH_BOOST, so a regression is silent until the
      // flag is on, and by then it is serving text to a reader.
      const hits = [];
      const boostPath = path.join(ctx.repoRoot, 'server/lib/graph-boost.js');
      let boost = null;
      try {
        boost = fs.readFileSync(boostPath, 'utf8');
      } catch {
        return [finding({
          probe: 'repo.retrieval_guarantees',
          domain: DOMAIN,
          severity: 'warning',
          title: 'Could not read server/lib/graph-boost.js',
          detail:
            'The probe checks that the graph-boost expansion restates what match_rag_corpus ' +
            'guarantees. It could not read the file, so it is reporting that rather than passing.',
          action: 'Check whether the module moved. If it did, re-point this probe.',
          key: 'unreadable',
        })];
      }

      // 1. The direct rag_corpus read must filter deprecated itself.
      const directRead = boost.includes(".from('rag_corpus')");
      if (directRead && !/\.eq\(\s*['"]deprecated['"]\s*,\s*false\s*\)/.test(boost)) {
        hits.push({
          key: 'deprecated_filter',
          title: 'Graph-boost reads rag_corpus without filtering deprecated',
          detail:
            "server/lib/graph-boost.js selects from rag_corpus directly, bypassing match_rag_corpus " +
            "and its deprecated = false. Without the filter a superseded ingest re-enters retrieval " +
            "through an edge to the live row that replaced it — and near-duplicate text is exactly " +
            "what makes a strong edge, so the deprecated copy of a remediated work is the likeliest " +
            "neighbour of its own replacement. Deprecation is silent by design, so nothing else " +
            "would show it.",
          action: "Add .eq('deprecated', false) to the neighbour query in expandCandidates.",
        });
      }

      // 2. Every caller must pass its fence. The parameter is optional and
      //    defaults to allowing everything, so a call site that omits it gets
      //    no fence rather than an error.
      const callSites = [];
      const res = run("git grep -n 'expandCandidates(' -- '*.js'", ctx.repoRoot, 60000);
      for (const line of (res.stdout || '').split('\n').filter(l => l.trim())) {
        const idx = line.indexOf(':');
        const rel = line.slice(0, idx);
        const lineNo = line.slice(idx + 1).split(':')[0];
        // The module defines and exports it; this probe names it in its own
        // source; tests may legitimately call it unfenced to exercise the
        // default. None of the three is a retrieval path.
        if (rel.endsWith('lib/graph-boost.js')) continue;
        if (rel.includes('lib/quality-audit/')) continue;
        if (rel.includes('/tests/') || rel.includes('.test.js')) continue;
        callSites.push({ rel, lineNo: Number(lineNo) });
      }

      const unfenced = [];
      for (const site of callSites) {
        let body;
        try {
          body = fs.readFileSync(path.join(ctx.repoRoot, site.rel), 'utf8');
        } catch {
          continue;
        }
        const lines = body.split('\n');
        const start = body.split('\n').slice(0, site.lineNo - 1).join('\n').length + (site.lineNo > 1 ? 1 : 0);
        const from = body.indexOf('expandCandidates(', start);
        if (from === -1) continue;
        // Walk to the matching close paren so a call split over lines is read
        // whole — checking only the matched line would miss a wrapped argument.
        let depth = 0, end = -1;
        for (let i = body.indexOf('(', from); i < body.length; i++) {
          if (body[i] === '(') depth++;
          else if (body[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
        }
        const args = end === -1 ? lines[site.lineNo - 1] ?? '' : body.slice(from, end + 1);
        if (!/\bfence\b/.test(args)) unfenced.push(`${site.rel}:${site.lineNo}`);
      }

      if (unfenced.length) {
        hits.push({
          key: 'fence_arguments',
          title: `${unfenced.length} expandCandidates call site(s) pass no fence`,
          detail:
            'opts.fence is optional and defaults to allowing everything, so a call site that omits ' +
            'it is not an error — it is an unfenced retrieval path. The fence has to reach the ' +
            'expansion because a fenced row that survives a hop seeds the next one, and because ' +
            'filtering only after truncation lets it hold a top-k slot and then vanish. ' +
            'server/lib/corpus-fence.js says which fence each surface takes.',
          action:
            'Pass the surface’s own fence: { fence: isCounselorVisible } or ' +
            '{ fence: passesModernFence }. A genuinely unfenced research caller should pass one ' +
            'that allows everything, explicitly, so the choice is visible.',
          evidence: unfenced,
        });
      }

      return hits.map(h => finding({
        probe: 'repo.retrieval_guarantees',
        domain: DOMAIN,
        severity: 'critical',
        title: h.title,
        detail: h.detail,
        action: h.action,
        count: h.evidence ? h.evidence.length : null,
        evidence: h.evidence ?? [],
        key: h.key,
      }));
    },
  },
];

module.exports = { probes, findRepoRoot };
