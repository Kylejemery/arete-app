'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from '../admin.module.css'
import { readCommentsSeenAt, writeCommentsSeenAt } from '@/lib/comments-seen'

// Moderation for reader comments on the Observatory journal. Every comment,
// newest first, with the piece it answers; Hide takes one off the site and
// Unhide puts it back. Nothing is deleted. Opening this tab marks comments as
// seen, which is what the Overview card's "new" count is measured from.

type Kind = 'tension' | 'inquiry' | 'dream' | 'convergence' | 'world'
type Comment = {
  id: string
  piece_kind: Kind
  piece_id: string
  parent_id: string | null
  user_id: string | null
  handle: string
  body: string
  removed_at: string | null
  hidden: boolean
  created_at: string
  is_corpus?: boolean
  sources?: { author: string; title?: string; work: string }[] | null
  piece_title: string | null
}
type Filter = 'all' | 'visible' | 'hidden' | 'removed'
type Counts = { all: number; hidden: number; removed: number }

const KIND_LABEL: Record<Kind, string> = {
  tension: 'Tension',
  inquiry: 'Inquiry',
  dream: 'Dream',
  convergence: 'Convergence',
  world: 'World',
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function AdminCommentsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [limit, setLimit] = useState(200)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  // When Kyle last looked, captured once on arrival so this visit's "new"
  // marks stay put while he works through them.
  const seenBefore = useRef<string | null>(null)

  const load = useCallback(async (f: Filter) => {
    setError('')
    try {
      const res = await fetch(`/api/admin/comments?filter=${f}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load comments')
      setComments(json.comments)
      setCounts(json.counts)
      setLimit(json.limit ?? 200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load comments')
      setComments([])
    }
  }, [])

  useEffect(() => {
    seenBefore.current = readCommentsSeenAt()
    writeCommentsSeenAt(new Date().toISOString())
  }, [])

  useEffect(() => { setComments(null); load(filter) }, [filter, load])

  const setHidden = async (c: Comment, hidden: boolean) => {
    setBusy(c.id); setError('')
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, hidden }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update')
      setComments(list => (list || []).map(x => (x.id === c.id ? { ...x, hidden } : x)))
      setCounts(n => (n ? { ...n, hidden: n.hidden + (hidden ? 1 : -1) } : n))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    }
    setBusy(null)
  }

  const isNew = (c: Comment) => !!seenBefore.current && c.created_at > seenBefore.current
  const visibleCount = counts ? counts.all - counts.hidden - counts.removed : null

  const tabs: { key: Filter; label: string; n: number | null }[] = [
    { key: 'all', label: 'All', n: counts?.all ?? null },
    { key: 'visible', label: 'On the site', n: visibleCount },
    { key: 'hidden', label: 'Hidden', n: counts?.hidden ?? null },
    { key: 'removed', label: 'Removed by author', n: counts?.removed ?? null },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Comments</h1>
        <p>
          Reader comments on the Observatory journal, newest first. Hide takes a comment off the site and
          Unhide puts it back; nothing is deleted. Replies to a hidden comment stay up, under a marker that says it was hidden.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={styles.ghostBtn}
            onClick={() => setFilter(t.key)}
            style={filter === t.key ? { borderColor: '#c9a84c', color: '#c9a84c' } : undefined}
          >
            {t.label}{t.n != null ? ` · ${t.n}` : ''}
          </button>
        ))}
        <button className={styles.ghostBtn} onClick={() => load(filter)} style={{ marginLeft: 'auto' }}>↺ Refresh</button>
      </div>

      {error && (
        <div className={styles.card}><p className={styles.errText}>{error}</p></div>
      )}

      {comments === null && <p className={styles.muted}>Loading comments…</p>}

      {comments !== null && comments.length === 0 && !error && (
        <div className={styles.card}>
          <p className={styles.muted} style={{ fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
            {filter === 'all' ? 'No one has commented yet.' : 'Nothing here.'}
          </p>
        </div>
      )}

      {comments && comments.map(c => {
        const href = `/observatory/${c.piece_kind}/${c.piece_id}#comments`
        return (
          <div key={c.id} className={styles.card} style={{ marginBottom: 12, opacity: c.hidden ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <strong>{c.handle}</strong>
              <span className={styles.muted}>{fmtDateTime(c.created_at)}</span>
              {c.parent_id && <span className={styles.muted}>· reply</span>}
              {c.is_corpus && <span className={styles.pill} style={{ background: '#F4ECD4', color: '#7A5C14' }}>Corpus reply</span>}
              {isNew(c) && <span className={styles.pill} style={{ background: '#FFF4DB', color: '#92600A' }}>New</span>}
              {c.hidden && <span className={styles.pill} style={{ background: '#FBE3E3', color: '#B23535' }}>Hidden</span>}
              {c.removed_at && <span className={styles.pill} style={{ background: '#EDEDED', color: '#444' }}>Removed by author</span>}
            </div>

            {c.removed_at
              ? <p className={styles.muted} style={{ fontStyle: 'italic', margin: '0 0 10px' }}>The author removed this comment; its text is gone.</p>
              : <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 14, lineHeight: 1.6, margin: '0 0 10px' }}>{c.body}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={styles.muted}>
                On {KIND_LABEL[c.piece_kind] ?? c.piece_kind}:{' '}
                {c.piece_title
                  ? <Link href={href} target="_blank">{c.piece_title}</Link>
                  : <em>a piece that is no longer published</em>}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {c.hidden
                  ? <button className={styles.ghostBtn} disabled={busy === c.id} onClick={() => setHidden(c, false)}>Unhide</button>
                  : <button className={styles.ghostBtn} disabled={busy === c.id || !!c.removed_at} onClick={() => setHidden(c, true)}>Hide</button>}
              </span>
            </div>
          </div>
        )
      })}

      {comments && comments.length >= limit && (
        <p className={styles.muted}>Showing the newest {limit}. Older comments are in the observatory_comments table.</p>
      )}
    </div>
  )
}
