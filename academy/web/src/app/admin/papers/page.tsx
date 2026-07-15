'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'

type Paper = {
  id: string
  author: string
  work: string
  year: string | null
  venue: string | null
  source_url: string | null
  storage_path: string | null
  summary_text: string | null
  detected_title: string | null
  detected_authors: string | null
  key_concepts: string[] | null
  model_used: string | null
  status: 'queued' | 'summarizing' | 'pending_review' | 'ingested' | 'rejected' | 'failed'
  error_message: string | null
  review_notes: string | null
  rag_chunk_ids: string[] | null
  ingested_at: string | null
  created_at: string
}

const STATUS_PILL: Record<Paper['status'], string> = {
  queued: styles.pillRunning,
  summarizing: styles.pillRunning,
  pending_review: styles.pillRunning,
  ingested: styles.pillOk,
  rejected: styles.pillFailed,
  failed: styles.pillFailed,
}
const STATUS_LABEL: Record<Paper['status'], string> = {
  queued: 'queued',
  summarizing: 'summarizing…',
  pending_review: 'pending review',
  ingested: 'ingested',
  rejected: 'rejected',
  failed: 'failed',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

// The submitted citation vs. what the agent read off the PDF — a cheap tripwire
// for "wrong paper at that URL" and misattributions.
function mismatch(p: Paper): boolean {
  if (!p.detected_title) return false
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const a = norm(p.work)
  const b = norm(p.detected_title)
  return !(a.includes(b) || b.includes(a))
}

export default function PapersPage() {
  const [active, setActive] = useState<Paper[]>([])
  const [settled, setSettled] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [cite, setCite] = useState<Record<string, { author: string; work: string }>>({})

  // Queue form
  const [fAuthor, setFAuthor] = useState('')
  const [fWork, setFWork] = useState('')
  const [fYear, setFYear] = useState('')
  const [fVenue, setFVenue] = useState('')
  const [fUrl, setFUrl] = useState('')
  const [fFile, setFFile] = useState<File | null>(null)
  const [queueing, setQueueing] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/papers', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load papers')
      setActive(json.active || [])
      setSettled(json.settled || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function queuePaper() {
    if (!fAuthor.trim() || !fWork.trim()) {
      showToast('Author and title are required')
      return
    }
    if (!!fUrl.trim() === !!fFile) {
      showToast('Provide a PDF link OR choose a file — exactly one')
      return
    }
    setQueueing(true)
    try {
      let storagePath: string | null = null
      if (fFile) {
        if (!/\.pdf$/i.test(fFile.name) && fFile.type !== 'application/pdf') {
          throw new Error('The file must be a PDF')
        }
        const uRes = await fetch('/api/admin/papers/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: fFile.name }),
        })
        const uJson = await uRes.json()
        if (!uRes.ok) throw new Error(uJson.error || 'Failed to prepare upload')
        const { error: upErr } = await supabase.storage
          .from('papers')
          .uploadToSignedUrl(uJson.path, uJson.token, fFile, { contentType: 'application/pdf' })
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
        storagePath = uJson.path
      }

      const res = await fetch('/api/admin/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: fAuthor,
          work: fWork,
          year: fYear,
          venue: fVenue,
          sourceUrl: storagePath ? undefined : fUrl,
          storagePath: storagePath ?? undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to queue paper')
      setFAuthor(''); setFWork(''); setFYear(''); setFVenue(''); setFUrl(''); setFFile(null)
      showToast('Queued — the agent is reading it now')
      await load()
      setTimeout(() => load(), 30000)
      setTimeout(() => load(), 90000)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to queue')
    }
    setQueueing(false)
  }

  async function runNow() {
    setRunning(true)
    setRunMsg('')
    try {
      const res = await fetch('/api/admin/papers/run', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start the agent')
      setRunMsg('✓ The agent is reading the queued PDFs — a minute or two per paper. Summaries land here as pending review.')
      setTimeout(() => load(), 30000)
      setTimeout(() => load(), 90000)
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : 'Failed to start the agent')
    }
    setRunning(false)
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/papers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Update failed')
  }

  async function approveIngest(p: Paper) {
    setBusy(p.id)
    try {
      // Persist any citation correction and notes first — ingestion reads them.
      const c = cite[p.id]
      await patch(p.id, {
        review_notes: notes[p.id] ?? p.review_notes ?? '',
        ...(c ? { author: c.author, work: c.work } : {}),
      })
      const res = await fetch(`/api/admin/papers/${p.id}/ingest`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Ingestion failed')
      const planted = (json.conceptsPlanted || []).length
      showToast(`Ingested — ${json.chunksCreated} chunk${json.chunksCreated === 1 ? '' : 's'} retrievable${planted ? ` · ${planted} concept${planted === 1 ? '' : 's'} planted in the Observatory` : ''}`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to ingest')
    }
    setBusy(null)
  }

  async function reject(p: Paper) {
    setBusy(p.id)
    try {
      await patch(p.id, { status: 'rejected', review_notes: notes[p.id] ?? p.review_notes ?? '' })
      showToast('Rejected — nothing was ingested')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to reject')
    }
    setBusy(null)
  }

  async function requeue(p: Paper) {
    setBusy(p.id)
    try {
      await patch(p.id, { status: 'queued' })
      showToast('Re-queued for another pass')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to re-queue')
    }
    setBusy(null)
  }

  async function deingest(p: Paper) {
    if (!window.confirm(`Remove "${p.work}" from the corpus? Its summary chunks are deleted from retrieval and the paper returns to pending review.`)) return
    setBusy(p.id)
    try {
      const res = await fetch(`/api/admin/papers/${p.id}/deingest`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'De-ingestion failed')
      showToast(`Removed ${json.chunksRemoved} chunk${json.chunksRemoved === 1 ? '' : 's'} from the corpus`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to de-ingest')
    }
    setBusy(null)
  }

  function SummaryBody({ p }: { p: Paper }) {
    if (!p.summary_text) return null
    return (
      <div style={{ margin: '14px 0 0', padding: '18px 22px', background: '#FDFBF6', border: '1px solid #E8DFC8', borderRadius: 10 }}>
        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: 15.5, lineHeight: 1.7, color: '#26221a' }}>
          {p.summary_text}
        </div>
        {(p.key_concepts || []).length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: '#8a6d1e' }}>
            Works through: {(p.key_concepts || []).join(' · ')} — approving plants these in the Observatory sky
          </div>
        )}
      </div>
    )
  }

  function SourceLine({ p }: { p: Paper }) {
    return (
      <span className={styles.gapMeta}>
        {p.year ? `${p.year} · ` : ''}{p.venue ? `${p.venue} · ` : ''}
        {p.source_url
          ? <a href={p.source_url} target="_blank" rel="noopener noreferrer">source PDF ↗</a>
          : 'uploaded PDF'}
        {' · '}submitted {fmtDate(p.created_at)}
      </span>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>Paper agent</h1>
            <p>
              Scholarly papers enter the corpus as summaries, never verbatim — open access is not public domain. Queue
              a paper by link or upload; the agent reads the PDF and writes the summary that would represent it; nothing
              is ingested until you approve it here. Ingested summaries are retrievable by counselors but never appear
              on the Library shelves.
            </p>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={runNow}
            disabled={running}
            style={{ flexShrink: 0 }}
            title="Summarize the queued PDFs now"
          >
            {running ? 'Starting…' : '▶ Summarize now'}
          </button>
        </div>
        {runMsg && <p className={styles.muted} style={{ marginTop: 8 }}>{runMsg}</p>}
      </div>

      {toast && <div className={styles.card} style={{ borderColor: '#c9a84c' }}><p style={{ margin: 0 }}>{toast}</p></div>}
      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {/* ── Queue a paper ──────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Queue a paper</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 720 }}>
          <input className={styles.summaryArea} style={{ minHeight: 0, height: 38 }} placeholder="Author(s) — e.g. Nussbaum, Martha" value={fAuthor} onChange={e => setFAuthor(e.target.value)} />
          <input className={styles.summaryArea} style={{ minHeight: 0, height: 38 }} placeholder="Paper title" value={fWork} onChange={e => setFWork(e.target.value)} />
          <input className={styles.summaryArea} style={{ minHeight: 0, height: 38 }} placeholder="Year (optional)" value={fYear} onChange={e => setFYear(e.target.value)} />
          <input className={styles.summaryArea} style={{ minHeight: 0, height: 38 }} placeholder="Journal / repository (optional)" value={fVenue} onChange={e => setFVenue(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <input
            className={styles.summaryArea}
            style={{ minHeight: 0, height: 38, flex: '1 1 320px' }}
            placeholder="Direct PDF link (PhilArchive, arXiv…) — or choose a file →"
            value={fUrl}
            onChange={e => { setFUrl(e.target.value); if (e.target.value) setFFile(null) }}
          />
          <label className={styles.ghostBtn} style={{ height: 38, display: 'inline-flex', alignItems: 'center', padding: '0 14px', cursor: 'pointer' }}>
            {fFile ? `📄 ${fFile.name.slice(0, 32)}${fFile.name.length > 32 ? '…' : ''}` : 'Choose PDF…'}
            <input
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0] || null; setFFile(f); if (f) setFUrl('') }}
            />
          </label>
          <button className={styles.scheduleBtn} onClick={queuePaper} disabled={queueing}>
            {queueing ? 'Queueing…' : '＋ Queue for summary'}
          </button>
        </div>
        <p className={styles.muted} style={{ marginTop: 10 }}>
          Link the PDF itself, not a landing page. The agent reads it, writes a {`500–900`}-word scholarly summary
          attributing every claim to the author, and parks it below for your review.
        </p>
      </div>

      {loading && active.length === 0 && <p className={styles.muted}>Loading papers…</p>}

      {/* ── In flight & pending review ─────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>In review ({active.length})</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={load}>↺ Refresh</button>
        </div>

        {active.length === 0 ? (
          <p className={styles.muted}>Nothing in flight. Queue a paper above — summaries appear here for review.</p>
        ) : (
          active.map(p => (
            <div key={p.id} className={styles.gapRow}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span className={`${styles.pill} ${STATUS_PILL[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                <strong>{p.author}</strong> — {p.work}
              </div>
              <div style={{ marginTop: 4 }}><SourceLine p={p} /></div>

              {p.status === 'failed' && p.error_message && (
                <p className={styles.errText} style={{ marginTop: 10 }}>{p.error_message}</p>
              )}

              {p.status === 'pending_review' && (
                <>
                  {mismatch(p) && (
                    <div style={{ marginTop: 10, background: '#FBF0EC', border: '1px solid #E0BFB0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#7a3b25' }}>
                      The PDF reads as <strong>{p.detected_authors || 'unknown'} — “{p.detected_title}”</strong>, which
                      doesn&apos;t obviously match the submitted citation. Correct it below before ingesting, or reject.
                    </div>
                  )}
                  {!mismatch(p) && p.detected_title && (
                    <p className={styles.muted} style={{ marginTop: 8 }}>
                      Agent read: {p.detected_authors || '—'} — “{p.detected_title}” · {p.model_used || ''}
                    </p>
                  )}

                  <SummaryBody p={p} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 720, marginTop: 12 }}>
                    <input
                      className={styles.summaryArea}
                      style={{ minHeight: 0, height: 36 }}
                      value={cite[p.id]?.author ?? p.author}
                      onChange={e => setCite(prev => ({ ...prev, [p.id]: { author: e.target.value, work: prev[p.id]?.work ?? p.work } }))}
                      title="Author as it will appear in the corpus"
                    />
                    <input
                      className={styles.summaryArea}
                      style={{ minHeight: 0, height: 36 }}
                      value={cite[p.id]?.work ?? p.work}
                      onChange={e => setCite(prev => ({ ...prev, [p.id]: { author: prev[p.id]?.author ?? p.author, work: e.target.value } }))}
                      title="Title as it will appear in the corpus"
                    />
                  </div>

                  <div className={styles.sectionLabel} style={{ marginTop: 12 }}>Review notes</div>
                  <textarea
                    className={styles.summaryArea}
                    style={{ minHeight: 60 }}
                    placeholder="Optional review notes…"
                    value={notes[p.id] ?? p.review_notes ?? ''}
                    onChange={e => setNotes(prev => ({ ...prev, [p.id]: e.target.value }))}
                  />

                  <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 12, flexWrap: 'wrap' }}>
                    <button className={styles.scheduleBtn} disabled={busy === p.id} onClick={() => approveIngest(p)}>
                      {busy === p.id ? 'Working…' : '✓ Approve & ingest summary'}
                    </button>
                    <button className={styles.ghostBtn} disabled={busy === p.id} onClick={() => requeue(p)}>
                      ↺ Re-summarize
                    </button>
                    <button className={styles.ghostBtn} disabled={busy === p.id} onClick={() => reject(p)} style={{ color: '#B23535' }}>
                      ✕ Reject
                    </button>
                  </div>
                </>
              )}

              {p.status === 'failed' && (
                <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 10 }}>
                  <button className={styles.ghostBtn} disabled={busy === p.id} onClick={() => requeue(p)}>↺ Re-queue</button>
                  <button className={styles.ghostBtn} disabled={busy === p.id} onClick={() => reject(p)} style={{ color: '#B23535' }}>✕ Reject</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Settled: ingested & rejected ───────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Ledger ({settled.length})</span>
        </div>
        {settled.length === 0 ? (
          <p className={styles.muted}>No papers ingested or rejected yet.</p>
        ) : (
          settled.map(p => (
            <div key={p.id} className={styles.gapRow}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span className={`${styles.pill} ${STATUS_PILL[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                <strong>{p.author}</strong> — {p.work}
                {p.status === 'ingested' && (
                  <span className={styles.gapMeta}>
                    {(p.rag_chunk_ids || []).length} chunk{(p.rag_chunk_ids || []).length === 1 ? '' : 's'} · {fmtDate(p.ingested_at)}
                  </span>
                )}
              </div>
              {p.review_notes && <p className={styles.muted} style={{ marginTop: 6 }}>{p.review_notes}</p>}
              {p.status === 'ingested' && (
                <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 8 }}>
                  <button className={styles.ghostBtn} disabled={busy === p.id} onClick={() => deingest(p)} style={{ color: '#B23535' }}>
                    Remove from corpus
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
