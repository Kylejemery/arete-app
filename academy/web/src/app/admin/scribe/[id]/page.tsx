'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../../admin.module.css'
import type {
  ScribeProject,
  ScribeNote,
  ScribeFormat,
  ScribeBrief,
  ScribeDraft,
} from '@/lib/scribe/types'

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

  // Brief (Stage A) — held as editable local state.
  const [brief, setBrief] = useState<ScribeBrief | null>(null)
  const [claimsText, setClaimsText] = useState('')
  const [distilling, setDistilling] = useState(false)

  // Draft (Stages B+C)
  const [drafting, setDrafting] = useState(false)
  const [viewDraft, setViewDraft] = useState<ScribeDraft | null>(null)

  // Verification (Stage D) + chunk reveal cards
  const [verifying, setVerifying] = useState(false)
  const [openChunk, setOpenChunk] = useState<number | null>(null)
  const [chunkCache, setChunkCache] = useState<Record<string, { content: string; source: string }>>({})

  // Regeneration + scheduler handoff
  const [feedback, setFeedback] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [queueing, setQueueing] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 5000)
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
      if (json.project.brief) {
        setBrief(json.project.brief)
        setClaimsText((json.project.brief.key_claims || []).join('\n'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  // ── Notes ──────────────────────────────────────────────────────
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
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
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

  // ── Pipeline ───────────────────────────────────────────────────
  async function runDistill() {
    setDistilling(true)
    try {
      const res = await fetch(`/api/admin/scribe/projects/${projectId}/distill`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Distill failed')
      setBrief(json.brief)
      setClaimsText((json.brief.key_claims || []).join('\n'))
      showToast('Brief ready — edit it, then Draft')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Distill failed')
    }
    setDistilling(false)
  }

  async function runDraft(withFeedback = false) {
    setDrafting(true)
    try {
      const editedBrief = brief
        ? { ...brief, key_claims: claimsText.split('\n').map(s => s.trim()).filter(Boolean) }
        : undefined
      const payload: Record<string, unknown> = {}
      if (editedBrief) payload.brief = editedBrief
      if (withFeedback && feedback.trim()) payload.feedback = feedback.trim()
      const res = await fetch(`/api/admin/scribe/projects/${projectId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Draft failed')
      setViewDraft(json.draft)
      if (withFeedback) setFeedback('')
      showToast(`Draft v${json.draft.version} generated — ${json.draft.citations.length} citations`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Draft failed')
    }
    setDrafting(false)
  }

  function downloadDraft() {
    if (!viewDraft || !project) return
    const blob = new Blob([viewDraft.content], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v${viewDraft.version}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function sendToScheduler() {
    if (!viewDraft || !scheduleAt) { showToast('Pick a schedule time first'); return }
    setQueueing(true)
    try {
      const res = await fetch(`/api/admin/scribe/drafts/${viewDraft.id}/to-scheduler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: new Date(scheduleAt).toISOString() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Handoff failed')
      showToast(`${json.queued} post(s) queued for ${new Date(json.scheduled_at).toLocaleString()}${json.errors?.length ? ` — ${json.errors.length} failed` : ''}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Handoff failed')
    }
    setQueueing(false)
  }

  function draftCost(d: ScribeDraft): string | null {
    if (!d.token_usage) return null
    const parts = Object.entries(d.token_usage).map(
      ([stage, u]) => `${stage} ${u.input.toLocaleString()}→${u.output.toLocaleString()}`
    )
    return parts.length ? `tokens: ${parts.join(' · ')}` : null
  }

  async function openDraft(draftId: string) {
    try {
      const res = await fetch(`/api/admin/scribe/drafts/${draftId}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load draft')
      setViewDraft(json.draft)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load draft')
    }
  }

  function copyDraft() {
    if (!viewDraft) return
    navigator.clipboard.writeText(viewDraft.content)
    showToast('Markdown copied — paste into Substack')
  }

  async function runVerify() {
    if (!viewDraft) return
    setVerifying(true)
    try {
      const res = await fetch(`/api/admin/scribe/drafts/${viewDraft.id}/verify`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Verification failed')
      setViewDraft({ ...viewDraft, verification: json.verification })
      showToast(json.passes ? 'Verification passed — eligible for Ready' : 'Verification found issues — see the panel')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Verification failed')
    }
    setVerifying(false)
  }

  async function toggleChunk(i: number) {
    if (openChunk === i) { setOpenChunk(null); return }
    setOpenChunk(i)
    const c = viewDraft?.citations[i]
    if (!c) return
    const key = `${c.chunk_table}:${c.chunk_id}`
    if (chunkCache[key]) return
    try {
      const res = await fetch(`/api/admin/scribe/chunks?table=${c.chunk_table}&id=${c.chunk_id}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setChunkCache(prev => ({ ...prev, [key]: json.chunk }))
    } catch { /* card shows loading state */ }
  }

  async function markReady() {
    if (!project) return
    await fetch(`/api/admin/scribe/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ready' }),
    })
    setProject({ ...project, status: 'ready' })
    showToast('Marked ready')
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
          <button
            className={styles.ghostBtn}
            onClick={runDistill}
            disabled={distilling || drafting || notes.length === 0}
            title="Stage A: distill the notes into an editable brief"
          >
            {distilling ? 'Distilling…' : 'Distill'}
          </button>
          <button
            className={styles.primaryBtn}
            onClick={() => runDraft(false)}
            disabled={drafting || distilling || notes.length === 0}
            title={brief ? 'Draft from the brief below' : 'Just write it — distills silently, then drafts'}
          >
            {drafting ? 'Drafting… (this takes a minute)' : brief ? 'Draft' : 'Just write it'}
          </button>
        </div>
      </div>

      {/* ── Brief (Stage A output, editable) ─────────────────────── */}
      {brief && (
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h2 className={styles.cardTitle}>The brief</h2>
          </div>
          <p className={styles.muted}>Edit anything — the draft is built from this, not from thin air.</p>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Thesis</span>
            <textarea
              className={styles.bigTextarea}
              rows={2}
              value={brief.thesis}
              onChange={e => setBrief({ ...brief, thesis: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Key claims (one per line — each gets its own retrieval pass)</span>
            <textarea
              className={styles.bigTextarea}
              rows={Math.max(4, claimsText.split('\n').length)}
              value={claimsText}
              onChange={e => setClaimsText(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Audience</span>
            <input
              className={styles.textInput}
              value={brief.audience}
              onChange={e => setBrief({ ...brief, audience: e.target.value })}
            />
          </div>
          {brief.gaps.length > 0 && (
            <p className={styles.muted}>
              <strong>Gaps the notes don’t support yet:</strong> {brief.gaps.join(' · ')} — these
              will be written in your voice, uncited.
            </p>
          )}
        </div>
      )}

      {/* ── Draft viewer ─────────────────────────────────────────── */}
      {viewDraft && (
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h2 className={styles.cardTitle}>
              Draft v{viewDraft.version} · {FORMAT_LABEL[viewDraft.format]}
            </h2>
            <span>
              <button className={styles.ghostBtn} onClick={copyDraft}>Copy markdown</button>{' '}
              <button className={styles.ghostBtn} onClick={downloadDraft}>Download .md</button>{' '}
              <button className={styles.ghostBtn} onClick={runVerify} disabled={verifying}>
                {verifying ? 'Verifying…' : 'Verify citations'}
              </button>{' '}
              <button
                className={styles.primaryBtn}
                onClick={markReady}
                disabled={!viewDraft.verification || project.status === 'ready'}
                title={!viewDraft.verification ? 'Run verification first' : 'Mark this project ready'}
              >
                Mark ready
              </button>
            </span>
          </div>
          {viewDraft.model_notes && (
            <p className={styles.muted} style={{ whiteSpace: 'pre-wrap' }}>{viewDraft.model_notes}</p>
          )}
          {draftCost(viewDraft) && <p className={styles.muted}>{draftCost(viewDraft)}</p>}

          {viewDraft.meta?.subject_lines && viewDraft.meta.subject_lines.length > 0 && (
            <p className={styles.muted}>
              <strong>{viewDraft.format === 'article' ? 'Titles' : 'Subject lines'}:</strong>{' '}
              {viewDraft.meta.subject_lines.join(' · ')}
              {viewDraft.meta.preview_text && <> — <em>{viewDraft.meta.preview_text}</em></>}
            </p>
          )}
          {viewDraft.meta?.pull_quotes && viewDraft.meta.pull_quotes.length > 0 && (
            <p className={styles.muted}>
              <strong>Pull quotes:</strong> {viewDraft.meta.pull_quotes.map(q => `“${q}”`).join(' · ')}
            </p>
          )}

          <div className={styles.summaryArea} style={{ whiteSpace: 'pre-wrap' }}>
            {viewDraft.content}
          </div>

          {/* Regenerate with feedback — back to Stage C with the prior draft */}
          <div className={styles.fieldRow}>
            <input
              className={styles.textInput}
              placeholder="Feedback for regeneration — e.g. “shorter, punchier, drop section 3”"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            />
            <button
              className={styles.ghostBtn}
              onClick={() => runDraft(true)}
              disabled={drafting || !feedback.trim()}
            >
              {drafting ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>

          {/* Scheduler handoff — social drafts only, always user-scheduled */}
          {viewDraft.format === 'social' && (viewDraft.meta?.posts?.length ?? 0) > 0 && (
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>
                Send {viewDraft.meta!.posts!.length} post(s) to the scheduler at
              </span>
              <input
                type="datetime-local"
                className={styles.textInput}
                value={scheduleAt}
                onChange={e => setScheduleAt(e.target.value)}
                style={{ maxWidth: 220 }}
              />
              <button className={styles.primaryBtn} onClick={sendToScheduler} disabled={queueing || !scheduleAt}>
                {queueing ? 'Queueing…' : 'Send to scheduler'}
              </button>
            </div>
          )}
          <div className={styles.sectionLabel}>
            Citations ({viewDraft.citations.length})
            {viewDraft.verification && ` — checked ${new Date(viewDraft.verification.checked_at).toLocaleString()}`}
          </div>
          {viewDraft.citations.map((c, i) => {
            const v = viewDraft.verification?.results[i]
            const key = `${c.chunk_table}:${c.chunk_id}`
            const status = !v
              ? '·'
              : !v.chunk_resolves || v.quote_match === false || v.locator === 'mismatch' || v.support === 'not'
                ? '✗'
                : v.locator === 'unverified' && c.locator
                  ? '⚠'
                  : v.support === 'partial'
                    ? '⚠'
                    : '✓'
            return (
              <div key={i} className={styles.rowItem}>
                <span title={v?.note ?? ''}>{status}</span>{' '}
                <span className={styles.chip}>{c.chunk_table === 'rag_corpus' ? 'corpus' : 'paper'}</span>{' '}
                <button className={styles.viewLink} onClick={() => toggleChunk(i)} title="Show the underlying source chunk">
                  {c.marker.slice(0, 90)}
                </button>
                {c.locator && <span> · {c.locator}</span>}
                {c.quote && <span className={styles.chip}> quote</span>}
                {v?.note && <div className={styles.muted} style={{ marginLeft: 24 }}>{v.note}</div>}
                {openChunk === i && (
                  <div className={styles.summaryArea} style={{ marginLeft: 24, whiteSpace: 'pre-wrap' }}>
                    {chunkCache[key]
                      ? <><strong>{chunkCache[key].source}</strong>{'\n'}{chunkCache[key].content}</>
                      : 'Loading chunk…'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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
          <p className={styles.muted}>No drafts yet.</p>
        ) : (
          drafts.map(d => (
            <div key={d.id} className={styles.rowItem}>
              <button className={styles.viewLink} onClick={() => openDraft(d.id)}>
                v{d.version} · {FORMAT_LABEL[d.format]}
              </button>{' '}
              <span className={styles.muted}>{new Date(d.created_at).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
