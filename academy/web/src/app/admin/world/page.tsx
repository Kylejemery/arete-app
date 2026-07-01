'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import styles from '../admin.module.css'

type Signal = {
  signal: string
  source_category: string
  category?: string
  philosophical_relevance: string
  tradition?: string
}
type Passage = { id?: string; author: string; work: string; text: string; similarity?: number }

type Observation = {
  id: string
  observation_week: string
  world_signals: Signal[] | null
  dominant_signal: string | null
  corpus_response: string | null
  relevant_passages: Passage[] | null
  relevant_authors: string[] | null
  world_corpus_tension: string | null
  dispatch_context: string | null
  status: 'pending_review' | 'approved' | 'auto_approved' | 'rejected'
  reviewed_at: string | null
  observatory_visible: boolean | null
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
function truncate(s: string | null, n: number): string {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s
}

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  pending_review: { bg: '#FFF4DB', fg: '#92600A', label: 'Pending review' },
  approved: { bg: '#E1F5EE', fg: '#0F6E56', label: 'Approved' },
  auto_approved: { bg: '#E1F5EE', fg: '#0F6E56', label: 'Auto-approved' },
  rejected: { bg: '#FBE3E3', fg: '#B23535', label: 'Rejected' },
}
const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  scientific: { bg: '#E1F5EE', fg: '#0F6E56' },
  cultural: { bg: '#EFE7FA', fg: '#5B3E8E' },
  political: { bg: '#FBE3E3', fg: '#B23535' },
  technological: { bg: '#E3EEFB', fg: '#2C5A9E' },
  death: { bg: '#EDEDED', fg: '#444' },
}

