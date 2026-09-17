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

// A migration filename normalised to the name the Supabase migration tool
// records: timestamp prefix and extension removed.
function migrationName(filename) {
  return filename.replace(/\.sql$/, '').replace(/^[0-9]{8,14}_/, '');
}

function fileTimestamp(filename) {
  const m = filename.match(/^([0-9]{8,14})_/);
  return m ? m[1] : '';
}

// Workspaces that have their own checks, in the order it is useful to run them.
const WORKSPACES = [
  { name: 'academy/web', dir: 'academy/web', lint: 'npm run lint', typecheck: 'npm run typecheck' },
  { name: 'mobile app',  dir: '.',           lint: 'npm run lint', typecheck: 'npx tsc --noEmit' },
];

const probes = [
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
        out.push(finding({
          probe: 'repo.migration_drift',
          domain: DOMAIN,
          severity: 'critical',
          key: 'applied-not-committed',
          title: `${recentUncommitted.length} migration(s) applied since ${driftSince} have no committed file`,
          detail:
            'The convention is that the file and the applied SQL are identical, and that SQL which is ' +
            'not committed is never applied. A migration that exists only in the database cannot be ' +
            'reviewed, cannot be replayed onto a new environment, and is invisible to anyone reading ' +
            'the repo to learn what the schema is. ' +
            `(${appliedNotCommitted.length} in total, most of them predating the convention.)`,
          count: recentUncommitted.length,
          evidence: recentUncommitted.map(m => `${m.version} ${m.name}`),
          action:
            'For each, dump the applied SQL and commit it under supabase/migrations/ with its ' +
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
];

module.exports = { probes, findRepoRoot };
