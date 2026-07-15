'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from '../admin.module.css'
import type { ScribeProject, ScribeSource, ScribeFormat } from '@/lib/scribe/types'

type UnlinkedPaper = {
  id: string
  author: string
  work: string
  year: string | null
  venue: string | null
  status: string
}

const FORMAT_LABEL: Record<ScribeFormat, string> = {
  substack: 'Substack post',
  article: 'Article',
  paper: 'Research paper',
  social: 'Social posts',
}

const STATUS_PILL: Record<ScribeProject['status'], string> = {
  draft: styles.pillRunning,
  ready: styles.pillOk,
  published: styles.pillOk,
  archived: styles.pillFailed,
}

function authorsLine(s: ScribeSource): string {
  if (!s.authors?.length) return '—'
  return s.authors.map(a => (a.given ? `${a.given} ${a.family}` : a.family)).join(', ')
}

export default function ScribePage() {
  const [projects, setProjects] = useState<ScribeProject[]>([])
  const [sources, setSources] = useState<ScribeSource[]>([])
  const [unlinkedPapers, setUnlinkedPapers] = useState<UnlinkedPaper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  // New-project form
  const [pTitle, setPTitle] = useState('')
  const [pFormat, setPFormat] = useState<ScribeFormat>('substack')
  const [creating, setCreating] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/admin/scribe/projects', { cache: 'no-store' }),
        fetch('/api/admin/scribe/sources', { cache: 'no-store' }),
      ])
      const pJson = await pRes.json()
      const sJson = await sRes.json()
      if (!pRes.ok) throw new Error(pJson.error || 'Failed to load projects')
      if (!sRes.ok) throw new Error(sJson.error || 'Failed to load sources')
      setProjects(pJson.projects || [])
      setSources(sJson.sources || [])
      setUnlinkedPapers(sJson.unlinkedPapers || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createProject() {
    if (!pTitle.trim()) { showToast('Give the project a title'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/scribe/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pTitle, format: pFormat }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Create failed')
      setPTitle('')
      showToast('Project created')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Create failed')
    }
    setCreating(false)
  }

  async function importPaper(paperId: string) {
    setBusy(paperId)
    try {
      const res = await fetch('/api/admin/scribe/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper_submission_id: paperId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Import failed')
      showToast(`Imported as [${json.source.citation_key}]`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed')
    }
    setBusy(null)
  }

  async function makeQuotable(sourceId: string) {
    setBusy(sourceId)
    try {
      const res = await fetch(`/api/admin/scribe/sources/${sourceId}/quotable`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Ingestion failed')
      const r = json.report
      showToast(`Quotable: ${r.pages_parsed} pages → ${r.chunks_created} chunks${r.failed_pages.length ? ` (${r.failed_pages.length} pages failed)` : ''}`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ingestion failed')
    }
    setBusy(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Scribe</h1>
        <p className={styles.muted}>
          Rough thoughts in, publication-ready drafts out — every citation traced to a real chunk
          in the corpus. Drafts never publish themselves.
        </p>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* ── Projects ─────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h2 className={styles.cardTitle}>Projects</h2>
        </div>

        <div className={styles.fieldRow}>
          <input
            className={styles.textInput}
            placeholder="New project title…"
            value={pTitle}
            onChange={e => setPTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createProject()}
          />
          <select
            className={styles.textInput}
            value={pFormat}
            onChange={e => setPFormat(e.target.value as ScribeFormat)}
            style={{ maxWidth: 180 }}
          >
            {Object.entries(FORMAT_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button className={styles.primaryBtn} onClick={createProject} disabled={creating}>
            {creating ? 'Creating…' : 'New project'}
          </button>
        </div>

        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : projects.length === 0 ? (
          <p className={styles.muted}>No projects yet — start one above.</p>
        ) : (
          projects.map(p => (
            <div key={p.id} className={styles.rowItem}>
              <Link href={`/admin/scribe/${p.id}`} className={styles.viewLink}>
                {p.title}
              </Link>
              <span className={styles.muted}> · {FORMAT_LABEL[p.format]}</span>
              <span className={`${styles.pill} ${STATUS_PILL[p.status]}`}>{p.status}</span>
            </div>
          ))
        )}
      </div>

      {/* ── Source library ───────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h2 className={styles.cardTitle}>Source library</h2>
        </div>
        <p className={styles.muted}>
          Modern sources citable by Scribe. The Stoic primary corpus (rag_corpus) is always
          available and needs no registration here. “Quotable” extracts the PDF’s full text into
          private chunks so quotes can be verified verbatim — never published, never mixed into
          the counselors’ corpus.
        </p>

        {sources.length === 0 && !loading && (
          <p className={styles.muted}>No sources yet. Import an ingested paper below or add one via the Papers tab.</p>
        )}
        {sources.map(s => (
          <div key={s.id} className={styles.rowItem}>
            <span className={styles.chip}>[{s.citation_key}]</span>{' '}
            <strong>{s.title}</strong>
            <span className={styles.muted}> — {authorsLine(s)}{s.year ? `, ${s.year}` : ''}{s.venue ? ` · ${s.venue}` : ''}</span>{' '}
            {s.quotable ? (
              <span className={`${styles.pill} ${styles.pillOk}`}>
                quotable · {s.ingest_report?.chunks_created ?? '?'} chunks
              </span>
            ) : (
              <button
                className={styles.ghostBtn}
                onClick={() => makeQuotable(s.id)}
                disabled={busy === s.id || (!s.file_path && !s.paper_submission_id)}
                title={!s.file_path && !s.paper_submission_id ? 'No PDF on file for this source' : 'Extract full text for verbatim-quote verification'}
              >
                {busy === s.id ? 'Extracting…' : 'Make quotable'}
              </button>
            )}
          </div>
        ))}

        {unlinkedPapers.length > 0 && (
          <>
            <div className={styles.sectionLabel}>From the Papers pipeline</div>
            {unlinkedPapers.map(p => (
              <div key={p.id} className={styles.rowItem}>
                <strong>{p.work}</strong>
                <span className={styles.muted}> — {p.author}{p.year ? `, ${p.year}` : ''} · {p.status}</span>{' '}
                <button
                  className={styles.ghostBtn}
                  onClick={() => importPaper(p.id)}
                  disabled={busy === p.id}
                >
                  {busy === p.id ? 'Importing…' : 'Add to library'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
