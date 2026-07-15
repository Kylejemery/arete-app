'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../../admin.module.css'
import type { ScribeProject, ScribeNote, ScribeFormat } from '@/lib/scribe/types'

type DraftMeta = {
  id: string
  version: number
  format: ScribeFormat
  created_at: string
  verification: unknown | null
}

const FORMAT_LABEL: Record<ScribeFormat, string> = {
  substack: 'Substack post',
  article: 'Article',
  paper: 'Research paper',
  social: 'Social posts',
}

export default function ScribeProjectPage() {
  const params = useParams<{ id: string }>()
  const projectId = params.id

  const [project, setProject] = useState<ScribeProject | null>(null)
  const [notes, setNotes] = useState<ScribeNote[]>([])
  const [drafts, setDrafts] = useState<DraftMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [busyNote, setBusyNote] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/scribe/projects/${projectId}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load project')
      setProject(json.project)
      setNotes(json.notes || [])
      setDrafts(json.drafts || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function addNote() {
    if (!newNote.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/admin/scribe/projects/${projectId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add note')
      setNewNote('')
      setNotes(prev => [...prev, json.note])
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add note')
    }
    setAdding(false)
  }

  async function deleteNote(noteId: string) {
    setBusyNote(noteId)
    try {
      const res = await fetch(`/api/admin/scribe/notes/${noteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Delete failed')
      }
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed')
    }
    setBusyNote(null)
  }

  async function moveNote(noteId: string, dir: -1 | 1) {
    const idx = notes.findIndex(n => n.id === noteId)
    const swapWith = notes[idx + dir]
    if (!swapWith) return
    const a = notes[idx]
    setBusyNote(noteId)
    try {
      await Promise.all([
        fetch(`/api/admin/scribe/notes/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: swapWith.position }),
        }),
        fetch(`/api/admin/scribe/notes/${swapWith.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: a.position }),
        }),
      ])
      await load()
    } catch {
      showToast('Reorder failed')
    }
    setBusyNote(null)
  }

  async function setFormat(format: ScribeFormat) {
    if (!project) return
    setProject({ ...project, format })
    await fetch(`/api/admin/scribe/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    })
  }

  if (loading) {
    return <div className={styles.page}><p className={styles.muted}>Loading…</p></div>
  }
  if (error || !project) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>{error || 'Project not found'}</div>
        <Link href="/admin/scribe" className={styles.viewLink}>← Back to Scribe</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/scribe" className={styles.viewLink}>← Scribe</Link>
        <h1>{project.title}</h1>
        <p className={styles.muted}>
          Status: {project.status} · {notes.length} note{notes.length === 1 ? '' : 's'} ·{' '}
          {drafts.length} draft{drafts.length === 1 ? '' : 's'}
        </p>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}

      {/* ── Workflow bar ─────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Format</span>
          <select
            className={styles.textInput}
            value={project.format}
            onChange={e => setFormat(e.target.value as ScribeFormat)}
            style={{ maxWidth: 200 }}
          >
            {Object.entries(FORMAT_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button className={styles.primaryBtn} disabled title="Coming next: Stage A — distill the notes into an editable brief">
            Distill
          </button>
          <button className={styles.ghostBtn} disabled title="Coming next: Stage C — generate a cited draft">
            Draft
          </button>
          <span className={styles.muted}>Pipeline lands in the next build step — notes and sources are live now.</span>
        </div>
      </div>

      {/* ── Notes pane ───────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h2 className={styles.cardTitle}>Notes</h2>
        </div>
        <p className={styles.muted}>
          Scattered thoughts, fragments, full paragraphs — in whatever order they arrive.
          Your phrasing is drafting material: Scribe reuses it where it can.
        </p>

        <textarea
          className={styles.bigTextarea}
          placeholder="Add a thought…"
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          rows={3}
        />
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={addNote} disabled={adding || !newNote.trim()}>
            {adding ? 'Adding…' : 'Add note'}
          </button>
        </div>

        {notes.length === 0 ? (
          <p className={styles.muted}>No notes yet.</p>
        ) : (
          notes.map((n, i) => (
            <div key={n.id} className={styles.rowItem}>
              <span className={styles.muted}>{i + 1}.</span>{' '}
              <span style={{ whiteSpace: 'pre-wrap' }}>{n.content}</span>
              <span style={{ marginLeft: 8 }}>
                <button className={styles.iconBtn} onClick={() => moveNote(n.id, -1)} disabled={i === 0 || busyNote === n.id} title="Move up">↑</button>
                <button className={styles.iconBtn} onClick={() => moveNote(n.id, 1)} disabled={i === notes.length - 1 || busyNote === n.id} title="Move down">↓</button>
                <button className={styles.iconBtn} onClick={() => deleteNote(n.id)} disabled={busyNote === n.id} title="Delete">✕</button>
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── Drafts (versions) ────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h2 className={styles.cardTitle}>Drafts</h2>
        </div>
        {drafts.length === 0 ? (
          <p className={styles.muted}>No drafts yet — the Draft stage arrives in the next build step.</p>
        ) : (
          drafts.map(d => (
            <div key={d.id} className={styles.rowItem}>
              v{d.version} · {FORMAT_LABEL[d.format]} ·{' '}
              <span className={styles.muted}>{new Date(d.created_at).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
