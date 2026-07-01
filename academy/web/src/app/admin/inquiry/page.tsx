'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from '../admin.module.css'

type Suggestion = { author?: string; work?: string; why?: string }
type PursuitPassage = { author?: string; work?: string; chunk_text?: string; similarity?: number }

type Inquiry = {
  id: string
  inquiry_week: string | null
  question: string
  question_origin: string | null
  source_authors: string[] | null
  pursuit_passages: PursuitPassage[] | null
  pursuit_text: string | null
  pursuit_word_count: number | null
  confidence: 'speculative' | 'grounded' | 'unresolved' | null
  where_corpus_runs_out: string | null
  suggested_reading: Suggestion[] | null
  status: 'pending_review' | 'approved' | 'rejected' | 'queued_for_corpus'
  review_notes: string | null
  reviewed_at: string | null
  observatory_visible: boolean
  model_used: string | null
  generated_at: string | null
}

const CONFIDENCE_PILL: Record<string, string> = {
  grounded: styles.pillOk,
  speculative: styles.pillRunning,
  unresolved: styles.pillFailed,
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function InquiryPage() {
  const [pending, setPending] = useState<Inquiry[]>([])
  const [approved, setApproved] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [showApproved, setShowApproved] = useState(true)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/inquiry', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load inquiries')
      setPending(json.pending || [])
      setApproved(json.approved || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function patch(id: string, body: Record<string, unknown>): Promise<Inquiry> {
    const res = await fetch(`/api/admin/inquiry/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Update failed')
    return json.inquiry as Inquiry
  }

  async function approve(inq: Inquiry) {
    setBusy(inq.id)
    try {
      await patch(inq.id, { status: 'approved', review_notes: notes[inq.id] ?? inq.review_notes ?? '' })
      const makeVisible = window.confirm(
        'Approved. Surface this inquiry publicly in the Observatory?\n\n' +
        'OK = show it in the sky (observatory_visible). Cancel = keep it approved but hidden.'
      )
      if (makeVisible) await patch(inq.id, { observatory_visible: true })
      showToast(makeVisible ? 'Approved & surfaced in the Observatory' : 'Approved (hidden from Observatory)')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to approve')
    }
    setBusy(null)
  }

  async function reject(inq: Inquiry) {
    setBusy(inq.id)
    try {
      await patch(inq.id, { status: 'rejected', review_notes: notes[inq.id] ?? inq.review_notes ?? '' })
      showToast('Rejected')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to reject')
    }
    setBusy(null)
  }

  async function queueForCorpus(inq: Inquiry, items?: Suggestion[]) {
    setBusy(inq.id)
    try {
      const res = await fetch(`/api/admin/inquiry/${inq.id}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items ? { items } : {}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to queue')
      showToast(`Queued ${json.queued} work${json.queued === 1 ? '' : 's'} for the corpus`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to queue for corpus')
    }
    setBusy(null)
  }

  async function toggleVisible(inq: Inquiry) {
    setBusy(inq.id)
    try {
      await patch(inq.id, { observatory_visible: !inq.observatory_visible })
      showToast(inq.observatory_visible ? 'Hidden from Observatory' : 'Now visible in the Observatory')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update visibility')
    }
    setBusy(null)
  }

  function ConfidenceBadge({ c }: { c: Inquiry['confidence'] }) {
    if (!c) return null
    return <span className={`${styles.pill} ${CONFIDENCE_PILL[c] ?? ''}`}>{c}</span>
  }

  function SuggestedReading({ inq, actionable }: { inq: Inquiry; actionable: boolean }) {
    const items = (inq.suggested_reading || []).filter(s => s && (s.author || s.work))
    if (items.length === 0) return null
    return (
      <div style={{ marginTop: 14 }}>
        <div className={styles.sectionLabel}>Suggested reading — what the corpus lacks</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          {items.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ fontSize: 13, color: '#333' }}>
                <strong>{s.author || '—'}</strong>{s.work ? ` — ${s.work}` : ''}
                {s.why ? <div className={styles.muted} style={{ marginTop: 2 }}>{s.why}</div> : null}
              </div>
              {actionable && s.author && s.work && (
                <button
                  className={styles.ghostBtn}
                  style={{ height: 28, padding: '0 10px', fontSize: 11, whiteSpace: 'nowrap' }}
                  disabled={busy === inq.id}
                  onClick={() => queueForCorpus(inq, [s])}
                >
                  + Add to corpus queue
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Inquiry agent</h1>
        <p>
          The questions the corpus raises but does not answer — generated Mondays at 06:30 UTC, after synthesis.
          Review each inquiry, then approve (optionally surfacing it in the Observatory), reject, or queue its
          suggested reading for the corpus. The pursuit is speculative inquiry, never ingested as source text.
        </p>
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && pending.length === 0 && <p className={styles.muted}>Loading inquiries…</p>}

      {/* ── Pending review ─────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Pending review ({pending.length})</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={load}>↺ Refresh</button>
        </div>

        {pending.length === 0 ? (
          <p className={styles.muted}>
            Nothing awaiting review. The agent generates three inquiries each Monday at 06:30 UTC.
          </p>
        ) : (
          pending.map(inq => {
            const isOpen = expanded.has(inq.id)
            return (
              <div key={inq.id} className={styles.gapRow}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <ConfidenceBadge c={inq.confidence} />
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 19, lineHeight: 1.3, color: '#1a1a1a', fontWeight: 500 }}>
                    {inq.question}
                  </span>
                </div>
                <div className={styles.gapMeta} style={{ marginTop: 6 }}>
                  Authors: {(inq.source_authors || []).join(', ') || '—'}
                  {inq.pursuit_word_count ? ` · ${inq.pursuit_word_count}-word pursuit` : ''}
                  {inq.pursuit_passages?.length ? ` · pursued across ${new Set(inq.pursuit_passages.map(p => p.author)).size} authors` : ''}
                  {` · generated ${fmtDate(inq.generated_at)}`}
                </div>

                {inq.where_corpus_runs_out && (
                  <div style={{ marginTop: 10, background: '#FBF6EC', border: '1px solid #E8DFC8', borderRadius: 8, padding: '10px 12px' }}>
                    <div className={styles.sectionLabel} style={{ marginBottom: 4 }}>Where the corpus runs out</div>
                    <p style={{ margin: 0, fontSize: 13, color: '#5a5040', fontStyle: 'italic' }}>{inq.where_corpus_runs_out}</p>
                  </div>
                )}

                <div className={styles.gapActions} style={{ marginTop: 10 }}>
                  <button
                    className={styles.ghostBtn}
                    style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                    onClick={() => toggleExpand(inq.id)}
                  >
                    {isOpen ? 'Hide pursuit ↑' : 'Read the pursuit ↓'}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    <div className={styles.sectionLabel}>The pursuit</div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: '#2a2a2a', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '14px 16px', marginTop: 6 }}>
                      {inq.pursuit_text || '—'}
                    </div>

                    {inq.question_origin && (
                      <p className={styles.muted} style={{ marginTop: 10 }}>Origin — {inq.question_origin}</p>
                    )}

                    <SuggestedReading inq={inq} actionable />

                    <div className={styles.sectionLabel} style={{ marginTop: 14 }}>Review notes</div>
                    <textarea
                      className={styles.summaryArea}
                      style={{ minHeight: 70 }}
                      placeholder="Optional review notes…"
                      value={notes[inq.id] ?? inq.review_notes ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [inq.id]: e.target.value }))}
                    />

                    <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 12, flexWrap: 'wrap' }}>
                      <button className={styles.scheduleBtn} disabled={busy === inq.id} onClick={() => approve(inq)}>
                        {busy === inq.id ? 'Working…' : '✓ Approve'}
                      </button>
                      <button className={styles.ghostBtn} disabled={busy === inq.id} onClick={() => queueForCorpus(inq)}>
                        ⇢ Queue for Corpus
                      </button>
                      <button
                        className={styles.ghostBtn}
                        style={{ borderColor: '#B23535', color: '#B23535' }}
                        disabled={busy === inq.id}
                        onClick={() => reject(inq)}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── Approved history ───────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Approved ({approved.length})</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => setShowApproved(s => !s)}>
            {showApproved ? 'Hide ↑' : 'Show ↓'}
          </button>
        </div>
        {showApproved && (
          approved.length === 0 ? (
            <p className={styles.muted}>No approved inquiries yet.</p>
          ) : (
            approved.map(inq => {
              const isOpen = expanded.has(inq.id)
              return (
                <div key={inq.id} className={styles.gapRow}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <ConfidenceBadge c={inq.confidence} />
                    {inq.status === 'queued_for_corpus' && <span className={`${styles.pill} ${styles.pillRunning}`}>queued for corpus</span>}
                    {inq.observatory_visible && <span className={`${styles.pill} ${styles.pillOk}`}>in Observatory</span>}
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1a1a1a', fontWeight: 500 }}>{inq.question}</span>
                  </div>
                  <div className={styles.gapMeta} style={{ marginTop: 6 }}>
                    Week {fmtDate(inq.inquiry_week)} · Authors: {(inq.source_authors || []).join(', ') || '—'} · reviewed {fmtDate(inq.reviewed_at)}
                  </div>
                  <div className={styles.gapActions} style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                    <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => toggleExpand(inq.id)}>
                      {isOpen ? 'Hide ↑' : 'Read ↓'}
                    </button>
                    <button
                      className={styles.ghostBtn}
                      style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                      disabled={busy === inq.id}
                      onClick={() => toggleVisible(inq)}
                    >
                      {inq.observatory_visible ? '👁 Hide from Observatory' : '👁 Show in Observatory'}
                    </button>
                    {inq.status !== 'queued_for_corpus' && (inq.suggested_reading || []).some(s => s?.author && s?.work) && (
                      <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} disabled={busy === inq.id} onClick={() => queueForCorpus(inq)}>
                        ⇢ Queue for Corpus
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: '#2a2a2a', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '14px 16px' }}>
                        {inq.pursuit_text || '—'}
                      </div>
                      {inq.where_corpus_runs_out && <p className={styles.muted} style={{ marginTop: 10 }}>Where it runs out — {inq.where_corpus_runs_out}</p>}
                      <SuggestedReading inq={inq} actionable={false} />
                    </div>
                  )}
                </div>
              )
            })
          )
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
