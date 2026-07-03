'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import styles from '../admin.module.css'

type Anomaly = { severity: 'warning' | 'critical'; domain: string; message: string }
type Action = { priority: 'high' | 'medium' | 'low'; action: string; rationale: string }
type AgentStat = { fired: boolean; failures: number; last_run: string | null }
type TierGap = { author: string; work: string; tier: number; actual_chunks: number; threshold: number; deficit: number }

type Reflection = {
  id: string
  reflection_week: string
  corpus_total_chunks: number | null
  corpus_chunks_added_this_week: number | null
  corpus_authors_covered: number | null
  corpus_tier1_gaps: TierGap[] | null
  corpus_tier2_gaps: TierGap[] | null
  ingestion_runs_this_week: number | null
  ingestion_failures_this_week: number | null
  agent_status: Record<string, AgentStat> | null
  synthesis_docs_generated: number | null
  synthesis_docs_approved: number | null
  synthesis_docs_pending: number | null
  gap_reports_generated: number | null
  gap_recommendations_actioned: number | null
  active_users_this_week: number | null
  dispatches_sent: number | null
  dispatch_delivery_rate: number | null
  insights_delivered: number | null
  distress_flags_this_week: number | null
  distress_flags_resolved: number | null
  anomalies: Anomaly[] | null
  recommended_actions: Action[] | null
  report_title: string | null
  report_body: string | null
  model_used: string | null
  generated_at: string | null
  generation_duration_ms: number | null
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function fmtWeek(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function agentsFired(status: Record<string, AgentStat> | null): { fired: number; total: number } {
  const entries = status ? Object.values(status) : []
  return { fired: entries.filter(a => a?.fired).length, total: entries.length || 11 }
}

function deliveryLabel(rate: number | null): string {
  return rate == null ? 'n/a' : `${rate}%`
}

// Severity / priority colors (no dedicated CSS classes — inline so the tab is
// self-contained against the shared admin stylesheet).
const SEVERITY_COLORS: Record<string, { bg: string; fg: string }> = {
  critical: { bg: '#FBE3E3', fg: '#B23535' },
  warning: { bg: '#FFF4DB', fg: '#92600A' },
}
const PRIORITY_COLORS: Record<string, { bg: string; fg: string }> = {
  high: { bg: '#FBE3E3', fg: '#B23535' },
  medium: { bg: '#FFF4DB', fg: '#92600A' },
  low: { bg: '#E1F5EE', fg: '#0F6E56' },
}

function Badge({ text, colors }: { text: string; colors: { bg: string; fg: string } }) {
  return (
    <span
      className={styles.pill}
      style={{ background: colors.bg, color: colors.fg }}
    >
      {text}
    </span>
  )
}

function AnomalyList({ anomalies }: { anomalies: Anomaly[] }) {
  if (!anomalies.length) {
    return <p className={styles.muted}>No anomalies detected this week.</p>
  }
  return (
    <>
      {anomalies.map((a, i) => (
        <div key={i} className={styles.rowItem}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge text={a.severity} colors={SEVERITY_COLORS[a.severity] ?? SEVERITY_COLORS.warning} />
            <span className={styles.muted} style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>{a.domain}</span>
          </span>
          <span style={{ flex: 1, textAlign: 'right' }}>{a.message}</span>
        </div>
      ))}
    </>
  )
}

function ReportBody({ r }: { r: Reflection }) {
  return (
    <>
      {(r.report_body || '').split(/\n{2,}/).filter(Boolean).map((para, i) => (
        <p key={i} style={{ fontSize: 14, lineHeight: 1.75, color: 'inherit', margin: '0 0 12px' }}>{para}</p>
      ))}
      {(r.recommended_actions || []).length > 0 && (
        <>
          <div className={styles.sectionLabel} style={{ marginTop: 16 }}>Recommended actions</div>
          {(r.recommended_actions || []).map((act, i) => (
            <div key={i} className={styles.gapRow}>
              <div className={styles.gapRowMain}>
                <Badge text={act.priority} colors={PRIORITY_COLORS[act.priority] ?? PRIORITY_COLORS.medium} />
                <span className={styles.gapTitle}>{act.action}</span>
              </div>
              <div className={styles.gapMeta}>{act.rationale}</div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

function MetricCard({ label, value, sub, kind }: { label: string; value: React.ReactNode; sub?: string; kind?: 'ok' | 'warn' | 'error' }) {
  const color = kind === 'error' ? '#B23535' : kind === 'warn' ? '#92600A' : undefined
  return (
    <div className={styles.card} style={{ marginBottom: 0 }}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ marginTop: 6, color }}>{value}</div>
      {sub && <div className={styles.muted} style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function ReflectionPage() {
  const [current, setCurrent] = useState<Reflection | null>(null)
  const [history, setHistory] = useState<Reflection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/reflection', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load reflections')
      setCurrent(json.current || null)
      setHistory(json.history || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function generateNow() {
    setGenerating(true)
    setGenMsg('Generating this week’s reflection — the agent reads the whole fleet, ~1 minute…')
    try {
      const res = await fetch('/api/admin/reflection/generate', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate')
      setGenMsg('✓ Reflection generated. Re-running in the same week overwrites the same report.')
      await load()
    } catch (e) {
      setGenMsg(e instanceof Error ? e.message : 'Failed to generate')
    }
    setGenerating(false)
  }

  const anomalies = current?.anomalies || []
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length
  const warningCount = anomalies.filter(a => a.severity === 'warning').length
  const anomalyKind: 'ok' | 'warn' | 'error' = criticalCount > 0 ? 'error' : warningCount > 0 ? 'warn' : 'ok'
  const fired = agentsFired(current?.agent_status ?? null)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>Self-reflection</h1>
            <p>The meta-agent&rsquo;s weekly read on the health of the whole system. Generated Sundays 07:00 UTC.</p>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={generateNow}
            disabled={generating}
            style={{ flexShrink: 0 }}
            title="Generate this week's reflection now instead of waiting for Sunday"
          >
            {generating ? 'Generating… (~1 min)' : '▶ Generate now'}
          </button>
        </div>
        {genMsg && <p className={styles.muted} style={{ marginTop: 8 }}>{genMsg}</p>}
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && !current && <p className={styles.muted}>Loading reflections…</p>}

      {!loading && !current && !error && (
        <div className={styles.card}>
          <p className={styles.muted}>
            No reflections yet. The agent runs Sundays at 07:00 UTC and writes the first report once a
            full week of fleet data has accumulated.
          </p>
        </div>
      )}

      {current && (
        <>
          <div className={styles.corpusGrid}>
            {/* ── Left: current week report ───────────────────────────── */}
            <div className={styles.card}>
              <div className={styles.statLabel}>Week of {fmtWeek(current.reflection_week)}</div>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '6px 0 4px', lineHeight: 1.3 }}>
                {current.report_title || 'Untitled reflection'}
              </h2>
              <div className={styles.muted} style={{ marginBottom: 16 }}>
                Generated {fmtDateTime(current.generated_at)}
                {current.model_used ? ` · ${current.model_used}` : ''}
              </div>
              <ReportBody r={current} />
            </div>

            {/* ── Right: system health snapshot ───────────────────────── */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <MetricCard
                  label="Corpus"
                  value={(current.corpus_total_chunks ?? 0).toLocaleString()}
                  sub={`+${current.corpus_chunks_added_this_week ?? 0} this week`}
                  kind={(current.corpus_chunks_added_this_week ?? 0) === 0 ? 'warn' : 'ok'}
                />
                <MetricCard
                  label="Agents"
                  value={`${fired.fired}/${fired.total}`}
                  sub="fired this week"
                  kind={fired.fired < fired.total ? 'warn' : 'ok'}
                />
                <MetricCard
                  label="Engagement"
                  value={(current.active_users_this_week ?? 0).toLocaleString()}
                  sub={`${deliveryLabel(current.dispatch_delivery_rate)} dispatch delivery`}
                  kind={current.dispatch_delivery_rate != null && current.dispatch_delivery_rate < 80 ? 'error' : 'ok'}
                />
                <MetricCard
                  label="Anomalies"
                  value={anomalies.length}
                  sub={criticalCount > 0 ? `${criticalCount} critical` : warningCount > 0 ? `${warningCount} warning` : 'all clear'}
                  kind={anomalyKind}
                />
              </div>

              <div className={styles.card} style={{ marginBottom: 0 }}>
                <div className={styles.cardTitle}>Anomalies</div>
                <AnomalyList anomalies={anomalies} />
              </div>
            </div>
          </div>

          {/* ── History ───────────────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>History — last 8 weeks</div>
            <table className={styles.sigTable}>
              <thead>
                <tr>
                  <th className={styles.sigTd} style={{ textAlign: 'left' }}>Week</th>
                  <th className={styles.sigTd} style={{ textAlign: 'left' }}>Title</th>
                  <th className={styles.sigTd}>Chunks +</th>
                  <th className={styles.sigTd}>Agents</th>
                  <th className={styles.sigTd}>Delivery</th>
                  <th className={styles.sigTd}>Anomalies</th>
                </tr>
              </thead>
              <tbody>
                {history.map(r => {
                  const f = agentsFired(r.agent_status)
                  const aCount = (r.anomalies || []).length
                  const aCrit = (r.anomalies || []).filter(a => a.severity === 'critical').length
                  const isOpen = expandedWeek === r.reflection_week
                  return (
                    <Fragment key={r.reflection_week}>
                      <tr
                        className={styles.sigTr}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedWeek(isOpen ? null : r.reflection_week)}
                      >
                        <td className={styles.sigTd}>{fmtWeek(r.reflection_week)}</td>
                        <td className={styles.sigTd}>{r.report_title || '—'}</td>
                        <td className={styles.sigTd} style={{ textAlign: 'center' }}>{r.corpus_chunks_added_this_week ?? 0}</td>
                        <td className={styles.sigTd} style={{ textAlign: 'center' }}>{f.fired}/{f.total}</td>
                        <td className={styles.sigTd} style={{ textAlign: 'center' }}>{deliveryLabel(r.dispatch_delivery_rate)}</td>
                        <td className={styles.sigTd} style={{ textAlign: 'center' }}>
                          {aCount === 0 ? '0' : (
                            <span style={{ color: aCrit > 0 ? '#B23535' : '#92600A' }}>{aCount}{aCrit > 0 ? ` (${aCrit}✕)` : ''}</span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className={styles.sigTr}>
                          <td className={styles.sigTd} colSpan={6}>
                            <div style={{ padding: '8px 0' }}>
                              <ReportBody r={r} />
                              {(r.anomalies || []).length > 0 && (
                                <>
                                  <div className={styles.sectionLabel} style={{ marginTop: 16 }}>Anomalies</div>
                                  <AnomalyList anomalies={r.anomalies || []} />
                                </>
                              )}
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
