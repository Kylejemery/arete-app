'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import styles from '../admin.module.css'

type Severity = 'critical' | 'warning' | 'info'
type State = 'new' | 'ongoing'

type Finding = {
  probe: string
  domain: string
  severity: Severity
  state?: State
  title: string
  detail: string
  action: string
  count: number | null
  evidence: string[]
  fingerprint: string
}

type Resolved = { fingerprint: string; title: string; severity: Severity; domain: string }

type Report = {
  id: string
  run_date: string
  started_at: string
  finished_at: string | null
  status: 'running' | 'completed' | 'failed'
  domains: string[]
  probes_run: number
  probes_skipped: number
  probes_errored: number
  skipped: { id: string; reason: string }[] | null
  counts: Partial<Record<Severity | State, number>>
  findings: Finding[] | null
  resolved: Resolved[] | null
  brief: string | null
  error: string | null
}

type Mute = { fingerprint: string; reason: string; expires_at: string | null; created_at: string }

// Matches the reflection tab's palette so the fleet reads as one surface.
const SEVERITY_COLORS: Record<Severity, { bg: string; fg: string }> = {
  critical: { bg: '#FBE3E3', fg: '#B23535' },
  warning: { bg: '#FFF4DB', fg: '#92600A' },
  info: { bg: '#E7EDF5', fg: '#3A5372' },
}
const NEW_COLORS = { bg: '#E1F5EE', fg: '#0F6E56' }