function Badge({ text, colors }: { text: string; colors: { bg: string; fg: string } }) {
  return (
    <span className={styles.pill} style={{ background: colors.bg, color: colors.fg }}>{text}</span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.pending_review
  return <Badge text={c.label} colors={{ bg: c.bg, fg: c.fg }} />
}

function SignalList({ signals }: { signals: Signal[] }) {
  if (!signals.length) return <p className={styles.muted}>No signals gathered.</p>
  return (
    <>
      {signals.map((s, i) => (
        <div key={i} className={styles.gapRow}>
          <div className={styles.gapRowMain} style={{ flexWrap: 'wrap' }}>
            {s.category && <Badge text={s.category} colors={CATEGORY_COLORS[s.category] ?? CATEGORY_COLORS.cultural} />}
            <span className={styles.gapTitle}>{s.signal}</span>
          </div>
          <div className={styles.gapMeta}>
            {s.philosophical_relevance}
            {s.tradition ? ` · ${s.tradition}` : ''}
          </div>
        </div>
      ))}
    </>
  )
}

export default function WorldPage() {
  const [current, setCurrent] = useState<Observation | null>(null)
  const [history, setHistory] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)
  const [signalsOpen, setSignalsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftContext, setDraftContext] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/world', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load world observations')
      setCurrent(json.current || null)
      setHistory(json.history || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const patch = useCallback(async (id: string, body: Record<string, unknown>, tag: string) => {
    setBusy(tag)
    setError('')
    try {
      const res = await fetch(`/api/admin/world/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    }
    setBusy('')
  }, [load])

  const generate = useCallback(async () => {
    setBusy('generate')
    setError('')
    try {
      const res = await fetch('/api/admin/world/generate', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    }
    setBusy('')
  }, [load])

  const c = current
  const isReviewed = c ? (c.status === 'approved' || c.status === 'rejected') : false

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>World</h1>
        <p>The first outward-facing agent. Each Monday it reads the world, asks what the corpus has to say about it, and offers a digest for the Daily Dispatch. Runs Mondays 03:30 UTC.</p>
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
        </div>
      )}

      <div className={styles.actions} style={{ marginBottom: 16 }}>
        <button className={styles.ghostBtn} onClick={generate} disabled={!!busy}>
          {busy === 'generate' ? 'Reading the world…' : '✶ Generate now'}
        </button>
        <button className={styles.ghostBtn} onClick={load} disabled={!!busy}>↺ Refresh</button>
      </div>

      {loading && !c && <p className={styles.muted}>Loading world observations…</p>}

      {!loading && !c && !error && (
        <div className={styles.card}>
          <p className={styles.muted}>
            No world observations yet. The agent runs Mondays at 03:30 UTC — or press
            &ldquo;Generate now&rdquo; to read the world immediately.
          </p>
        </div>
      )}

      {c && (
        <>
          {/* ── This week ─────────────────────────────────────────────── */}
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div className={styles.statLabel}>Week of {fmtWeek(c.observation_week)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusBadge status={c.status} />
                {c.observatory_visible && <Badge text="On the Observatory" colors={{ bg: '#0d1428', fg: '#c9a84c' }} />}
              </div>
            </div>

            <div className={styles.sectionLabel} style={{ marginTop: 14 }}>The dominant signal</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 6px', lineHeight: 1.3 }}>
              {c.dominant_signal || 'Untitled signal'}
            </h2>
            <div className={styles.muted} style={{ marginBottom: 8 }}>
              Generated {fmtDateTime(c.generated_at)}{c.model_used ? ` · ${c.model_used}` : ''}
            </div>

            {(c.relevant_authors || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 8px' }}>
                {(c.relevant_authors || []).map(a => (
                  <Badge key={a} text={a} colors={{ bg: 'rgba(201,168,76,0.12)', fg: '#7a5c14' }} />
                ))}
              </div>
            )}
          </div>

          <div className={styles.corpusGrid}>
            {/* Left: corpus response + tension */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>What the corpus has to say</div>
              {(c.corpus_response || '').split(/\n{2,}/).filter(Boolean).map((para, i) => (
                <p key={i} style={{ fontSize: 14, lineHeight: 1.75, margin: '0 0 12px' }}>{para}</p>
              ))}

              {c.world_corpus_tension && (
                <div style={{ background: '#FFF4DB', border: '1px solid #E9CE86', borderRadius: 10, padding: '14px 16px', marginTop: 8 }}>
                  <div className={styles.sectionLabel} style={{ marginBottom: 6 }}>Where the world pushes back</div>
                  <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, color: '#5c4a1a' }}>{c.world_corpus_tension}</p>
                </div>
              )}
            </div>

            {/* Right: dispatch context + actions */}
            <div>
              <div className={styles.card} style={{ marginBottom: 12 }}>
                <div className={styles.cardTitle}>Dispatch context</div>
                {editing ? (
                  <>
                    <textarea
                      value={draftContext}
                      onChange={e => setDraftContext(e.target.value)}
                      rows={7}
                      style={{ width: '100%', fontSize: 13, lineHeight: 1.6, padding: 10, borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                    <div className={styles.actions} style={{ marginTop: 8 }}>
                      <button className={styles.ghostBtn} disabled={!!busy}
                        onClick={() => patch(c.id, { dispatch_context: draftContext }, 'edit').then(() => setEditing(false))}>
                        {busy === 'edit' ? 'Saving…' : 'Save'}
                      </button>
                      <button className={styles.ghostBtn} onClick={() => setEditing(false)} disabled={!!busy}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 14, lineHeight: 1.7, margin: '0 0 4px' }}>{c.dispatch_context || '—'}</p>
                    <div className={styles.actions} style={{ marginTop: 10 }}>
                      <button className={styles.ghostBtn} disabled={!!busy}
                        onClick={() => { setDraftContext(c.dispatch_context || ''); setEditing(true) }}>
                        Edit dispatch context
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.card} style={{ marginBottom: 0 }}>
                <div className={styles.cardTitle}>Review</div>
                <p className={styles.muted} style={{ marginTop: 0 }}>
                  {isReviewed
                    ? `Reviewed ${fmtDateTime(c.reviewed_at)}.`
                    : c.status === 'auto_approved'
                      ? 'Auto-approved (scientific signal). Already eligible for the dispatch.'
                      : 'Approving lets this week’s dispatch_context flow into the Daily Dispatch.'}
                </p>
                <div className={styles.actions} style={{ flexWrap: 'wrap' }}>
                  <button className={styles.ghostBtn} disabled={!!busy || c.status === 'approved'}
                    onClick={() => patch(c.id, { status: 'approved' }, 'approve')}>
                    {busy === 'approve' ? '…' : 'Approve for Dispatch'}
                  </button>
                  <button className={styles.ghostBtn} disabled={!!busy || c.status === 'rejected'}
                    onClick={() => patch(c.id, { status: 'rejected' }, 'reject')}>
                    {busy === 'reject' ? '…' : 'Reject'}
                  </button>
                  <button className={styles.ghostBtn} disabled={!!busy}
                    onClick={() => patch(c.id, { observatory_visible: !c.observatory_visible }, 'obs')}>
                    {busy === 'obs' ? '…' : c.observatory_visible ? 'Hide from Observatory' : 'Show on Observatory'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* All signals (expandable) */}
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setSignalsOpen(o => !o)}>
              <div className={styles.cardTitle} style={{ marginBottom: 0 }}>
                All signals gathered ({(c.world_signals || []).length})
              </div>
              <span className={styles.muted}>{signalsOpen ? '▲' : '▼'}</span>
            </div>
            {signalsOpen && <div style={{ marginTop: 12 }}><SignalList signals={c.world_signals || []} /></div>}
          </div>

          {/* History */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>History — last 8 weeks</div>
            <table className={styles.sigTable}>
              <thead>
                <tr>
                  <th className={styles.sigTd} style={{ textAlign: 'left' }}>Week</th>
                  <th className={styles.sigTd} style={{ textAlign: 'left' }}>Dominant signal</th>
                  <th className={styles.sigTd} style={{ textAlign: 'left' }}>Authors</th>
                  <th className={styles.sigTd}>Status</th>
                  <th className={styles.sigTd}>Dispatch used</th>
                </tr>
              </thead>
              <tbody>
                {history.map(r => {
                  const isOpen = expandedWeek === r.observation_week
                  const dispatchUsed = r.status === 'approved' || r.status === 'auto_approved'
                  return (
                    <Fragment key={r.observation_week}>
                      <tr className={styles.sigTr} style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedWeek(isOpen ? null : r.observation_week)}>
                        <td className={styles.sigTd}>{fmtWeek(r.observation_week)}</td>
                        <td className={styles.sigTd}>{truncate(r.dominant_signal, 70)}</td>
                        <td className={styles.sigTd}>{truncate((r.relevant_authors || []).join(', '), 40)}</td>
                        <td className={styles.sigTd} style={{ textAlign: 'center' }}><StatusBadge status={r.status} /></td>
                        <td className={styles.sigTd} style={{ textAlign: 'center' }}>{dispatchUsed ? '✓' : '—'}</td>
                      </tr>
                      {isOpen && (
                        <tr className={styles.sigTr}>
                          <td className={styles.sigTd} colSpan={5}>
                            <div style={{ padding: '8px 0' }}>
                              {(r.corpus_response || '').split(/\n{2,}/).filter(Boolean).map((para, i) => (
                                <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, margin: '0 0 10px' }}>{para}</p>
                              ))}
                              {r.world_corpus_tension && (
                                <>
                                  <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Tension</div>
                                  <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '4px 0 0' }}>{r.world_corpus_tension}</p>
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
        </>
      )}
    </div>
  )
}
