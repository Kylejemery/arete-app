'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from '../admin.module.css'

type Convergence = {
  id: string
  run_id: string | null
  created_at: string | null
  title: string | null
  conclusion_text: string | null
  source_passage_ids: string[] | null
  source_authors: string[] | null
  source_traditions: string[] | null
  entailment_strength: 'deductive' | 'strong' | 'suggestive' | null
  novelty: 'novel' | 'latent' | 'already_stated' | null
  mean_pairwise_distance: number | null
  pursuit_text: string | null
  breakpoint_text: string | null
  status: 'pending_review' | 'approved' | 'rejected' | 'starred'
  significance_note: string | null
}

// Deductive reads as the strongest claim, suggestive the weakest — never dress
// a suggestive convergence up as more.
const ENTAILMENT_PILL: Record<string, string> = {
  deductive: styles.pillOk,
  strong: styles.pillRunning,
  suggestive: styles.pillFailed,
}
const NOVELTY_PILL: Record<string, string> = {
  novel: styles.pillOk,
  latent: styles.pillRunning,
  already_stated: styles.pillFailed,
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'n/a'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ConvergencePage() {
  const [pending, setPending] = useState<Convergence[]>([])
  const [reviewed, setReviewed] = useState<Convergence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [showReviewed, setShowReviewed] = useState(true)
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/convergence', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load convergences')
      setPending(json.pending || [])
      setReviewed(json.reviewed || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function runNow() {
    setRunning(true)
    setRunMsg('')
    try {
      const res = await fetch('/api/admin/convergence/run', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start the agent')
      setRunMsg('Assembling convergences on the server. Up to three, three model passes each, several minutes. Survivors land here as pending review. Zero is a valid outcome when nothing clears the bar.')
      setTimeout(() => load(), 90000)
      setTimeout(() => load(), 240000)
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : 'Failed to start the agent')
    }
    setRunning(false)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function patch(id: string, body: Record<string, unknown>): Promise<Convergence> {
    const res = await fetch(`/api/admin/convergence/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Update failed')
    return json.convergence as Convergence
  }

  async function review(c: Convergence, status: 'approved' | 'rejected' | 'starred') {
    setBusy(c.id)
    try {
      const note = notes[c.id] ?? c.significance_note ?? ''
      await patch(c.id, { status, significance_note: note })
      showToast(status === 'approved' ? 'Approved' : status === 'starred' ? 'Starred' : 'Rejected')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update')
    }
    setBusy(null)
  }

  function Pills({ c }: { c: Convergence }) {
    return (
      <>
        {c.entailment_strength && (
          <span className={`${styles.pill} ${ENTAILMENT_PILL[c.entailment_strength] ?? ''}`}>{c.entailment_strength}</span>
        )}
        {c.novelty && (
          <span className={`${styles.pill} ${NOVELTY_PILL[c.novelty] ?? ''}`}>{c.novelty.replace('_', ' ')}</span>
        )}
      </>
    )
  }

  function Meta({ c }: { c: Convergence }) {
    const authors = (c.source_authors || []).join(', ') || 'n/a'
    const traditions = (c.source_traditions || []).join(', ') || 'n/a'
    const spread = typeof c.mean_pairwise_distance === 'number' ? c.mean_pairwise_distance.toFixed(3) : 'n/a'
    const n = c.source_passage_ids?.length ?? 0
    return (
      <div className={styles.gapMeta} style={{ marginTop: 6 }}>
        Authors: {authors} · Traditions: {traditions} · {n} passages · spread {spread} · assembled {fmtDate(c.created_at)}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>Convergence agent</h1>
            <p>
              The answers the corpus already contains but has never assembled. The agent samples passages that sit
              far apart in embedding space, holds them together, and states the one conclusion (the sumperasma) that
              follows from all of them and is written in none. It supplies validity and novelty only. Significance is
              your call: the note below is the one judgment the agent cannot make, whether a valid, novel conclusion
              is worth keeping. Approved and starred convergences seed Synthesis and the Observatory. Nothing is ever
              ingested into the corpus.
            </p>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={runNow}
            disabled={running}
            style={{ flexShrink: 0 }}
            title="Assemble convergences now instead of waiting for the Monday cron"
          >
            {running ? 'Starting…' : '▶ Run agent now'}
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

      {loading && pending.length === 0 && <p className={styles.muted}>Loading convergences…</p>}

      {/* Pending review */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Pending review ({pending.length})</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={load}>↺ Refresh</button>
        </div>

        {pending.length === 0 ? (
          <p className={styles.muted}>
            Nothing awaiting review. Strongest and least obvious surface first (deductive before suggestive).
          </p>
        ) : (
          pending.map(c => {
            const isOpen = expanded.has(c.id)
            return (
              <div key={c.id} className={styles.gapRow}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <Pills c={c} />
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 19, lineHeight: 1.3, color: '#1a1a1a', fontWeight: 500 }}>
                    {c.title || 'Untitled convergence'}
                  </span>
                </div>

                <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.5, color: '#2a2a2a' }}>{c.conclusion_text}</p>
                <Meta c={c} />

                {c.breakpoint_text && (
                  <div style={{ marginTop: 10, background: '#FBF6EC', border: '1px solid #E8DFC8', borderRadius: 8, padding: '10px 12px' }}>
                    <div className={styles.sectionLabel} style={{ marginBottom: 4 }}>Breakpoint — the premise whose removal collapses it</div>
                    <p style={{ margin: 0, fontSize: 13, color: '#5a5040', fontStyle: 'italic' }}>{c.breakpoint_text}</p>
                  </div>
                )}

                <div className={styles.gapActions} style={{ marginTop: 10 }}>
                  <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => toggleExpand(c.id)}>
                    {isOpen ? 'Hide the pursuit ↑' : 'Read the pursuit ↓'}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    <div className={styles.sectionLabel}>The pursuit</div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: '#2a2a2a', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '14px 16px', marginTop: 6 }}>
                      {c.pursuit_text || 'n/a'}
                    </div>

                    <div className={styles.sectionLabel} style={{ marginTop: 14 }}>Significance note — is this valid, novel conclusion worth keeping?</div>
                    <textarea
                      className={styles.summaryArea}
                      style={{ minHeight: 70 }}
                      placeholder="Your judgment on whether this convergence is worth wanting…"
                      value={notes[c.id] ?? c.significance_note ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                    />

                    <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 12, flexWrap: 'wrap' }}>
                      <button className={styles.scheduleBtn} disabled={busy === c.id} onClick={() => review(c, 'approved')}>
                        {busy === c.id ? 'Working…' : '✓ Approve'}
                      </button>
                      <button className={styles.ghostBtn} disabled={busy === c.id} onClick={() => review(c, 'starred')}>
                        ★ Star
                      </button>
                      <button
                        className={styles.ghostBtn}
                        style={{ borderColor: '#B23535', color: '#B23535' }}
                        disabled={busy === c.id}
                        onClick={() => review(c, 'rejected')}
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

      {/* Reviewed history */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Reviewed ({reviewed.length})</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => setShowReviewed(s => !s)}>
            {showReviewed ? 'Hide ↑' : 'Show ↓'}
          </button>
        </div>
        {showReviewed && (
          reviewed.length === 0 ? (
            <p className={styles.muted}>No reviewed convergences yet.</p>
          ) : (
            reviewed.map(c => {
              const isOpen = expanded.has(c.id)
              return (
                <div key={c.id} className={styles.gapRow}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    {c.status === 'starred' && <span className={`${styles.pill} ${styles.pillOk}`}>★ starred</span>}
                    {c.status === 'approved' && <span className={`${styles.pill} ${styles.pillOk}`}>approved</span>}
                    {c.status === 'rejected' && <span className={`${styles.pill} ${styles.pillFailed}`}>rejected</span>}
                    <Pills c={c} />
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1a1a1a', fontWeight: 500 }}>{c.title || 'Untitled convergence'}</span>
                  </div>
                  <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, color: '#3a3a3a' }}>{c.conclusion_text}</p>
                  <Meta c={c} />
                  {c.significance_note && (
                    <p className={styles.muted} style={{ marginTop: 8 }}>Significance — {c.significance_note}</p>
                  )}
                  <div className={styles.gapActions} style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                    <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => toggleExpand(c.id)}>
                      {isOpen ? 'Hide ↑' : 'Read ↓'}
                    </button>
                    {c.status !== 'starred' && (
                      <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} disabled={busy === c.id} onClick={() => review(c, 'starred')}>
                        ★ Star
                      </button>
                    )}
                    {c.status === 'rejected' && (
                      <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} disabled={busy === c.id} onClick={() => review(c, 'approved')}>
                        ✓ Approve instead
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 12 }}>
                      {c.breakpoint_text && <p className={styles.muted} style={{ marginBottom: 8 }}>Breakpoint — {c.breakpoint_text}</p>}
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: '#2a2a2a', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '14px 16px' }}>
                        {c.pursuit_text || 'n/a'}
                      </div>
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
