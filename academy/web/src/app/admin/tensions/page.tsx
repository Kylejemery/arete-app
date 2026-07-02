'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from '../admin.module.css'

type Position = { author?: string; work?: string; position_summary?: string; key_passages?: string[] }

type Tension = {
  id: string
  tension_week: string | null
  title: string
  tension_statement: string
  position_a: Position | null
  position_b: Position | null
  additional_positions: Position[] | null
  lived_stakes: string | null
  user_theme_connections: string[] | null
  tension_type: 'genuine_contradiction' | 'contextual_divergence' | 'terminological' | 'developmental' | null
  is_resolvable: 'no' | 'possibly' | 'apparent_only' | null
  resolution_note: string | null
  source_authors: string[] | null
  status: 'pending_review' | 'approved' | 'rejected' | 'merged'
  merged_into: string | null
  review_notes: string | null
  reviewed_at: string | null
  observatory_visible: boolean
  model_used: string | null
  generated_at: string | null
}

const TYPE_LABEL: Record<string, string> = {
  genuine_contradiction: 'genuine contradiction',
  contextual_divergence: 'contextual divergence',
  terminological: 'terminological',
  developmental: 'developmental',
}
const TYPE_PILL: Record<string, string> = {
  genuine_contradiction: styles.pillFailed,
  contextual_divergence: styles.pillRunning,
  terminological: styles.pillOk,
  developmental: styles.pillOk,
}
const RESOLVABLE_LABEL: Record<string, string> = {
  no: 'unresolvable',
  possibly: 'possibly resolvable',
  apparent_only: 'apparent only',
}

