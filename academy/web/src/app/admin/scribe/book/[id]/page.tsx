'use client'

// One book: the outline (the chapter picker), the import box that splits or
// shapes a pasted draft into chapters, the rolling summary and argument card,
// the book level commands, and every finding across the chapters. A chapter
// opens in the chat, which is where the writing happens.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import admin from '../../../admin.module.css'
import styles from '../book.module.css'
import type { Finding } from '../../chat/types'

type Book = {
  id: string
  title: string
  status: 'drafting' | 'revising' | 'settled' | 'archived'
  summary: string | null
  summary_updated_at: string | null
  argument: { thesis?: string; through_line?: string; open_questions?: string[] } | null
}

type Chapter = {
  id: string
  entry_id: string
  position: number
  title: string
  status: 'raw' | 'working' | 'settled' | 'archived'
  summary: string | null
  summary_by_hand: boolean
  argument: { thesis?: string; claims?: string[]; depends_on?: string[]; open_questions?: string[] } | null
  word_count: number
  indexed_hash: string | null
}

type PreviewChapter = { title: string; text: string; words: number }
type Strategy = 'shape' | 'auto' | 'headings' | 'markers' | 'size'
type Proposal = {
  form: string
  title: string | null
  note: string
  parts: { title: string; thesis: string; lacks: string; paragraphs: number[] }[]
}

const STRATEGY_LABEL: Record<Strategy, string> = {
  shape: 'Let Scribe shape it (stream of consciousness)',
  auto: 'Split automatically (headings, then markers, then size)',
  headings: 'Split at markdown headings',
  markers: 'Split at chapter markers',
  size: 'Split into sections of about 3,000 words',
}

function statusClass(s: string): string {
  return s === 'raw' ? styles.statusRaw : s === 'working' ? styles.statusWorking : s === 'settled' ? styles.statusSettled : ''
}

function wordsOf(text: string): number {
  return (text.match(/[^\s]+/g) ?? []).length
}