const DOMAIN_BLURB: Record<string, string> = {
  corpus: 'the standing rules — metadata, copyright, the fences',
  library: 'the reading rooms and the Garden',
  repo: 'migrations, crons, lint, secrets, docs',
  material: 'a read sample of live chunks',
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function Badge({ text, colors }: { text: string; colors: { bg: string; fg: string } }) {
  return <span className={styles.pill} style={{ background: colors.bg, color: colors.fg }}>{text}</span>
}

function MetricCard({ label, value, sub, kind }: {
  label: string; value: React.ReactNode; sub?: string; kind?: 'ok' | 'warn' | 'error'
}) {
  const color = kind === 'error' ? '#B23535' : kind === 'warn' ? '#92600A' : undefined
  return (
    <div className={styles.card} style={{ marginBottom: 0 }}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ marginTop: 6, color }}>{value}</div>
      {sub && <div className={styles.muted} style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function FindingCard({ f, onMute, muting }: {
  f: Finding
  onMute: (f: Finding, reason: string) => Promise<void>
  muting: boolean
}) {
  const [open, setOpen] = useState(false)
  const [muteOpen, setMuteOpen] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <div className={styles.gapRow}>
      <div className={styles.gapRowMain}>
        <Badge text={f.severity} colors={SEVERITY_COLORS[f.severity]} />
        {f.state === 'new' && <Badge text="new" colors={NEW_COLORS} />}
        <span className={styles.gapTitle}>{f.title}</span>
      </div>

      <div className={styles.gapMeta} style={{ marginTop: 4 }}>
        <span style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>{f.domain}</span>
        {' · '}
        <code style={{ fontSize: 11 }}>{f.probe}</code>
      </div>

      <div className={styles.gapMeta} style={{ marginTop: 8, lineHeight: 1.65 }}>{f.detail}</div>

      {f.evidence.length > 0 && (
        <>
          <button
            className={styles.ghostBtn}
            style={{ marginTop: 8 }}
            onClick={() => setOpen(o => !o)}
          >
            {open ? '▾' : '▸'} {f.evidence.length} example{f.evidence.length === 1 ? '' : 's'}
          </button>
          {open && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {f.evidence.map((e, i) => (
                <li key={i} className={styles.gapMeta} style={{ marginBottom: 4, wordBreak: 'break-word' }}>{e}</li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className={styles.gapMeta} style={{ marginTop: 10, fontWeight: 600 }}>What to do</div>
      <div className={styles.gapMeta} style={{ lineHeight: 1.65 }}>{f.action}</div>

      <div className={styles.gapActions} style={{ marginTop: 10 }}>
        {!muteOpen ? (
          <button className={styles.ghostBtn} onClick={() => setMuteOpen(true)}>Mute…</button>
        ) : (
          <div style={{ width: '100%' }}>
            <input
              className={styles.textInput}
              placeholder="Why is this accepted rather than fixed? (required)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%' }}
            />
            <div className={styles.actions} style={{ marginTop: 6 }}>
              <button
                className={styles.primaryBtn}
                disabled={!reason.trim() || muting}
                onClick={async () => { await onMute(f, reason.trim()); setMuteOpen(false); setReason('') }}
              >
                {muting ? 'Muting…' : 'Mute this finding'}
              </button>
              <button className={styles.ghostBtn} onClick={() => { setMuteOpen(false); setReason('') }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function QualityPage() {
  const [current, setCurrent] = useState<Report | null>(null)
  const [history, setHistory] = useState<Report[]>([])
  const [mutes, setMutes] = useState<Mute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState('')
  const [muting, setMuting] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/quality-audit', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load the quality audit')
      setCurrent(json.current || null)
      setHistory(json.history || [])
      setMutes(json.mutes || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function runNow() {
    setRunning(true)
    setRunMsg('Starting an audit — the read pass samples the corpus through Claude, about a minute. This tab refreshes when the report lands…')
    try {
      const res = await fetch('/api/admin/quality-audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: ['corpus', 'library', 'material'] }),
      })
      const json = await res.json().catch(() => ({}))
      // 202 = started; 409 = one already running. Both mean a run is underway.
      if (!res.ok && res.status !== 409) throw new Error(json.error || 'Failed to start')
      if (res.status === 409) setRunMsg('An audit is already in progress — refreshing when it lands…')
      setTimeout(async () => {
        await load()
        setRunMsg('✓ Audit complete. Repo probes are not in this run — they need a checkout the Railway service does not have.')
        setRunning(false)
      }, 75000)
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : 'Failed to start')
      setRunning(false)
    }
  }

  async function muteFinding(f: Finding, reason: string) {
    setMuting(true)
    try {
      const res = await fetch('/api/admin/quality-audit/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: f.fingerprint, reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to mute')
      // The mute takes effect on the next run, so reflect it locally rather
      // than pretending the finding is gone from tonight's report.
      setMutes(m => [{ fingerprint: f.fingerprint, reason, expires_at: null, created_at: new Date().toISOString() }, ...m])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mute')
    }
    setMuting(false)
  }

  async function liftMute(fingerprint: string) {
    try {
      const res = await fetch(`/api/admin/quality-audit/mute?fingerprint=${encodeURIComponent(fingerprint)}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to lift mute')
      }
      setMutes(m => m.filter(x => x.fingerprint !== fingerprint))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to lift mute')
    }
  }

  const findings = useMemo(() => current?.findings ?? [], [current])
  const mutedSet = useMemo(() => new Set(mutes.map(m => m.fingerprint)), [mutes])
  const counts = current?.counts ?? {}
  const critical = counts.critical ?? 0
  const warning = counts.warning ?? 0
  const info = counts.info ?? 0
  const isNew = counts.new ?? 0
  const resolved = current?.resolved ?? []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>Quality</h1>
            <p>
              The auditor&rsquo;s nightly read on whether what is already in the system is correct.
              Runs 09:00 UTC, after the corpus ingest. It reads and reports; it changes nothing.
            </p>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={runNow}
            disabled={running}
            style={{ flexShrink: 0 }}
            title="Run the audit now instead of waiting for 09:00 UTC"
          >
            {running ? 'Auditing… (~1 min)' : '▶ Run now'}
          </button>
        </div>
        {runMsg && <p className={styles.muted} style={{ marginTop: 8 }}>{runMsg}</p>}
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && !current && <p className={styles.muted}>Loading the audit…</p>}

      {!loading && !current && !error && (
        <div className={styles.card}>
          <p className={styles.muted}>
            No completed audit yet. The agent runs nightly at 09:00 UTC, or press <strong>Run now</strong>.
          </p>
        </div>
      )}

      {current && (
        <>
          <div className={styles.corpusGrid}>
            {/* ── Left: the brief ──────────────────────────────────────── */}
            <div className={styles.card}>
              <div className={styles.statLabel}>Audit of {fmtDate(current.run_date)}</div>
              <div className={styles.muted} style={{ margin: '6px 0 16px' }}>
                Finished {fmtDateTime(current.finished_at)} · {current.probes_run} probes run
                {current.probes_skipped > 0 ? `, ${current.probes_skipped} skipped` : ''}
                {current.probes_errored > 0 ? `, ${current.probes_errored} errored` : ''}
                {' · '}
                {(current.domains || []).join(', ')}
              </div>
              {(current.brief || '').split(/\n{2,}/).filter(Boolean).map((para, i) => (
                // whiteSpace: pre-line keeps single newlines as line breaks. The
                // model-written brief uses blank lines between paragraphs; the
                // plain fallback uses single newlines between findings, and
                // without this the fallback renders as one wall of text.
                <p key={i} style={{ fontSize: 14, lineHeight: 1.75, margin: '0 0 12px', whiteSpace: 'pre-line' }}>{para}</p>
              ))}
              {!current.brief && <p className={styles.muted}>No brief was written for this run.</p>}

              {!current.domains?.includes('repo') && (
                <p className={styles.muted} style={{ marginTop: 16, fontSize: 12 }}>
                  Repo probes (migration drift, cron targets, lint, secrets, doc links) are not in this
                  run — they need a checkout the Railway service does not have. Run them from a session
                  with the repo present; see <code>server/QUALITY_AUDIT_AGENT.md</code>.
                </p>
              )}
            </div>

            {/* ── Right: counts + what cleared ─────────────────────────── */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <MetricCard label="Critical" value={critical} sub={critical === 0 ? 'all clear' : 'fix first'} kind={critical > 0 ? 'error' : 'ok'} />
                <MetricCard label="Warning" value={warning} kind={warning > 0 ? 'warn' : 'ok'} />
                <MetricCard label="Info" value={info} />
                <MetricCard label="New tonight" value={isNew} sub={`${resolved.length} cleared`} kind={isNew > 0 ? 'warn' : 'ok'} />
              </div>

              <div className={styles.card} style={{ marginBottom: 0 }}>
                <div className={styles.cardTitle}>Coverage</div>
                {(current.domains || []).map(d => {
                  // A domain in `domains` was requested, not necessarily
                  // checked. Every probe in it may have skipped for want of a
                  // prerequisite, and saying "repo — migrations, crons, lint"
                  // over a run where all seven skipped is the overclaim this
                  // agent exists to catch.
                  const skippedHere = (current.skipped || []).filter(sk => sk.id.startsWith(`${d}.`))
                  const allSkipped = skippedHere.length > 0 && !(current.findings || []).some(f => f.domain === d)
                  return (
                    <div key={d} className={styles.rowItem}>
                      <span style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>{d}</span>
                      <span className={styles.muted} style={{ flex: 1, textAlign: 'right' }}>
                        {skippedHere.length > 0 ? (
                          <span style={{ color: '#92600A' }}>
                            {allSkipped ? 'not checked' : 'partly checked'} — {skippedHere.length} probe
                            {skippedHere.length === 1 ? '' : 's'} skipped ({skippedHere[0].reason})
                          </span>
                        ) : (DOMAIN_BLURB[d] ?? '')}
                      </span>
                    </div>
                  )
                })}
                {(current.skipped || []).length === 0 && current.probes_skipped > 0 && (
                  // Runs from before the `skipped` column existed know only the
                  // count. Say that, rather than letting the rows above imply
                  // every domain was checked.
                  <div className={styles.gapMeta} style={{ marginTop: 8, color: '#92600A' }}>
                    {current.probes_skipped} probe{current.probes_skipped === 1 ? '' : 's'} skipped, but this run
                    predates the record of which — so a domain above may not have been checked at all.
                  </div>
                )}
                {current.probes_errored > 0 && (
                  <div className={styles.gapMeta} style={{ marginTop: 8, color: '#B23535' }}>
                    {current.probes_errored} probe{current.probes_errored === 1 ? '' : 's'} errored — whatever they
                    check went unchecked. Each one is listed in the findings below.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Findings ──────────────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Findings</div>
            {findings.length === 0 && <p className={styles.muted}>Nothing outstanding in the domains this run covered.</p>}
            {findings.map(f => (
              <div key={f.fingerprint} style={{ opacity: mutedSet.has(f.fingerprint) ? 0.5 : 1 }}>
                <FindingCard f={f} onMute={muteFinding} muting={muting} />
                {mutedSet.has(f.fingerprint) && (
                  <div className={styles.gapMeta} style={{ marginTop: -6, marginBottom: 10 }}>
                    Muted — it will not appear from the next run on.
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Resolved ──────────────────────────────────────────────── */}
          {resolved.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Cleared since the last run</div>
              {resolved.map(r => (
                <div key={r.fingerprint} className={styles.rowItem}>
                  <Badge text={r.severity} colors={SEVERITY_COLORS[r.severity]} />
                  <span style={{ flex: 1, textAlign: 'right' }}>{r.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Mutes ─────────────────────────────────────────────────── */}
          {mutes.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Muted findings</div>
              <p className={styles.muted} style={{ marginBottom: 12 }}>
                Accepted debt. These are suppressed from the report, not fixed. Lifting a mute brings
                the finding back on the next run.
              </p>
              {mutes.map(m => (
                <div key={m.fingerprint} className={styles.gapRow}>
                  <div className={styles.gapRowMain}>
                    <code style={{ fontSize: 12 }}>{m.fingerprint}</code>
                  </div>
                  <div className={styles.gapMeta}>{m.reason}</div>
                  <div className={styles.gapMeta} style={{ marginTop: 4 }}>
                    Muted {fmtDateTime(m.created_at)}
                    {m.expires_at ? ` · expires ${fmtDateTime(m.expires_at)}` : ' · no expiry'}
                  </div>
                  <div className={styles.gapActions} style={{ marginTop: 8 }}>
                    <button className={styles.ghostBtn} onClick={() => liftMute(m.fingerprint)}>Lift mute</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── History ───────────────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>History — last 14 runs</div>
            <table className={styles.sigTable}>
              <thead>
                <tr>
                  <th className={styles.sigTd} style={{ textAlign: 'left' }}>Run</th>
                  <th className={styles.sigTd} style={{ textAlign: 'left' }}>Domains</th>
                  <th className={styles.sigTd}>Status</th>
                  <th className={styles.sigTd}>Critical</th>
                  <th className={styles.sigTd}>Warning</th>
                  <th className={styles.sigTd}>New</th>
                </tr>
              </thead>
              <tbody>
                {history.map(r => {
                  const isOpen = expandedRun === r.id
                  const c = r.counts ?? {}
                  return (
                    <Fragment key={r.id}>
                      <tr className={styles.sigTr} style={{ cursor: 'pointer' }} onClick={() => setExpandedRun(isOpen ? null : r.id)}>
                        <td className={styles.sigTd}>{fmtDateTime(r.started_at)}</td>
                        <td className={styles.sigTd}>{(r.domains || []).join(', ')}</td>
                        <td className={styles.sigTd} style={{ textAlign: 'center' }}>
                          <span className={r.status === 'completed' ? styles.pillOk : r.status === 'failed' ? styles.pillFailed : styles.pillRunning}>
                            {r.status}
                          </span>
                        </td>
                        <td className={styles.sigTd} style={{ textAlign: 'center', color: (c.critical ?? 0) > 0 ? '#B23535' : undefined }}>{c.critical ?? 0}</td>
                        <td className={styles.sigTd} style={{ textAlign: 'center', color: (c.warning ?? 0) > 0 ? '#92600A' : undefined }}>{c.warning ?? 0}</td>
                        <td className={styles.sigTd} style={{ textAlign: 'center' }}>{c.new ?? 0}</td>
                      </tr>
                      {isOpen && (
                        <tr className={styles.sigTr}>
                          <td className={styles.sigTd} colSpan={6}>
                            <div style={{ padding: '8px 0' }}>
                              {r.error && <p className={styles.errText}>{r.error}</p>}
                              {(r.brief || '').split(/\n{2,}/).filter(Boolean).map((para, i) => (
                                <p key={i} style={{ fontSize: 14, lineHeight: 1.75, margin: '0 0 12px', whiteSpace: 'pre-line' }}>{para}</p>
                              ))}
                              {(r.findings || []).map(f => (
                                <div key={f.fingerprint} className={styles.rowItem}>
                                  <Badge text={f.severity} colors={SEVERITY_COLORS[f.severity]} />
                                  <span style={{ flex: 1, textAlign: 'right' }}>{f.title}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.actions}>
            <button className={styles.ghostBtn} onClick={load}>↺ Refresh</button>
          </div>
        </>
      )}
    </div>
  )
}
