'use client'

// The Log — a running commonplace book: journal entries, thoughts, essays,
// clippings. Everything is embedded on save, so related items surface over
// time, the whole log is semantically searchable, and any item can open a
// Scribe session — straight to a draft, or connections-first.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import admin from '../../admin.module.css'
import styles from './log.module.css'

type Kind = 'journal' | 'thought' | 'essay' | 'clipping'
type Item = {
  id: string
  kind: Kind
  title: string | null
  content: string
  source_url: string | null
  entry_date: string
  similarity?: number
}
type Related = { id: string; kind: Kind; title: string | null; content: string; entry_date: string; similarity: number }

const KINDS: { v: Kind; label: string }[] = [
  { v: 'journal', label: 'Journal' },
  { v: 'thought', label: 'Thought' },
  { v: 'essay', label: 'Essay' },
  { v: 'clipping', label: 'Clipping' },
]
const KIND_CLASS: Record<Kind, string> = {
  journal: styles.kJournal,
  thought: styles.kThought,
  essay: styles.kEssay,
  clipping: styles.kClipping,
}

// A route that dies before it can serialize (gateway timeout, crashed handler)
// sends back an empty or HTML body. Parsing that as JSON throws "Unexpected end
// of JSON input", which tells you nothing — so fall back to the status line.
async function readJson(res: Response, fallback: string) {
  const text = await res.text()
  if (!text) throw new Error(`${fallback} — server returned ${res.status} with an empty response`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${fallback} — server returned ${res.status} (${text.slice(0, 120)})`)
  }
}

const CONNECTIONS_INSTRUCTION =
  "Before drafting anything: search my log from several angles for entries that connect to this one. Lay out the threads you actually find, with dates — including where the log doesn't connect — and tell me which connection you'd develop into an essay and why."

export default function ScribeLogPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [semantic, setSemantic] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  // Add form
  const [kind, setKind] = useState<Kind>('journal')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [adding, setAdding] = useState(false)

  // Search + filter
  const [q, setQ] = useState('')
  const [filterKind, setFilterKind] = useState<Kind | null>(null)

  // Per-item expansion
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [relatedFor, setRelatedFor] = useState<string | null>(null)
  const [related, setRelated] = useState<Related[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const load = useCallback(async (search?: string, kindFilter?: Kind | null) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search?.trim()) params.set('q', search.trim())
      if (kindFilter) params.set('kind', kindFilter)
      const res = await fetch(`/api/admin/scribe/log?${params}`, { cache: 'no-store' })
      const json = await readJson(res, 'Failed to load the log')
      if (!res.ok) throw new Error(json.error || 'Failed to load the log')
      setItems(json.items || [])
      setSemantic(!!json.semantic)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the log')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addItem() {
    if (!content.trim()) { showToast('Write or paste the content first'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/admin/scribe/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          title,
          content,
          source_url: sourceUrl || null,
          entry_date: entryDate || undefined,
        }),
      })
      const json = await readJson(res, 'Add failed')
      if (!res.ok) throw new Error(json.error || 'Add failed')
      setTitle('')
      setContent('')
      setSourceUrl('')
      showToast('Added to the log')
      await load(q || undefined, filterKind)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Add failed')
    }
    setAdding(false)
  }

  async function loadRelated(id: string) {
    if (relatedFor === id) { setRelatedFor(null); setRelated([]); return }
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/scribe/log/${id}/related`, { cache: 'no-store' })
      const json = await readJson(res, 'Failed to load related items')
      if (!res.ok) throw new Error(json.error || 'Failed to load related items')
      setRelated(json.related || [])
      setRelatedFor(id)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load related items')
    }
    setBusy(null)
  }

  async function openInScribe(item: Item, withConnections: boolean) {
    setBusy(item.id)
    try {
      const res = await fetch('/api/admin/scribe/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title || item.content.slice(0, 60),
          raw_text: item.content,
          ...(withConnections ? { instruction: CONNECTIONS_INSTRUCTION } : {}),
        }),
      })
      const json = await readJson(res, 'Failed to open in Scribe')
      if (!res.ok) throw new Error(json.error || 'Failed to open in Scribe')
      router.push(`/admin/scribe/chat?entry=${json.entry.id}&run=1`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to open in Scribe')
      setBusy(null)
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/scribe/log/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText }),
      })
      const json = await readJson(res, 'Save failed')
      if (!res.ok) throw new Error(json.error || 'Save failed')
      setEditing(null)
      showToast('Saved and re-embedded')
      await load(q || undefined, filterKind)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed')
    }
    setBusy(null)
  }

  async function remove(id: string) {
    if (!confirm('Delete this item from the log?')) return
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/scribe/log/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await readJson(res, 'Delete failed')).error || 'Delete failed')
      showToast('Deleted')
      await load(q || undefined, filterKind)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed')
    }
    setBusy(null)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const needsUrl = kind === 'clipping' || kind === 'essay'

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1>The Log</h1>
        <p>
          A running commonplace book — journal entries, thoughts, essays, clippings. Everything is
          embedded on save; over time some entries relate to others, and Scribe can tease out the
          connections.
        </p>
      </div>

      {error && <div className={admin.errorBanner}>{error}</div>}
      {toast && <div className={admin.toast}>{toast}</div>}

      {/* ── Add ── */}
      <div className={admin.card}>
        <div className={styles.kindChips}>
          {KINDS.map(k => (
            <button
              key={k.v}
              className={`${styles.kindChip} ${kind === k.v ? styles.kindChipOn : ''}`}
              onClick={() => setKind(k.v)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className={styles.metaRow}>
          <input
            className={styles.titleInput}
            placeholder="Title (optional)…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
            title="When it was written (defaults to today)"
          />
          {needsUrl && (
            <input
              className={styles.titleInput}
              placeholder="Source URL (optional)…"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
            />
          )}
        </div>
        <textarea
          className={styles.contentInput}
          placeholder={
            kind === 'journal'
              ? 'Type the journal entry, verbatim…'
              : kind === 'clipping'
                ? 'Paste the thing you found interesting…'
                : 'Write it down…'
          }
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <button className={admin.primaryBtn} onClick={addItem} disabled={adding || !content.trim()}>
          {adding ? 'Adding…' : 'Add to the log'}
        </button>
      </div>

      {/* ── Search + filter ── */}
      <div className={admin.card}>
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            placeholder="Search the log by meaning — “character as moat”, “time and attention”…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(q, filterKind)}
          />
          <button className={admin.primaryBtn} onClick={() => load(q, filterKind)}>Search</button>
          {(q || semantic) && (
            <button className={admin.ghostBtn} onClick={() => { setQ(''); load(undefined, filterKind) }}>
              Clear
            </button>
          )}
        </div>
        <div className={styles.kindChips} style={{ marginTop: 8 }}>
          <button
            className={`${styles.kindChip} ${filterKind === null ? styles.kindChipOn : ''}`}
            onClick={() => { setFilterKind(null); load(q || undefined, null) }}
          >
            All
          </button>
          {KINDS.map(k => (
            <button
              key={k.v}
              className={`${styles.kindChip} ${filterKind === k.v ? styles.kindChipOn : ''}`}
              onClick={() => { setFilterKind(k.v); load(q || undefined, k.v) }}
            >
              {k.label}s
            </button>
          ))}
        </div>

        {loading ? (
          <p className={admin.muted}>Loading…</p>
        ) : items.length === 0 ? (
          <p className={admin.muted}>
            {semantic ? 'Nothing in the log matches that.' : 'The log is empty — add the first entry above.'}
          </p>
        ) : (
          items.map(item => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={`${styles.kindPill} ${KIND_CLASS[item.kind]}`}>{item.kind}</span>
                {item.title && <span className={styles.itemTitle}>{item.title}</span>}
                <span className={styles.itemDate}>{item.entry_date}</span>
                {semantic && item.similarity !== undefined && (
                  <span className={styles.simBadge}>{(item.similarity * 100).toFixed(0)}% match</span>
                )}
                {item.source_url && (
                  <a href={item.source_url} target="_blank" rel="noreferrer" className={styles.linkBtn}>
                    source ↗
                  </a>
                )}
              </div>

              {editing === item.id ? (
                <>
                  <textarea
                    className={styles.contentInput}
                    style={{ marginTop: 6 }}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                  />
                  <div className={styles.itemActions}>
                    <button className={styles.linkBtn} onClick={() => saveEdit(item.id)} disabled={busy === item.id}>
                      {busy === item.id ? 'Saving…' : 'Save'}
                    </button>
                    <button className={styles.linkBtn} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`${styles.itemBody} ${expanded.has(item.id) ? '' : styles.clamped}`}
                    onClick={() => toggleExpand(item.id)}
                    title={expanded.has(item.id) ? 'Collapse' : 'Expand'}
                  >
                    {item.content}
                  </div>
                  <div className={styles.itemActions}>
                    <button className={styles.linkBtn} onClick={() => loadRelated(item.id)} disabled={busy === item.id}>
                      {relatedFor === item.id ? 'Hide related' : 'Related'}
                    </button>
                    <button className={styles.linkBtn} onClick={() => openInScribe(item, false)} disabled={busy === item.id}>
                      Develop with Scribe
                    </button>
                    <button className={styles.linkBtn} onClick={() => openInScribe(item, true)} disabled={busy === item.id}>
                      Find connections
                    </button>
                    <button
                      className={styles.linkBtn}
                      onClick={() => { setEditing(item.id); setEditText(item.content) }}
                    >
                      Edit
                    </button>
                    <button
                      className={`${styles.linkBtn} ${styles.dangerBtn}`}
                      onClick={() => remove(item.id)}
                      disabled={busy === item.id}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}

              {relatedFor === item.id && (
                <div className={styles.related}>
                  {related.length === 0 && (
                    <p className={admin.muted}>Nothing else in the log relates yet.</p>
                  )}
                  {related.map(r => (
                    <div key={r.id} className={styles.relatedItem}>
                      <div className={styles.relatedHead}>
                        <span className={`${styles.kindPill} ${KIND_CLASS[r.kind]}`}>{r.kind}</span>
                        {r.title && <strong>{r.title}</strong>}
                        <span className={styles.itemDate}>{r.entry_date}</span>
                        <span className={styles.simBadge}>{(r.similarity * 100).toFixed(0)}%</span>
                      </div>
                      <div className={styles.relatedExcerpt}>
                        {r.content.length > 220 ? r.content.slice(0, 220) + '…' : r.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