export default function ScribeBookPage() {
  const params = useParams<{ id: string }>()
  const bookId = params.id

  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Import
  const [pasted, setPasted] = useState('')
  const [strategy, setStrategy] = useState<Strategy>('shape')
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<PreviewChapter[] | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [usedStrategy, setUsedStrategy] = useState<string>('')
  const [committing, setCommitting] = useState(false)

  // Summary and commands
  const [summaryDraft, setSummaryDraft] = useState('')
  const [savingSummary, setSavingSummary] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [progress, setProgress] = useState('')
  const [runningGaps, setRunningGaps] = useState(false)
  const [gapCommentary, setGapCommentary] = useState('')
  const [checkingFacts, setCheckingFacts] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [addingChapter, setAddingChapter] = useState(false)
  const [showResolved, setShowResolved] = useState(false)
  const cancelRef = useRef(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 5000)
  }

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch(`/api/admin/scribe/books/${bookId}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load the book')
      setBook(json.book)
      setChapters(json.chapters || [])
      setFindings(json.findings || [])
      setSummaryDraft(json.book.summary ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the book')
    }
    setLoading(false)
  }, [bookId])

  useEffect(() => { load() }, [load])

  // ── Import ─────────────────────────────────────────────────────────────
  async function runPreview() {
    if (!pasted.trim()) { showToast('Paste the draft first'); return }
    setPreviewing(true)
    setPreview(null)
    setProposal(null)
    setError('')
    try {
      const res = await fetch(`/api/admin/scribe/books/${bookId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasted, strategy }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Preview failed')
      setPreview(json.preview.chapters)
      setUsedStrategy(json.preview.strategy)
      setProposal(json.proposal ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed')
    }
    setPreviewing(false)
  }

  function updatePreview(i: number, patch: Partial<PreviewChapter>) {
    setPreview(prev => prev ? prev.map((c, j) => (j === i ? { ...c, ...patch, words: patch.text !== undefined ? wordsOf(patch.text) : c.words } : c)) : prev)
  }

  function movePreview(i: number, dir: -1 | 1) {
    setPreview(prev => {
      if (!prev) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function mergePreview(i: number) {
    setPreview(prev => {
      if (!prev || i === 0) return prev
      const next = [...prev]
      const text = `${next[i - 1].text}\n\n${next[i].text}`
      next[i - 1] = { ...next[i - 1], text, words: wordsOf(text) }
      next.splice(i, 1)
      return next
    })
  }

  function dropPreview(i: number) {
    setPreview(prev => (prev ? prev.filter((_, j) => j !== i) : prev))
  }

  async function commitPreview() {
    if (!preview?.length) return
    setCommitting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/scribe/books/${bookId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: preview.map(c => ({ title: c.title, text: c.text })) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Import failed')
      showToast(`${json.chapters.length} chapter${json.chapters.length === 1 ? '' : 's'} added. Summaries build next.`)
      setPreview(null)
      setProposal(null)
      setPasted('')
      await load()
      await refreshAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    }
    setCommitting(false)
  }

  // ── Outline ────────────────────────────────────────────────────────────
  async function moveChapter(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= chapters.length) return
    const order = chapters.map(c => c.id)
    ;[order[i], order[j]] = [order[j], order[i]]
    setChapters(prev => {
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next.map((c, k) => ({ ...c, position: k + 1 }))
    })
    const res = await fetch(`/api/admin/scribe/books/${bookId}/chapters`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    })
    if (!res.ok) { showToast('Reorder failed'); await load() }
  }

  async function patchChapter(chapterId: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/scribe/books/${bookId}/chapters/${chapterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast((await res.json()).error || 'Update failed')
    await load()
  }

  async function addChapter() {
    if (!newChapterTitle.trim()) return
    setAddingChapter(true)
    try {
      const res = await fetch(`/api/admin/scribe/books/${bookId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChapterTitle }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not add the chapter')
      setNewChapterTitle('')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not add the chapter')
    }
    setAddingChapter(false)
  }

  // ── Summary, refresh, commands ─────────────────────────────────────────
  async function saveBook(patch: Record<string, unknown>) {
    setSavingSummary(true)
    const res = await fetch(`/api/admin/scribe/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) showToast((await res.json()).error || 'Save failed')
    else showToast('Saved')
    setSavingSummary(false)
    await load()
  }

  // Refresh runs a few chapters per call until nothing is stale.
  async function refreshAll() {
    setRefreshing(true)
    cancelRef.current = false
    setProgress('Bringing the index and summaries up to date…')
    try {
      for (let i = 0; i < 100; i++) {
        if (cancelRef.current) break
        const res = await fetch(`/api/admin/scribe/books/${bookId}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 3 }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Refresh failed')
        setProgress(json.remaining ? `${json.remaining} chapter${json.remaining === 1 ? '' : 's'} still to summarise…` : 'Book summary rebuilt.')
        await load()
        if (!json.remaining) break
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Refresh failed')
    }
    setRefreshing(false)
    setTimeout(() => setProgress(''), 4000)
  }

  async function runBookGaps() {
    setRunningGaps(true)
    setGapCommentary('')
    setError('')
    try {
      const res = await fetch(`/api/admin/scribe/books/${bookId}/gaps`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gap analysis failed')
      setGapCommentary(json.commentary ?? '')
      showToast(`${json.findings.length} cross chapter finding${json.findings.length === 1 ? '' : 's'}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gap analysis failed')
    }
    setRunningGaps(false)
  }

  async function factCheckAll() {
    setCheckingFacts(true)
    cancelRef.current = false
    let total = 0
    try {
      for (let i = 0; i < chapters.length; i++) {
        if (cancelRef.current) break
        const c = chapters[i]
        setProgress(`Fact check: chapter ${c.position} of ${chapters.length}, "${c.title}"…`)
        const res = await fetch(`/api/admin/scribe/entries/${c.entry_id}/factcheck`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || `Fact check failed on chapter ${c.position}`)
        total += json.claims ?? 0
      }
      setProgress(`Fact check done: ${total} claim${total === 1 ? '' : 's'} checked.`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Fact check failed')
    }
    setCheckingFacts(false)
    setTimeout(() => setProgress(''), 6000)
  }

  async function setFindingStatus(id: string, status: 'open' | 'fixed' | 'dismissed') {
    setFindings(prev => prev.map(f => (f.id === id ? { ...f, status } : f)))
    const res = await fetch(`/api/admin/scribe/findings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { showToast('Could not update the finding'); await load() }
  }

  if (loading) return <div className={admin.page}><p className={admin.muted}>Loading…</p></div>
  if (!book) {
    return (
      <div className={admin.page}>
        <div className={admin.errorBanner}>{error || 'Book not found'}</div>
        <Link href="/admin/scribe/book" className={admin.viewLink}>Back to the books</Link>
      </div>
    )
  }

  const busy = refreshing || runningGaps || checkingFacts
  const openFindings = findings.filter(f => f.status === 'open')
  const shownFindings = showResolved ? findings.filter(f => f.status !== 'superseded') : openFindings
  const chapterById = new Map(chapters.map(c => [c.id, c]))
  const openByChapter = new Map<string, number>()
  for (const f of openFindings) if (f.chapter_id) openByChapter.set(f.chapter_id, (openByChapter.get(f.chapter_id) ?? 0) + 1)
  const totalWords = chapters.reduce((n, c) => n + c.word_count, 0)

  return (
    <div className={admin.page}>
      <div className={admin.header}>
        <Link href="/admin/scribe/book" className={admin.viewLink}>Books</Link>
        <h1>{book.title}</h1>
        <p className={admin.muted}>
          {chapters.length} chapter{chapters.length === 1 ? '' : 's'} · {totalWords.toLocaleString()} words ·{' '}
          {openFindings.length} open finding{openFindings.length === 1 ? '' : 's'}
          {book.summary_updated_at && ` · summary ${new Date(book.summary_updated_at).toLocaleString()}`}
        </p>
      </div>

      {error && <div className={admin.errorBanner}>{error}</div>}
      {toast && <div className={admin.toast}>{toast}</div>}

      <div className={admin.card}>
        <div className={admin.fieldRow}>
          <span className={admin.fieldLabel}>Status</span>
          <select
            className={admin.textInput}
            value={book.status}
            onChange={e => saveBook({ status: e.target.value })}
            style={{ maxWidth: 160 }}
          >
            <option value="drafting">drafting</option>
            <option value="revising">revising</option>
            <option value="settled">settled</option>
            <option value="archived">archived</option>
          </select>
          <button className={admin.ghostBtn} onClick={refreshAll} disabled={busy} title="Reindex changed chapters, rewrite their summaries, and rebuild the book summary">
            {refreshing ? 'Refreshing…' : 'Rebuild summaries'}
          </button>
          <button className={admin.ghostBtn} onClick={runBookGaps} disabled={busy || chapters.length < 2} title="Read the outline and every chapter summary and report gaps in the argument across essays">
            {runningGaps ? 'Reading the book…' : 'Find gaps across the book'}
          </button>
          <button className={admin.ghostBtn} onClick={factCheckAll} disabled={busy || chapters.length === 0} title="Check every claim about Stoic figures, texts, dates and doctrines in every chapter against the corpus">
            {checkingFacts ? 'Checking…' : 'Fact check every chapter'}
          </button>
          {busy && (
            <button className={admin.ghostBtn} onClick={() => { cancelRef.current = true }}>Stop after this one</button>
          )}
        </div>
        {progress && <p className={styles.progress}>{progress}</p>}
      </div>

      <div className={styles.split}>
        <div>
          {/* ── Outline ── */}
          <div className={admin.card}>
            <div className={admin.cardTitleRow}>
              <h2 className={admin.cardTitle}>Outline</h2>
            </div>
            {chapters.length === 0 ? (
              <p className={admin.muted}>No chapters yet. Paste a draft on the right, or add an empty chapter below.</p>
            ) : (
              chapters.map((c, i) => (
                <div key={c.id} className={styles.outlineRow}>
                  <span className={styles.outlinePos}>{c.position}.</span>
                  <div>
                    <Link href={`/admin/scribe/chat?entry=${c.entry_id}`} className={styles.outlineTitle}>{c.title}</Link>
                    <span className={`${styles.status} ${statusClass(c.status)}`}>{c.status}</span>
                    <div className={styles.outlineMeta}>
                      {c.word_count.toLocaleString()} words
                      {openByChapter.get(c.id) ? ` · ${openByChapter.get(c.id)} open finding${openByChapter.get(c.id) === 1 ? '' : 's'}` : ''}
                      {!c.summary && ' · no summary yet'}
                      {c.summary ? ` · ${c.summary.slice(0, 140)}${c.summary.length > 140 ? '…' : ''}` : ''}
                    </div>
                  </div>
                  <span className={styles.outlineBtns}>
                    <button className={admin.iconBtn} onClick={() => moveChapter(i, -1)} disabled={i === 0} title="Move up">↑</button>
                    <button className={admin.iconBtn} onClick={() => moveChapter(i, 1)} disabled={i === chapters.length - 1} title="Move down">↓</button>
                    <select
                      className={styles.smallBtn}
                      value={c.status}
                      onChange={e => patchChapter(c.id, { status: e.target.value })}
                      title="Chapter status"
                    >
                      <option value="raw">raw</option>
                      <option value="working">working</option>
                      <option value="settled">settled</option>
                      <option value="archived">archive</option>
                    </select>
                  </span>
                </div>
              ))
            )}
            <div className={admin.fieldRow} style={{ marginTop: 10 }}>
              <input
                className={admin.textInput}
                placeholder="New chapter title"
                value={newChapterTitle}
                onChange={e => setNewChapterTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addChapter() }}
              />
              <button className={admin.ghostBtn} onClick={addChapter} disabled={addingChapter || !newChapterTitle.trim()}>
                {addingChapter ? 'Adding…' : 'Add empty chapter'}
              </button>
            </div>
          </div>

          {/* ── Summary and argument ── */}
          <div className={admin.card}>
            <div className={admin.cardTitleRow}>
              <h2 className={admin.cardTitle}>The book so far</h2>
            </div>
            <p className={admin.muted}>
              Rebuilt from the chapter summaries whenever a chapter changes. Edit it by hand if it is wrong; the next rebuild replaces it.
            </p>
            <textarea
              className={admin.bigTextarea}
              rows={8}
              value={summaryDraft}
              onChange={e => setSummaryDraft(e.target.value)}
              placeholder="No summary yet. Rebuild summaries once there are chapters."
            />
            <div className={admin.actions}>
              <button
                className={admin.ghostBtn}
                onClick={() => saveBook({ summary: summaryDraft })}
                disabled={savingSummary || summaryDraft === (book.summary ?? '')}
              >
                {savingSummary ? 'Saving…' : 'Save summary'}
              </button>
            </div>
            {book.argument && (
              <div className={styles.argument}>
                {book.argument.thesis && <div><strong>Thesis:</strong> {book.argument.thesis}</div>}
                {book.argument.through_line && <div><strong>Through line:</strong> {book.argument.through_line}</div>}
                {book.argument.open_questions?.length ? (
                  <div><strong>Open questions:</strong> {book.argument.open_questions.join(' · ')}</div>
                ) : null}
              </div>
            )}
            {gapCommentary && (
              <>
                <div className={admin.sectionLabel}>What Scribe said about the whole</div>
                <div className={admin.summaryArea} style={{ whiteSpace: 'pre-wrap' }}>{gapCommentary}</div>
              </>
            )}
          </div>
        </div>

        <div>
          {/* ── Import ── */}
          <div className={admin.card}>
            <div className={admin.cardTitleRow}>
              <h2 className={admin.cardTitle}>Bring in a draft</h2>
            </div>
            <p className={admin.muted}>
              Paste the whole thing. Shaping reads it all and proposes what it is and how it divides, paragraphs regrouped
              but never rewritten; the other options split it mechanically. You review the split before anything is stored.
            </p>
            <textarea
              className={admin.bigTextarea}
              rows={10}
              placeholder="Paste the draft or the stream of consciousness here…"
              value={pasted}
              onChange={e => setPasted(e.target.value)}
              disabled={previewing || committing}
            />
            <div className={admin.fieldRow}>
              <select className={admin.textInput} value={strategy} onChange={e => setStrategy(e.target.value as Strategy)} style={{ maxWidth: 380 }}>
                {(Object.keys(STRATEGY_LABEL) as Strategy[]).map(s => <option key={s} value={s}>{STRATEGY_LABEL[s]}</option>)}
              </select>
              <button className={admin.primaryBtn} onClick={runPreview} disabled={previewing || committing || !pasted.trim()}>
                {previewing ? (strategy === 'shape' ? 'Scribe is reading it all…' : 'Splitting…') : 'Preview the split'}
              </button>
              <span className={admin.muted}>{pasted.trim() ? `${wordsOf(pasted).toLocaleString()} words` : ''}</span>
            </div>

            {preview && (
              <>
                <div className={admin.sectionLabel}>
                  {preview.length} chapter{preview.length === 1 ? '' : 's'} by {usedStrategy === 'shape' ? "Scribe's shaping" : `${usedStrategy}`} ·{' '}
                  {preview.reduce((n, c) => n + c.words, 0).toLocaleString()} words
                </div>
                {proposal && (
                  <p className={styles.previewNote}>
                    <strong>{proposal.form === 'book' ? 'This reads as a book' : proposal.form === 'essay' ? 'This reads as one essay' : proposal.form === 'chapter' ? 'This reads as a single chapter' : 'These read as separate pieces'}
                    {proposal.title ? `, working title "${proposal.title}"` : ''}.</strong>{' '}
                    {proposal.note}
                  </p>
                )}
                {preview.map((c, i) => {
                  const part = proposal?.parts.find(p => p.title === c.title)
                  return (
                    <div key={i} className={styles.previewCard}>
                      <div className={styles.previewHead}>
                        <span className={styles.outlinePos}>{i + 1}.</span>
                        <input
                          className={`${admin.textInput} ${styles.previewTitle}`}
                          value={c.title}
                          onChange={e => updatePreview(i, { title: e.target.value })}
                        />
                        <span className={admin.muted}>{c.words.toLocaleString()} w</span>
                        <button className={admin.iconBtn} onClick={() => movePreview(i, -1)} disabled={i === 0} title="Move up">↑</button>
                        <button className={admin.iconBtn} onClick={() => movePreview(i, 1)} disabled={i === preview.length - 1} title="Move down">↓</button>
                        <button className={admin.iconBtn} onClick={() => mergePreview(i)} disabled={i === 0} title="Merge into the chapter above">⤴</button>
                        <button className={admin.iconBtn} onClick={() => dropPreview(i)} title="Leave this out">✕</button>
                      </div>
                      {part && (
                        <p className={styles.previewNote}>
                          {part.thesis && <><strong>Reaching for:</strong> {part.thesis} </>}
                          {part.lacks && <><strong>Lacks:</strong> {part.lacks}</>}
                        </p>
                      )}
                      <p className={styles.previewText}>{c.text.slice(0, 400)}{c.text.length > 400 ? '…' : ''}</p>
                    </div>
                  )
                })}
                <div className={admin.actions}>
                  <button className={admin.primaryBtn} onClick={commitPreview} disabled={committing || !preview.length}>
                    {committing ? 'Adding…' : `Add ${preview.length} chapter${preview.length === 1 ? '' : 's'} to the book`}
                  </button>
                  <button className={admin.ghostBtn} onClick={() => { setPreview(null); setProposal(null) }} disabled={committing}>Discard</button>
                </div>
              </>
            )}
          </div>

          {/* ── Findings ── */}
          <div className={admin.card}>
            <div className={admin.cardTitleRow}>
              <h2 className={admin.cardTitle}>Findings</h2>
              <button className={admin.ghostBtn} onClick={() => setShowResolved(s => !s)}>
                {showResolved ? 'Open only' : 'Show resolved'}
              </button>
            </div>
            {shownFindings.length === 0 ? (
              <p className={admin.muted}>
                Nothing open. Gaps come from /gaps in a chapter or the book wide pass above; fact findings from /factcheck or the button above.
              </p>
            ) : (
              shownFindings.map(f => {
                const c = f.chapter_id ? chapterById.get(f.chapter_id) : undefined
                const verdictClass =
                  f.verdict === 'supported' ? styles.verdictSupported
                  : f.verdict === 'contradicted' ? styles.verdictContradicted
                  : f.verdict === 'unverifiable' ? styles.verdictUnverifiable
                  : ''
                return (
                  <div key={f.id} className={styles.finding}>
                    <span className={`${styles.findingKind} ${verdictClass}`}>
                      {f.kind === 'fact' ? f.verdict : f.kind === 'cross_gap' ? 'across chapters' : 'gap'}
                    </span>
                    {c && <span className={admin.muted}>ch. {c.position}, {c.title} · </span>}
                    {f.status !== 'open' && <span className={admin.chip}>{f.status}</span>}{' '}
                    <span className={styles.findingPassage}>“{f.passage.length > 220 ? `${f.passage.slice(0, 220)}…` : f.passage}”</span>
                    {f.claim && f.kind === 'fact' && <div className={styles.findingNote}><strong>Claim:</strong> {f.claim}</div>}
                    <div className={styles.findingNote}>{f.note}</div>
                    {f.evidence?.length > 0 && (
                      <div className={styles.findingEvidence}>
                        {f.evidence.map((e, i) => (
                          <div key={i}>
                            {e.author}, {[e.work, e.section_label].filter(Boolean).join(' ')}{e.translator ? `, trans. ${e.translator}` : ''}
                            {e.mode === 'paraphrase' ? ' (a summary of modern scholarship)' : ''}: “{e.excerpt}”
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={styles.findingBtns}>
                      {c && <Link href={`/admin/scribe/chat?entry=${c.entry_id}`} className={styles.smallBtn}>Open chapter</Link>}
                      {f.status === 'open' ? (
                        <>
                          <button className={styles.smallBtn} onClick={() => setFindingStatus(f.id, 'fixed')}>Fixed</button>
                          <button className={styles.smallBtn} onClick={() => setFindingStatus(f.id, 'dismissed')}>Dismiss</button>
                        </>
                      ) : f.status !== 'superseded' ? (
                        <button className={styles.smallBtn} onClick={() => setFindingStatus(f.id, 'open')}>Reopen</button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