type ApprovedSort = 'week' | 'type' | 'author'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function TensionsPage() {
  const [pending, setPending] = useState<Tension[]>([])
  const [approved, setApproved] = useState<Tension[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [notes, setNotes] = useState<Record<string, string>>({})
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [showApproved, setShowApproved] = useState(true)
  const [approvedSort, setApprovedSort] = useState<ApprovedSort>('week')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/tensions', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load tensions')
      setPending(json.pending || [])
      setApproved(json.approved || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function patch(id: string, body: Record<string, unknown>): Promise<Tension> {
    const res = await fetch(`/api/admin/tensions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Update failed')
    return json.tension as Tension
  }

  async function approve(t: Tension) {
    setBusy(t.id)
    try {
      await patch(t.id, { status: 'approved', review_notes: notes[t.id] ?? t.review_notes ?? '' })
      const makeVisible = window.confirm(
        'Approved. Surface this tension publicly in the Observatory?\n\n' +
        'OK = show it in the sky (observatory_visible). Cancel = keep it approved but hidden.'
      )
      if (makeVisible) await patch(t.id, { observatory_visible: true })
      showToast(makeVisible ? 'Approved & surfaced in the Observatory' : 'Approved (hidden from Observatory)')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to approve')
    }
    setBusy(null)
  }

  async function reject(t: Tension) {
    setBusy(t.id)
    try {
      await patch(t.id, { status: 'rejected', review_notes: notes[t.id] ?? t.review_notes ?? '' })
      showToast('Rejected')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to reject')
    }
    setBusy(null)
  }

  async function merge(t: Tension) {
    const target = mergeTarget[t.id]
    if (!target) {
      showToast('Choose the existing tension to merge into first')
      return
    }
    setBusy(t.id)
    try {
      await patch(t.id, { status: 'merged', merged_into: target, review_notes: notes[t.id] ?? t.review_notes ?? '' })
      showToast('Merged into existing tension')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to merge')
    }
    setBusy(null)
  }

  async function toggleVisible(t: Tension) {
    setBusy(t.id)
    try {
      await patch(t.id, { observatory_visible: !t.observatory_visible })
      showToast(t.observatory_visible ? 'Hidden from Observatory' : 'Now visible in the Observatory')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update visibility')
    }
    setBusy(null)
  }

  const sortedApproved = useMemo(() => {
    const list = [...approved]
    if (approvedSort === 'week') {
      list.sort((a, b) => (b.tension_week || '').localeCompare(a.tension_week || ''))
    } else if (approvedSort === 'type') {
      list.sort((a, b) => (a.tension_type || '').localeCompare(b.tension_type || ''))
    } else {
      list.sort((a, b) => ((a.source_authors || [])[0] || '').localeCompare((b.source_authors || [])[0] || ''))
    }
    return list
  }, [approved, approvedSort])

  function TypeBadges({ t }: { t: Tension }) {
    return (
      <>
        {t.tension_type && (
          <span className={`${styles.pill} ${TYPE_PILL[t.tension_type] ?? ''}`}>{TYPE_LABEL[t.tension_type]}</span>
        )}
        {t.is_resolvable && (
          <span className={styles.pill}>{RESOLVABLE_LABEL[t.is_resolvable] ?? t.is_resolvable}</span>
        )}
      </>
    )
  }

  function Positions({ t }: { t: Tension }) {
    const positions = [t.position_a, t.position_b, ...(t.additional_positions || [])].filter(Boolean) as Position[]
    if (positions.length === 0) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
        {positions.map((p, i) => (
          <div key={i} style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '12px 14px' }}>
            <div className={styles.sectionLabel} style={{ marginBottom: 6 }}>
              Position {String.fromCharCode(65 + i)} — {p.author || '—'}{p.work ? `, ${p.work}` : ''}
            </div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: '#2a2a2a' }}>{p.position_summary || '—'}</p>
          </div>
        ))}
      </div>
    )
  }

  function ThemeTags({ t }: { t: Tension }) {
    const themes = t.user_theme_connections || []
    if (themes.length === 0) return null
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        <span className={styles.sectionLabel} style={{ alignSelf: 'center' }}>Live user themes:</span>
        {themes.map(theme => (
          <span key={theme} style={{ fontSize: 12, color: '#6b5a1e', background: '#FBF6EC', border: '1px solid #E8DFC8', borderRadius: 999, padding: '3px 10px' }}>
            {theme}
          </span>
        ))}
      </div>
    )
  }

  function LivedStakes({ t }: { t: Tension }) {
    if (!t.lived_stakes) return null
    return (
      <div style={{ marginTop: 12, background: '#FBF6EC', border: '1px solid #E8DFC8', borderRadius: 8, padding: '12px 14px' }}>
        <div className={styles.sectionLabel} style={{ marginBottom: 6 }}>Lived stakes — what this means for how a person actually lives</div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#5a5040' }}>{t.lived_stakes}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Tension agent</h1>
        <p>
          Unresolved philosophical contradictions across the corpus — places where two or more thinkers, read
          together, produce a genuine problem that neither resolves. Generated Mondays at 05:30 UTC, between the
          Gap Agent and Synthesis. Genuine tensions are never resolved: review each one, then approve (optionally
          surfacing it in the Observatory), reject, or merge a duplicate into the existing catalogue.
        </p>
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && pending.length === 0 && <p className={styles.muted}>Loading tensions…</p>}

      {/* ── Pending review ─────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Pending review ({pending.length})</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={load}>↺ Refresh</button>
        </div>

        {pending.length === 0 ? (
          <p className={styles.muted}>
            Nothing awaiting review. The agent attempts four candidate pairings each Monday at 05:30 UTC —
            storing zero tensions in a week is an honest outcome, never a failure.
          </p>
        ) : (
          pending.map(t => (
            <div key={t.id} className={styles.gapRow}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 21, lineHeight: 1.25, color: '#1a1a1a', fontWeight: 500 }}>
                  {t.title}
                </span>
                <TypeBadges t={t} />
              </div>
              <div className={styles.gapMeta} style={{ marginTop: 6 }}>
                {(t.source_authors || []).join(' · ') || '—'} · week {fmtDate(t.tension_week)} · generated {fmtDate(t.generated_at)}
              </div>

              <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.6, color: '#2a2a2a' }}>{t.tension_statement}</p>

              <Positions t={t} />
              <LivedStakes t={t} />
              {t.resolution_note && (
                <p className={styles.muted} style={{ marginTop: 10 }}>Resolution note — {t.resolution_note}</p>
              )}
              <ThemeTags t={t} />

              <div className={styles.sectionLabel} style={{ marginTop: 14 }}>Review notes</div>
              <textarea
                className={styles.summaryArea}
                style={{ minHeight: 70 }}
                placeholder="Optional review notes…"
                value={notes[t.id] ?? t.review_notes ?? ''}
                onChange={e => setNotes(prev => ({ ...prev, [t.id]: e.target.value }))}
              />

              <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 12, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <button className={styles.scheduleBtn} disabled={busy === t.id} onClick={() => approve(t)}>
                  {busy === t.id ? 'Working…' : '✓ Approve'}
                </button>
                <button
                  className={styles.ghostBtn}
                  style={{ borderColor: '#B23535', color: '#B23535' }}
                  disabled={busy === t.id}
                  onClick={() => reject(t)}
                >
                  ✗ Reject
                </button>
                <select
                  value={mergeTarget[t.id] ?? ''}
                  onChange={e => setMergeTarget(prev => ({ ...prev, [t.id]: e.target.value }))}
                  style={{ height: 34, fontSize: 12, border: '1px solid #ccc', borderRadius: 6, padding: '0 8px', maxWidth: 260 }}
                >
                  <option value="">Merge into existing…</option>
                  {approved.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
                <button className={styles.ghostBtn} disabled={busy === t.id || !mergeTarget[t.id]} onClick={() => merge(t)}>
                  ⇢ Merge
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── The living catalogue ───────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>The living catalogue ({approved.length})</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={approvedSort}
              onChange={e => setApprovedSort(e.target.value as ApprovedSort)}
              style={{ height: 30, fontSize: 12, border: '1px solid #ccc', borderRadius: 6, padding: '0 8px' }}
            >
              <option value="week">Sort by week</option>
              <option value="type">Sort by type</option>
              <option value="author">Sort by author</option>
            </select>
            <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => setShowApproved(s => !s)}>
              {showApproved ? 'Hide ↑' : 'Show ↓'}
            </button>
          </div>
        </div>
        <p className={styles.muted} style={{ marginTop: 4 }}>
          Everything the corpus disagrees with itself about. Held open on purpose.
        </p>
        {showApproved && (
          sortedApproved.length === 0 ? (
            <p className={styles.muted}>No approved tensions yet.</p>
          ) : (
            sortedApproved.map(t => (
              <div key={t.id} className={styles.gapRow}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  {t.observatory_visible && <span className={`${styles.pill} ${styles.pillOk}`}>in Observatory</span>}
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#1a1a1a', fontWeight: 500 }}>{t.title}</span>
                  <TypeBadges t={t} />
                </div>
                <div className={styles.gapMeta} style={{ marginTop: 6 }}>
                  {(t.source_authors || []).join(' · ') || '—'} · week {fmtDate(t.tension_week)} · reviewed {fmtDate(t.reviewed_at)}
                </div>
                <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.55, color: '#2a2a2a' }}>{t.tension_statement}</p>
                <Positions t={t} />
                <LivedStakes t={t} />
                <div className={styles.gapActions} style={{ marginTop: 10 }}>
                  <button
                    className={styles.ghostBtn}
                    style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                    disabled={busy === t.id}
                    onClick={() => toggleVisible(t)}
                  >
                    {t.observatory_visible ? '👁 Hide from Observatory' : '👁 Show in Observatory'}
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
