'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../../admin.module.css'

type Passage = {
  id: string
  section_label: string | null
  mode: string
  words: number
  created_at: string
  editable: boolean
}
type Override = {
  title: string | null
  tradition: string | null
  era: string | null
  hidden: boolean
}
type Work = {
  author: string
  work: string
  textType: string
  chunks: number
  passages: Passage[]
  defaultTradition: string
  override: Override | null
}
type EditState = {
  id: string
  sourceText: string
  summaryText: string
  saving: boolean
  resummarizing: boolean
  error: string | null
}
type ShelfState = {
  title: string
  tradition: string
  hidden: boolean
  saving: boolean
  error: string | null
}

export default function ManageWorksPage() {
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  const [works, setWorks] = useState<Work[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [shelf, setShelf] = useState<ShelfState | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) setAuthorized(true)
      else router.push('/')
      setAuthLoading(false)
    })
  }, [router])

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch('/api/corpus-ingest/works', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load works')
      setWorks(data.works)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load works')
    }
  }, [])

  useEffect(() => {
    if (authorized) load()
  }, [authorized, load])

  const workKey = (w: Work) => `${w.author} — ${w.work}`

  // Expand a work and seed the shelf/title editor from its current override
  // (falling back to defaults). Collapsing clears both editors.
  function toggleWork(w: Work, k: string, open: boolean) {
    setEdit(null)
    if (open) { setExpanded(null); setShelf(null); return }
    setExpanded(k)
    setShelf({
      title: w.override?.title ?? '',
      tradition: w.override?.tradition ?? w.defaultTradition,
      hidden: w.override?.hidden ?? false,
      saving: false,
      error: null,
    })
  }

  async function saveShelf(w: Work) {
    if (!shelf) return
    setShelf({ ...shelf, saving: true, error: null })
    try {
      // Choosing the default shelf clears the tradition override so it tracks defaults.
      const tradition = shelf.tradition === w.defaultTradition ? '' : shelf.tradition
      const res = await fetch('/api/corpus-ingest/works/override', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: w.author, work: w.work, title: shelf.title, tradition, hidden: shelf.hidden }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setShelf(null); setExpanded(null)
      load()
    } catch (e) {
      setShelf(prev => prev && { ...prev, saving: false, error: e instanceof Error ? e.message : 'Save failed' })
    }
  }

  async function deleteWork(w: Work) {
    if (!confirm(`Permanently delete "${w.work}" by ${w.author}? This removes all ${w.chunks} chunks from the corpus (Reading Room AND Cabinet retrieval). This cannot be undone.`)) return
    try {
      const q = new URLSearchParams({ author: w.author, work: w.work })
      const res = await fetch(`/api/corpus-ingest/works?${q.toString()}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setExpanded(null); setShelf(null)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  async function openEditor(p: Passage) {
    setEdit({ id: p.id, sourceText: '', summaryText: '', saving: false, resummarizing: false, error: null })
    try {
      const res = await fetch(`/api/corpus-ingest/works/passage/${p.id}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load passage')
      setEdit({
        id: p.id,
        sourceText: data.passage.source_text || '',
        summaryText: data.passage.summary_text || '',
        saving: false,
        resummarizing: false,
        error: null,
      })
    } catch (e) {
      setEdit(prev => prev && { ...prev, error: e instanceof Error ? e.message : 'Failed to load passage' })
    }
  }

  async function saveEdit() {
    if (!edit) return
    setEdit({ ...edit, saving: true, error: null })
    try {
      const res = await fetch(`/api/corpus-ingest/works/passage/${edit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryText: edit.summaryText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setEdit(null)
      load()
    } catch (e) {
      setEdit(prev => prev && { ...prev, saving: false, error: e instanceof Error ? e.message : 'Save failed' })
    }
  }

  // Re-run the summarizer over the stored source, streaming into the textarea.
  async function resummarize(work: Work) {
    if (!edit) return
    setEdit({ ...edit, resummarizing: true, summaryText: '', error: null })
    try {
      const res = await fetch('/api/corpus-ingest/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: edit.sourceText, author: work.author, work: work.work }),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Summarization failed')
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setEdit(prev => prev && { ...prev, summaryText: acc })
      }
      setEdit(prev => prev && { ...prev, resummarizing: false })
    } catch (e) {
      setEdit(prev => prev && { ...prev, resummarizing: false, error: e instanceof Error ? e.message : 'Summarization failed' })
    }
  }

  async function deletePassage(p: Passage) {
    if (!confirm('Remove this passage from the corpus? Its chunks and stored source will be deleted.')) return
    try {
      const res = await fetch(`/api/corpus-ingest/works/passage/${p.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      if (edit?.id === p.id) setEdit(null)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  function addChapterHref(w: Work) {
    const q = new URLSearchParams({ author: w.author, work: w.work })
    return `/admin/corpus?${q.toString()}`
  }

  if (authLoading) return <div className={styles.page}><p className={styles.muted}>Checking access…</p></div>
  if (!authorized) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Manage works</h1>
        <p>Edit a passage&apos;s summary, append new chapters to a work, or remove passages from the corpus.</p>
        <p style={{ marginTop: 4 }}>
          <a href="/admin/corpus" className={styles.ghostBtn} style={{ display: 'inline-block' }}>← Back to ingestion</a>
        </p>
      </div>

      {loadError && <div className={styles.errorBanner}><strong>Couldn&apos;t load works</strong><div className={styles.resultLine}>{loadError}</div></div>}
      {!works && !loadError && <p className={styles.muted}>Loading works…</p>}
      {works && works.length === 0 && <p className={styles.muted}>No works in the corpus yet.</p>}

      {works && works.map(w => {
        const k = workKey(w)
        const open = expanded === k
        return (
          <div key={k} className={styles.card} style={{ marginBottom: 14 }}>
            <div className={styles.cardTitleRow}>
              <button
                className={styles.cardTitle}
                style={{ cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', padding: 0 }}
                onClick={() => toggleWork(w, k, open)}
              >
                {open ? '▾' : '▸'} {w.author} — <em>{w.override?.title || w.work}</em>
              </button>
              <span className={styles.muted}>
                {(w.override?.tradition || w.defaultTradition) === 'stoic' ? 'Stoic' : (w.override?.tradition || w.defaultTradition) === 'wider' ? 'Wider' : 'Synthesis'} shelf
                {w.override?.hidden ? ' · 🚫 hidden' : ''}
                {' · '}{w.chunks} chunks · {w.textType === 'summary' ? 'summary' : 'verbatim'}
                {w.passages.length > 0 ? ` · ${w.passages.length} passage${w.passages.length > 1 ? 's' : ''}` : ' · legacy'}
              </span>
            </div>

            {open && (
              <div style={{ marginTop: 10 }}>
                {/* Reading Room presentation: shelf, title, visibility */}
                {shelf && (
                  <div style={{ background: '#f7f7fb', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                    <div className={styles.sectionLabel} style={{ marginBottom: 8 }}>Reading Room</div>
                    {shelf.error && <div className={styles.errText} style={{ marginBottom: 8 }}>{shelf.error}</div>}
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Display title</label>
                      <input
                        className={styles.textInput}
                        value={shelf.title}
                        placeholder={w.work}
                        onChange={e => setShelf({ ...shelf, title: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                      <label className={styles.fieldLabel} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        Shelf
                        <select
                          className={styles.textInput}
                          style={{ width: 'auto' }}
                          value={shelf.tradition}
                          onChange={e => setShelf({ ...shelf, tradition: e.target.value })}
                        >
                          <option value="stoic">Stoic</option>
                          <option value="wider">Wider tradition</option>
                        </select>
                      </label>
                      <label className={styles.fieldLabel} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={shelf.hidden} onChange={e => setShelf({ ...shelf, hidden: e.target.checked })} />
                        Hide from Reading Room
                      </label>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <button className={styles.scheduleBtn} disabled={shelf.saving} onClick={() => saveShelf(w)}>
                        {shelf.saving ? 'Saving…' : 'Save Reading Room settings'}
                      </button>
                      <button
                        className={styles.ghostBtn}
                        style={{ color: '#B23535', borderColor: '#B23535' }}
                        onClick={() => deleteWork(w)}
                      >
                        Delete work permanently
                      </button>
                    </div>
                  </div>
                )}

                {w.passages.length === 0 && (
                  <p className={styles.muted} style={{ marginBottom: 10 }}>
                    Ingested before source tracking — no editable passages, but you can append chapters.
                  </p>
                )}

                {w.passages.map(p => (
                  <div key={p.id}>
                    <div className={styles.rowItem} style={{ alignItems: 'center' }}>
                      <span>
                        {p.section_label || <span className={styles.muted}>(no section label)</span>}
                        <span className={styles.muted}> · {p.mode} · {p.words} words · {new Date(p.created_at).toLocaleDateString()}</span>
                      </span>
                      <span className={styles.actions} style={{ display: 'flex', gap: 8 }}>
                        <button className={styles.ghostBtn} onClick={() => (edit?.id === p.id ? setEdit(null) : openEditor(p))}>
                          {edit?.id === p.id ? 'Close' : 'View / Edit'}
                        </button>
                        <button className={styles.ghostBtn} onClick={() => deletePassage(p)}>Delete</button>
                      </span>
                    </div>

                    {edit?.id === p.id && (
                      <div style={{ padding: '10px 0 16px' }}>
                        {edit.error && <div className={styles.errorBanner} style={{ marginBottom: 10 }}><div className={styles.resultLine}>{edit.error}</div></div>}
                        <div className={styles.fieldLabel}>Original source (read-only, never shown in the Reading Room)</div>
                        <textarea className={styles.summaryArea} value={edit.sourceText} readOnly placeholder="(no source stored for this passage)" style={{ minHeight: 120, opacity: 0.85 }} />
                        <div className={styles.fieldLabel} style={{ marginTop: 12 }}>Ingested summary (editable)</div>
                        <textarea
                          className={styles.summaryArea}
                          value={edit.summaryText}
                          readOnly={edit.saving || edit.resummarizing}
                          onChange={e => setEdit({ ...edit, summaryText: e.target.value })}
                          style={{ minHeight: 160 }}
                        />
                        <div className={styles.summaryFooter}>
                          <span className={styles.charCount}>{edit.summaryText.split(/\s+/).filter(Boolean).length} words</span>
                          {edit.resummarizing && <span className={styles.muted}>generating…</span>}
                        </div>
                        <div className={styles.actions} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button className={styles.ghostBtn} disabled={!edit.sourceText || edit.resummarizing || edit.saving} onClick={() => resummarize(w)}>
                            ✦ Re-summarize from source
                          </button>
                          <button className={styles.scheduleBtn} disabled={edit.saving || edit.resummarizing || edit.summaryText.trim().length < 50} onClick={saveEdit}>
                            {edit.saving ? 'Saving…' : '✓ Save (re-ingest)'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ marginTop: 12 }}>
                  <a href={addChapterHref(w)} className={styles.primaryBtn} style={{ display: 'inline-block', textDecoration: 'none' }}>
                    + Add chapter to this work
                  </a>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
