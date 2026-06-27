'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from '../admin.module.css'

type SynthDoc = {
  id: string
  title: string
  synthesis_type: 'cross_thinker' | 'concept_evolution' | 'practical'
  concept: string
  authors_covered: string[]
  works_covered: string[]
  content: string
  word_count: number | null
  user_theme_frequency: number | null
  demand_rank: number | null
  status: 'pending_review' | 'approved' | 'rejected' | 'ingested' | 'edited'
  review_notes: string | null
  reviewed_at: string | null
  ingested_at: string | null
  rag_chunk_ids: string[] | null
  generation_week: string | null
  created_at: string
  updated_at: string
}

type AgentConfig = {
  documents_per_week?: number
  min_user_frequency?: number
  target_word_count?: number
  synthesis_types?: string[]
  enabled?: boolean
}

const TYPE_LABEL: Record<string, string> = {
  cross_thinker: 'cross-thinker',
  concept_evolution: 'concept evolution',
  practical: 'practical',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function SynthesisPage() {
  const [docs, setDocs] = useState<SynthDoc[]>([])
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Per-document UI state.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [banners, setBanners] = useState<Record<string, string>>({})

  // Config form state.
  const [cfgDocs, setCfgDocs] = useState(5)
  const [cfgFreq, setCfgFreq] = useState(3)
  const [cfgEnabled, setCfgEnabled] = useState(true)
  const [savingCfg, setSavingCfg] = useState(false)

  // Archive collapse state.
  const [showIngested, setShowIngested] = useState(false)
  const [showRejected, setShowRejected] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/synthesis', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load synthesis documents')
      setDocs(json.documents || [])
      if (json.config) {
        setConfig(json.config)
        setCfgDocs(json.config.documents_per_week ?? 5)
        setCfgFreq(json.config.min_user_frequency ?? 3)
        setCfgEnabled(json.config.enabled ?? true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggleExpand(id: string, content: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        setEdits(e => (id in e ? e : { ...e, [id]: content }))
      }
      return next
    })
  }

  async function patchDoc(id: string, body: Record<string, unknown>): Promise<SynthDoc> {
    const res = await fetch(`/api/admin/synthesis/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Update failed')
    return json.document as SynthDoc
  }

  async function approveAndIngest(doc: SynthDoc) {
    setBusy(doc.id)
    setBanners(b => ({ ...b, [doc.id]: '' }))
    try {
      // 1. Approve (with any review notes).
      await patchDoc(doc.id, { status: 'approved', review_notes: notes[doc.id] ?? doc.review_notes ?? '' })
      // 2. Ingest into rag_corpus.
      const res = await fetch(`/api/admin/synthesis/${doc.id}/ingest`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Ingestion failed')
      setBanners(b => ({ ...b, [doc.id]: `Ingested — ${json.chunksCreated} chunks added to corpus` }))
      showToast('Approved & ingested')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to approve & ingest')
    }
    setBusy(null)
  }

  async function saveEdits(doc: SynthDoc) {
    setBusy(doc.id)
    try {
      await patchDoc(doc.id, { content: edits[doc.id] ?? doc.content, review_notes: notes[doc.id] ?? doc.review_notes ?? '' })
      showToast('Edits saved — document set to edited, re-approve when ready')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save edits')
    }
    setBusy(null)
  }

  async function reject(doc: SynthDoc) {
    setBusy(doc.id)
    try {
      await patchDoc(doc.id, { status: 'rejected', review_notes: notes[doc.id] ?? doc.review_notes ?? '' })
      showToast('Rejected')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to reject')
    }
    setBusy(null)
  }

  async function deingest(doc: SynthDoc) {
    if (!window.confirm(
      `Remove “${doc.title}” from the corpus?\n\nIts chunks are deleted and it returns to the review queue as “edited”, where you can revise and re-ingest it (replace) or reject it (remove for good). The Library and Observatory drop it immediately; nothing else breaks.`
    )) return
    setBusy(doc.id)
    try {
      const res = await fetch(`/api/admin/synthesis/${doc.id}/deingest`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove')
      showToast(`Removed from corpus — ${json.removed} chunks deleted; back in review`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove from corpus')
    }
    setBusy(null)
  }

  async function saveConfig() {
    if (!config) return
    setSavingCfg(true)
    try {
      const merged: AgentConfig = {
        ...config,
        documents_per_week: cfgDocs,
        min_user_frequency: cfgFreq,
        enabled: cfgEnabled,
      }
      const res = await fetch('/api/admin/agent-config/synthesis_agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: merged }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save config')
      setConfig(json.config)
      showToast('Config saved')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save config')
    }
    setSavingCfg(false)
  }

  const pending = docs.filter(d => d.status === 'pending_review' || d.status === 'edited')
  const ingested = docs.filter(d => d.status === 'ingested')
  const rejected = docs.filter(d => d.status === 'rejected')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Synthesis agent</h1>
        <p>Cross-source philosophical synthesis — review, edit, and approve documents for ingestion into the corpus.</p>
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && docs.length === 0 && <p className={styles.muted}>Loading synthesis documents…</p>}

      {/* ── Section 1: Pending review ──────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Pending review ({pending.length})</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={load}>↺ Refresh</button>
        </div>

        {pending.length === 0 ? (
          <p className={styles.muted}>
            Nothing awaiting review. The agent generates documents each Monday at 6:00 AM ET — or run{' '}
            <code>node server/synthesis-agent.js</code> manually.
          </p>
        ) : (
          pending.map(doc => {
            const isOpen = expanded.has(doc.id)
            const banner = banners[doc.id]
            return (
              <div key={doc.id} className={styles.gapRow}>
                <div className={styles.gapRowMain}>
                  <span className={`${styles.pill} ${doc.status === 'edited' ? styles.pillRunning : styles.pillFailed}`}>
                    {doc.status === 'edited' ? 'edited' : 'pending'}
                  </span>
                  <span className={styles.gapTitle}>{doc.title}</span>
                </div>
                <div className={styles.gapMeta}>
                  Type: {TYPE_LABEL[doc.synthesis_type]} · Concept: {doc.concept} · {doc.word_count ?? '—'} words
                  {doc.demand_rank ? ` · rank #${doc.demand_rank}` : ''}
                  {doc.user_theme_frequency ? ` · ${doc.user_theme_frequency} user sessions` : ''}
                  <br />
                  Authors: {(doc.authors_covered || []).join(', ') || '—'} · Generated {fmtDate(doc.created_at)}
                </div>

                {banner && <div className={styles.successBanner} style={{ marginBottom: 8 }}>{banner}</div>}

                <div className={styles.gapActions}>
                  <button
                    className={styles.ghostBtn}
                    style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                    onClick={() => toggleExpand(doc.id, doc.content)}
                  >
                    {isOpen ? 'Hide ↑' : 'Read & Review ↓'}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    <div className={styles.sectionLabel}>Document</div>
                    <textarea
                      className={styles.summaryArea}
                      value={edits[doc.id] ?? doc.content}
                      onChange={e => setEdits(prev => ({ ...prev, [doc.id]: e.target.value }))}
                    />
                    <div className={styles.summaryFooter}>
                      <span className={styles.muted}>
                        {(edits[doc.id] ?? doc.content).split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>

                    <div className={styles.sectionLabel} style={{ marginTop: 12 }}>Notes for this document</div>
                    <textarea
                      className={styles.summaryArea}
                      style={{ minHeight: 70 }}
                      placeholder="Optional review notes…"
                      value={notes[doc.id] ?? doc.review_notes ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [doc.id]: e.target.value }))}
                    />

                    <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 12, flexWrap: 'wrap' }}>
                      <button
                        className={styles.scheduleBtn}
                        disabled={busy === doc.id}
                        onClick={() => approveAndIngest(doc)}
                      >
                        {busy === doc.id ? 'Working…' : '✓ Approve & Queue for Ingestion'}
                      </button>
                      <button
                        className={styles.ghostBtn}
                        disabled={busy === doc.id}
                        onClick={() => saveEdits(doc)}
                      >
                        ✎ Save Edits
                      </button>
                      <button
                        className={styles.ghostBtn}
                        style={{ borderColor: '#B23535', color: '#B23535' }}
                        disabled={busy === doc.id}
                        onClick={() => reject(doc)}
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

      {/* ── Section 2: Agent config ────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Agent config</div>
        {!config ? (
          <p className={styles.muted}>Config unavailable.</p>
        ) : (
          <>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Documents per week</label>
                <input
                  className={styles.textInput}
                  type="number"
                  min={1}
                  max={20}
                  value={cfgDocs}
                  onChange={e => setCfgDocs(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Minimum user frequency</label>
                <input
                  className={styles.textInput}
                  type="number"
                  min={0}
                  value={cfgFreq}
                  onChange={e => setCfgFreq(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
            <label className={styles.modeOption} style={{ alignItems: 'center' }}>
              <input type="checkbox" checked={cfgEnabled} onChange={e => setCfgEnabled(e.target.checked)} />
              Enabled {cfgEnabled ? '' : '— agent will skip its next run'}
            </label>
            <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 8 }}>
              <button className={styles.primaryBtn} disabled={savingCfg} onClick={saveConfig}>
                {savingCfg ? 'Saving…' : 'Save Config'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Section 3: Ingested archive ────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Ingested synthesis ({ingested.length})</span>
          <button
            className={styles.ghostBtn}
            style={{ height: 30, padding: '0 12px', fontSize: 12 }}
            onClick={() => setShowIngested(s => !s)}
          >
            {showIngested ? 'Hide ↑' : 'Show ↓'}
          </button>
        </div>
        {showIngested && (
          ingested.length === 0 ? (
            <p className={styles.muted}>No synthesis documents ingested yet.</p>
          ) : (
            ingested.map(doc => {
              const isOpen = expanded.has(doc.id)
              return (
                <div key={doc.id} className={styles.gapRow}>
                  <div className={styles.gapRowMain}>
                    <span className={`${styles.pill} ${styles.pillOk}`}>in corpus</span>
                    <span className={styles.gapTitle}>{doc.title}</span>
                  </div>
                  <div className={styles.gapMeta}>
                    {doc.concept} · {(doc.rag_chunk_ids || []).length} chunks · ingested {fmtDate(doc.ingested_at)}
                  </div>
                  <div className={styles.gapActions}>
                    <button
                      className={styles.ghostBtn}
                      style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                      onClick={() => toggleExpand(doc.id, doc.content)}
                    >
                      {isOpen ? 'Hide ↑' : 'Read ↓'}
                    </button>
                    <button
                      className={styles.ghostBtn}
                      style={{ height: 30, padding: '0 12px', fontSize: 12, borderColor: '#B23535', color: '#B23535' }}
                      disabled={busy === doc.id}
                      onClick={() => deingest(doc)}
                    >
                      {busy === doc.id ? 'Working…' : '↩ Pull back to review'}
                    </button>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 12 }}>
                      <div className={styles.sectionLabel}>Document (read-only — pull back to edit)</div>
                      <textarea className={styles.summaryArea} readOnly value={doc.content} />
                    </div>
                  )}
                </div>
              )
            })
          )
        )}
      </div>

      {/* ── Rejected (collapsed, out of the way) ───────────────────── */}
      {rejected.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <span className={styles.cardTitle}>Rejected ({rejected.length})</span>
            <button
              className={styles.ghostBtn}
              style={{ height: 30, padding: '0 12px', fontSize: 12 }}
              onClick={() => setShowRejected(s => !s)}
            >
              {showRejected ? 'Hide ↑' : 'Show ↓'}
            </button>
          </div>
          {showRejected && rejected.map(doc => (
            <div key={doc.id} className={styles.rowItem}>
              <span>{doc.title}</span>
              <span className={styles.muted}>
                {doc.concept}{doc.review_notes ? ` · ${doc.review_notes}` : ''} · {fmtDate(doc.reviewed_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
