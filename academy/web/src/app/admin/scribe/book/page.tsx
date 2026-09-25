'use client'

// The books: a list, and a way to start one. A book is the container for a
// run of chapters, each of which is an ordinary Scribe chat entry. The work
// happens in the chat; this page and the book view keep the whole in view.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from '../../admin.module.css'

type BookListItem = {
  id: string
  title: string
  status: string
  summary: string | null
  chapter_count: number
  word_count: number
  updated_at: string
}

export default function ScribeBooksPage() {
  const [books, setBooks] = useState<BookListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/scribe/books', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load books')
      setBooks(json.books || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load books')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createBook() {
    if (!title.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/scribe/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not create the book')
      setTitle('')
      window.location.href = `/admin/scribe/book/${json.book.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the book')
    }
    setCreating(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Scribe Books</h1>
        <p className={styles.muted}>
          A book is a run of chapters, each its own Scribe conversation. Paste a whole draft, or a
          stream of consciousness, and Scribe splits or shapes it into chapters you then work on one
          at a time, with the rest of the book in view.
        </p>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h2 className={styles.cardTitle}>New book</h2>
        </div>
        <div className={styles.fieldRow}>
          <input
            className={styles.textInput}
            placeholder="Working title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createBook() }}
          />
          <button className={styles.primaryBtn} onClick={createBook} disabled={creating || !title.trim()}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h2 className={styles.cardTitle}>Books</h2>
        </div>
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : books.length === 0 ? (
          <p className={styles.muted}>No books yet. If the list stays empty after creating one, the book migration may not be applied.</p>
        ) : (
          books.map(b => (
            <div key={b.id} className={styles.rowItem}>
              <Link href={`/admin/scribe/book/${b.id}`} className={styles.viewLink}>{b.title}</Link>{' '}
              <span className={styles.chip}>{b.status}</span>{' '}
              <span className={styles.muted}>
                {b.chapter_count} chapter{b.chapter_count === 1 ? '' : 's'} · {b.word_count.toLocaleString()} words ·{' '}
                {new Date(b.updated_at).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
