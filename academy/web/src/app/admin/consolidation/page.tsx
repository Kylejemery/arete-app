'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from '../admin.module.css'

// The Consolidation Agent's review room: what the learning system learned
// last night (morning report), the synthesis proposals awaiting judgment
// (approve = embed + ingest into rag_corpus with provenance; reject = keep
// for the record), and the full ledger. Nothing enters the corpus except
// through this page.

type Synthesis = {
  id: string
  title: string | null
  content: string
  cluster_chunks: string[]
  citations: { author: string | null; work: string | null; section_label: string | null }[] | null
  cluster_stats: { mean_weight?: number; chunks?: number } | null
  status: 'pending_review' | 'approved' | 'rejected' | 'model_rejected' | 'deprecated'
  review_notes: string | null
  reviewed_at: string | null
  rag_corpus_id: string | null
  model_used: string | null
  generated_at: string | null
}

type Report = {
  id: string
  report_date: string
  content: string
  stats: Record<string, unknown> | null
  created_at: string
}

const STATUS_PILL: Record<string, string> = {
  pending_review: styles.pillRunning,
  approved: styles.pillOk,
  rejected: styles.pillFailed,
  model_rejected: styles.pillFailed,
  deprecated: styles.pillFailed,
}
const STATUS_LABEL: Record<string, string> = {
  pending_review: 'pending review',
  approved: 'approved · in corpus',
  rejected: 'rejected',
  model_rejected: 'model rejected',
  deprecated: 'deprecated by outcomes',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ConsolidationPage() {
  const [pending, setPending] = useState<Synthesis[]>([])
  const [ledger, setLedger] = useState<Synthesis[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showLedger, setShowLedger] = useState(true)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/consolidation', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setPending(json.pending || [])
      setLedger(json.ledger || [])
      setReports(json.reports || [])
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
      const res = await fetch('/api/admin/consolidation/run', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start the agent')
      setRunMsg('✓ Consolidating on the server — Hebbian update, synthesis, decay, report. New proposals land here as pending review.')
      setTimeout(() => load(), 45000)
      setTimeout(() => load(), 120000)
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : 'Failed to start')
    }
    setRunning(false)
  }

  async function review(s: Synthesis, status: 'approved' | 'rejected') {
    if (status === 'approved' && !window.confirm(
      'Approve this synthesis?\n\nIt will be embedded and ingested into rag_corpus as a retrievable passage (author "Arete Synthesis", with provenance to its parent chunks). Selection pressure can still deprecate it later if it teaches poorly.'
    )) return
    setBusy(s.id)
    try {
      const res = await fetch(`/api/admin/consolidation/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_notes: notes[s.id] ?? s.review_notes ?? '' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      showToast(status === 'approved' ? 'Approved & ingested into the corpus' : 'Rejected')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update')
    }
    setBusy(null)
  }

  const filteredLedger = useMemo(() => ledger.filter(s =>
    statusFilter === 'all' || s.status === statusFilter
  ), [ledger, statusFilter])

  function SynthesisBody({ s, compact }: { s: Synthesis; compact?: boolean }) {
    return (
      <div style={{ margin: compact ? '10px 0 0' : '16px 0 0', padding: compact ? '14px 18px' : '20px 24px', background: '#FDFBF6', border: '1px solid #E8DFC8', borderRadius: 10 }}>
        {s.title && (
          <div style={{ fontFamily: 'Georgia, serif', fontSize: compact ? 16 : 18, fontWeight: 500, color: '#1a1a1a', marginBottom: 10 }}>{s.title}</div>
        )}
        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: compact ? 14 : 16, lineHeight: 1.7, color: '#26221a' }}>
          {s.content}
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: '#6b6150' }}>
          <strong>Woven from:</strong>{' '}
          {(s.citations || []).map(c => [c.author, c.work].filter(Boolean).join(', ')).filter(Boolean).join(' · ') || `${s.cluster_chunks.length} passages`}
          {s.cluster_stats?.mean_weight != null && (
            <span> · mean edge weight {s.cluster_stats.mean_weight}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Consolidation</h1>
          <p className={styles.muted} style={{ marginTop: 6 }}>
            The learning system&rsquo;s nightly memory pass — Hebbian graph, synthesis proposals, selection pressure.
            Nothing enters the corpus without your approval here.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={runNow} disabled={running}>
            {running ? 'Starting…' : 'Run now'}
          </button>
        </div>
      </div>
      {runMsg && <p className={styles.muted}>{runMsg}</p>}
      {error && <p className={styles.errText}>{error}</p>}
      {toast && <div className={styles.toast}>{toast}</div>}
      {loading && <p className={styles.muted}>Loading…</p>}

      {!loading && (
        <>
          {/* Morning report */}
          <div className={styles.sectionLabel} style={{ marginTop: 18 }}>Morning report</div>
          {reports.length === 0 && <p className={styles.muted}>No reports yet — the agent writes one each night.</p>}
          {reports.slice(0, 1).map(r => (
            <div key={r.id} className={styles.card} style={{ marginTop: 8 }}>
              <div className={styles.cardTitleRow}>
                <span className={styles.cardTitle}>{fmtDate(r.report_date)}</span>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 14.5, lineHeight: 1.65, color: '#33302a' }}>{r.content}</p>
            </div>
          ))}

          {/* Review queue */}
          <div className={styles.sectionLabel} style={{ marginTop: 26 }}>
            Awaiting review {pending.length > 0 ? `(${pending.length})` : ''}
          </div>
          {pending.length === 0 && (
            <p className={styles.muted}>Nothing pending. Proposals appear when clusters of passages keep proving useful together.</p>
          )}
          {pending.map(s => (
            <div key={s.id} className={styles.card} style={{ marginTop: 10 }}>
              <div className={styles.cardTitleRow}>
                <span className={styles.cardTitle}>{s.title ?? 'Untitled synthesis'}</span>
                <span className={`${styles.pill} ${STATUS_PILL[s.status]}`}>{STATUS_LABEL[s.status]}</span>
              </div>
              <p className={styles.muted} style={{ margin: '4px 0 0' }}>
                Proposed {fmtDate(s.generated_at)} · {s.model_used ?? 'unknown model'}
              </p>
              <SynthesisBody s={s} />
              <div style={{ marginTop: 14 }}>
                <input
                  value={notes[s.id] ?? ''}
                  onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))}
                  placeholder="Review notes (optional)"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 8 }}
                />
              </div>
              <div className={styles.gapActions} style={{ marginTop: 10 }}>
                <button className={styles.primaryBtn} disabled={busy === s.id} onClick={() => review(s, 'approved')}>
                  {busy === s.id ? 'Working…' : 'Approve & ingest'}
                </button>
                <button className={styles.ghostBtn} disabled={busy === s.id} onClick={() => review(s, 'rejected')}>
                  Reject
                </button>
              </div>
            </div>
          ))}

          {/* Ledger */}
          <div className={styles.sectionLabel} style={{ marginTop: 26 }}>
            Ledger
            <button className={styles.ghostBtn} style={{ marginLeft: 10, height: 26, padding: '0 10px', fontSize: 11 }} onClick={() => setShowLedger(v => !v)}>
              {showLedger ? 'Hide' : 'Show'}
            </button>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ marginLeft: 10, fontSize: 12, padding: '3px 6px' }}>
              <option value="all">all</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="model_rejected">model rejected</option>
              <option value="deprecated">deprecated</option>
              <option value="pending_review">pending</option>
            </select>
          </div>
          {showLedger && filteredLedger.map(s => (
            <div key={s.id} className={styles.gapRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{s.title ?? (s.status === 'model_rejected' ? 'Cluster judged spurious' : 'Untitled')}</span>
                  <span className={`${styles.pill} ${STATUS_PILL[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                </div>
                <div className={styles.gapMeta}>
                  {fmtDate(s.generated_at)} · {(s.citations || []).map(c => c.author).filter(Boolean).join(', ') || `${s.cluster_chunks.length} passages`}
                  {s.review_notes ? ` · “${s.review_notes}”` : ''}
                </div>
              </div>
            </div>
          ))}
          {showLedger && filteredLedger.length === 0 && <p className={styles.muted}>Nothing here yet.</p>}
        </>
      )}
    </div>
  )
}
