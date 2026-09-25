'use client'

// Scribe chat mode — the conversation IS the product. Kyle pastes a journal
// fragment; Scribe develops it against the corpus turn by turn; every turn
// re-retrieves live and the whole thread persists. Sibling of the pipeline
// at /admin/scribe; export is copy-out only — the hand-retype gate stays.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import admin from '../../admin.module.css'
import styles from './chat.module.css'
import DraftWorkspace, { type DraftTab } from './DraftWorkspace'
import SourceList from './SourceList'
import type { BookInfo, DiffBase, Draft, Entry, Finding, Message, Review, Source } from './types'
import { withAttribution } from '@/lib/scribe/attribution'
import { describeScopedTurn } from '@/lib/scribe/scoped-turns'
import { countEditBlocks, stripEdits } from '@/lib/scribe/edits'
import { describeCommandTurn, parseCommand, stripFindingsBlock } from '@/lib/scribe/book'
import type { Highlight } from '@/lib/scribe/prose'
import type { DraftState } from '@/lib/scribe/provenance'
import type { QuoteFinding } from './types'

// Column widths, dragged and remembered. The draft column takes whatever is
// left, which on a wide screen is most of it: the essay is the work.
type Layout = {
  entries: number
  convo: number
  sources: number
  entriesOpen: boolean
  sourcesOpen: boolean
  // Which side pane the writer opened most recently. When the window cannot
  // hold both, the other one gives way, so opening a rail always does
  // something rather than silently losing to a fixed priority.
  lastOpened: 'entries' | 'sources'
}
const LAYOUT_KEY = 'scribe-chat-layout-v1'
const DEFAULT_LAYOUT: Layout = {
  entries: 220, convo: 400, sources: 340, entriesOpen: true, sourcesOpen: true, lastOpened: 'sources',
}
const LIMITS = { entries: [160, 360], convo: [300, 680], sources: [240, 600] } as const
const RAIL = 40
// The draft column never goes below this: it is the reason the page exists.
const MIN_DRAFT = 460
const MIN_CONVO = 280
// Below this the columns stop being columns and the panes stack.
const STACK_BELOW = 900

// What actually fits. Preferences are honoured while there is room; when
// there is not, the side pane the writer did not just open collapses to its
// rail, and the conversation gives up width before the draft does.
function fitLayout(l: Layout, viewportW: number) {
  if (viewportW < STACK_BELOW) {
    return { stacked: true as const, entriesOpen: false, sourcesOpen: false, convo: 0, squeezed: false }
  }
  const budget = viewportW - MIN_DRAFT - 3 * 6 - 32 // resizers and the page gutter
  const width = (open: boolean, w: number) => (open ? w : RAIL)
  let entriesOpen = l.entriesOpen
  let sourcesOpen = l.sourcesOpen
  const used = () => width(entriesOpen, l.entries) + width(sourcesOpen, l.sources) + MIN_CONVO
  const giveWay: ('entries' | 'sources')[] =
    l.lastOpened === 'entries' ? ['sources', 'entries'] : ['entries', 'sources']
  for (const pane of giveWay) {
    if (used() <= budget) break
    if (pane === 'entries') entriesOpen = false
    else sourcesOpen = false
  }
  const room = budget - width(entriesOpen, l.entries) - width(sourcesOpen, l.sources)
  const convo = Math.max(MIN_CONVO, Math.min(l.convo, room))
  return { stacked: false as const, entriesOpen, sourcesOpen, convo, squeezed: convo < l.convo }
}

function extractDraft(text: string): string | null {
  const m = text.match(/<draft>([\s\S]*?)<\/draft>/)
  return m ? m[1].trim() : null
}

// Kyle's hand revisions come back through the thread as ordinary user turns
// carrying the whole draft; the marker is how the UI tells them apart.
function isHandRevision(content: string): boolean {
  return content.includes('<kyle-edit')
}
function revisionSummary(content: string): string {
  return content.match(/<kyle-edit summary="([^"]*)"/)?.[1] ?? ''
}

// Chat-bubble text: commentary only — the draft lives in its own pane, and a
// gap analysis's findings block lives in the Findings tab.
function commentaryOf(text: string): string {
  const out = stripFindingsBlock(stripEdits(
    text
      .replace(/<snapshot stage="(?:middle|full|final)"\s*\/>/g, '')
      .replace(/<draft>[\s\S]*?(<\/draft>|$)/, '')
  )).trim()
  return out || '(revised the working draft — see the draft pane)'
}

// Kyle's turn as the conversation shows it: a command as the command typed,
// an imported chapter as a note, a scoped turn condensed, else verbatim.
function userTurnText(content: string): string {
  if (content.startsWith('<chapter-import/>')) return content.replace('<chapter-import/>\n', '')
  return describeCommandTurn(content) ?? describeScopedTurn(content) ?? content
}

// While streaming, show the partial draft as it grows.
function partialDraft(text: string): string | null {
  const closed = extractDraft(text)
  if (closed) return closed
  const m = text.match(/<draft>([\s\S]*)$/)
  return m ? m[1] : null
}

export default function ScribeChatPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  // The book this entry is a chapter of, or null for a standalone essay.
  const [book, setBook] = useState<BookInfo | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [checkingFacts, setCheckingFacts] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // New-entry form
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newText, setNewText] = useState('')
  const [creating, setCreating] = useState(false)

  // Streaming turn state
  const [streamText, setStreamText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [searchingQuery, setSearchingQuery] = useState('')
  const [liveSources, setLiveSources] = useState<Source[]>([])
  // The outside reader's findings from the just-finished final turn. Held until
  // the next turn starts; a viewed snapshot's own stored review takes priority.
  const [liveReview, setLiveReview] = useState<Review | null>(null)
  // The draft the just-finished turn resolved to (its edits applied), shown
  // until the reload brings the persisted thread.
  const [liveDraft, setLiveDraft] = useState<string | null>(null)

  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT)
  const [paneWide, setPaneWide] = useState(true)
  const [viewportW, setViewportW] = useState(1600)
  const draftColRef = useRef<HTMLDivElement>(null)

  // The quotation check for the draft on screen.
  const [quotes, setQuotes] = useState<QuoteFinding[] | null>(null)
  const [quotesChecking, setQuotesChecking] = useState(false)
  const [sendingToComposer, setSendingToComposer] = useState(false)
  const [readingOutside, setReadingOutside] = useState(false)

  // Composer + draft workspace
  const [input, setInput] = useState('')
  const [viewedDraftId, setViewedDraftId] = useState<string | null>(null) // null = working draft
  const [snapshotting, setSnapshotting] = useState(false)
  const [applying, setApplying] = useState(false)
  const [rightTab, setRightTab] = useState<DraftTab>('draft')
  const [fullscreen, setFullscreen] = useState(false)
  // "Show me where" is one shared piece of state, because the voice meter, an
  // outside-read finding, and the source list all paint the same draft.
  const [highlight, setHighlight] = useState<Highlight | null>(null)

  const threadRef = useRef<HTMLDivElement>(null)
  // Deep link from the Log: ?entry=<id>&run=1 opens an entry and, if Scribe
  // hasn't answered yet, runs the opening turn. Read from location instead of
  // useSearchParams to avoid the Suspense-boundary requirement.
  const autoRunRef = useRef(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/scribe/entries', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load entries')
      setEntries(json.entries || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load entries')
    }
  }, [])

  const loadEntry = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/scribe/entries/${id}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load entry')
      setEntry(json.entry)
      setMessages(json.messages || [])
      setDrafts(json.drafts || [])
      setBook(json.book ?? null)
      setFindings(json.findings || [])
      setViewedDraftId(null)
      setRightTab('draft')
      // Another entry's quotations are not this entry's; clear until the
      // check runs again on the draft now on screen.
      setQuotes(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load entry')
    }
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY)
      if (saved) setLayout({ ...DEFAULT_LAYOUT, ...(JSON.parse(saved) as Partial<Layout>) })
    } catch { /* defaults */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)) } catch { /* ignore */ }
  }, [layout])

  // The viewport drives which side panes can be open at all: four columns do
  // not fit on a laptop, and a draft squeezed to nothing is the thing this
  // layout exists to prevent.
  useEffect(() => {
    const read = () => setViewportW(window.innerWidth)
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  // Essay typography once the draft column is wide enough to carry it.
  useEffect(() => {
    const el = draftColRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setPaneWide(e.contentRect.width >= 600)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Drag a divider: the column on its left grows with the pointer, except the
  // sources column, which grows the other way.
  function startResize(col: 'entries' | 'convo' | 'sources', e: React.PointerEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = layout[col]
    const [min, max] = LIMITS[col]
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const w = Math.min(max, Math.max(min, col === 'sources' ? startW - dx : startW + dx))
      setLayout(l => ({ ...l, [col]: w }))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  useEffect(() => { if (selectedId) loadEntry(selectedId) }, [selectedId, loadEntry])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const entryParam = params.get('entry')
    if (entryParam) {
      autoRunRef.current = params.get('run') === '1'
      setSelectedId(entryParam)
      window.history.replaceState(null, '', '/admin/scribe/chat')
    }
  }, [])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages, streamText])

  // Escape leaves the full-page draft rather than the browser's fullscreen.
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // Run one Scribe turn (message === undefined → opening turn / retry).
  const runTurn = useCallback(async (entryId: string, message?: string) => {
    setStreaming(true)
    setStreamText('')
    setSearchingQuery('')
    setLiveSources([])
    setLiveReview(null)
    setLiveDraft(null)
    setError('')
    try {
      const res = await fetch(`/api/admin/scribe/entries/${entryId}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message ? { message } : {}),
      })
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Turn failed (${res.status})`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const ev = JSON.parse(line) as { t: string; v: unknown }
          if (ev.t === 'text') {
            setSearchingQuery('')
            setStreamText(prev => prev + (ev.v as string))
          } else if (ev.t === 'searching') {
            setSearchingQuery(ev.v as string)
          } else if (ev.t === 'sources') {
            setLiveSources(ev.v as Source[])
          } else if (ev.t === 'review') {
            setLiveReview(ev.v as Review)
            setRightTab('review') // surface the cold read as soon as it lands
          } else if (ev.t === 'draft') {
            const v = ev.v as { text: string | null; mode: string; applied: number; failed: number }
            if (v.text) setLiveDraft(v.text)
            if (v.failed) showToast(`${v.failed} of Scribe's edits could not be placed — see the note in the conversation`)
          } else if (ev.t === 'findings') {
            const v = ev.v as Finding[]
            setFindings(prev => [...v, ...prev.map(f => (f.status === 'open' && f.kind !== 'fact' ? { ...f, status: 'superseded' as const } : f))])
            if (v.length) setRightTab('findings')
            showToast(v.length ? `${v.length} finding${v.length === 1 ? '' : 's'} in the Findings tab` : 'No gaps found; the argument holds as far as Scribe can see')
          } else if (ev.t === 'book') {
            const v = ev.v as { reindexed: boolean; summarized: boolean }
            if (v.summarized) showToast('Chapter summary and book index updated')
          } else if (ev.t === 'error') {
            throw new Error(ev.v as string)
          } else if (ev.t === 'done') {
            const v = ev.v as { snapshot: { stage: string } | null }
            if (v.snapshot) {
              showToast(v.snapshot.stage === 'final'
                ? 'Final draft saved — outside reader has weighed in'
                : `Saved a ${v.snapshot.stage} draft snapshot`)
            }
          }
        }
      }
      await Promise.all([loadEntry(entryId), loadEntries()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scribe turn failed')
    } finally {
      setStreaming(false)
      setStreamText('')
      setSearchingQuery('')
      setLiveDraft(null)
    }
  }, [loadEntry, loadEntries])

  async function createEntry() {
    if (!newText.trim()) { showToast('Paste the journal fragment first'); return }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/scribe/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, raw_text: newText }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Create failed')
      setNewTitle('')
      setNewText('')
      setShowNew(false)
      await loadEntries()
      setSelectedId(json.entry.id)
      await loadEntry(json.entry.id)
      // Kick off Scribe's opening turn — the middle draft.
      await runTurn(json.entry.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    }
    setCreating(false)
  }

  // The fact check is not a conversation turn: it extracts the claims, checks
  // each against the corpus and the paper chunks, and lands in Findings.
  const runFactCheck = useCallback(async (entryId: string) => {
    if (checkingFacts) return
    setCheckingFacts(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/scribe/entries/${entryId}/factcheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Fact check failed')
      await loadEntry(entryId)
      setRightTab('findings')
      const contradicted = (json.results as { verdict: string }[] | undefined)?.filter(r => r.verdict === 'contradicted').length ?? 0
      showToast(
        json.nothingToCheck
          ? 'No checkable claims about the Stoics in this draft'
          : `${json.claims} claim${json.claims === 1 ? '' : 's'} checked${contradicted ? `, ${contradicted} contradicted by the corpus` : ''}`
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fact check failed')
    }
    setCheckingFacts(false)
  }, [checkingFacts, loadEntry])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || !selectedId || streaming) return
    setInput('')
    // /factcheck and /summarize are jobs, not turns.
    const cmd = parseCommand(msg)
    if (cmd?.name === 'factcheck') {
      if (cmd.arg === 'book' && book) { window.open(`/admin/scribe/book/${book.id}`, '_blank', 'noopener'); return }
      await runFactCheck(selectedId)
      return
    }
    if (cmd?.name === 'summarize') {
      if (!book) { showToast('This entry is not in a book; there is nothing to summarise yet'); return }
      window.open(`/admin/scribe/book/${book.id}`, '_blank', 'noopener')
      return
    }
    if (cmd?.name === 'gaps' && cmd.arg === 'book') {
      if (!book) { showToast('This entry is not in a book'); return }
      window.open(`/admin/scribe/book/${book.id}`, '_blank', 'noopener')
      return
    }
    // Optimistic echo of Kyle's turn; the reload after the stream replaces it.
    setMessages(prev => [...prev, {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: msg,
      sources_used: null,
      created_at: new Date().toISOString(),
    }])
    await runTurn(selectedId, msg)
  }

  async function setFindingStatus(id: string, status: 'open' | 'fixed' | 'dismissed') {
    setFindings(prev => prev.map(f => (f.id === id ? { ...f, status } : f)))
    const res = await fetch(`/api/admin/scribe/findings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) showToast('Could not update the finding')
  }

  const chapterIndex = book ? book.chapters.findIndex(c => c.entry_id === selectedId) : -1
  const prevChapter = chapterIndex > 0 ? book!.chapters[chapterIndex - 1] : null
  const nextChapter = book && chapterIndex >= 0 && chapterIndex < book.chapters.length - 1 ? book.chapters[chapterIndex + 1] : null

  // Every committed draft in thread order, whoever produced it — Scribe's turns
  // and Kyle's hand revisions alike. The last one is the working draft.
  const draftTrail = useMemo(() => {
    const out: { key: string; role: 'user' | 'scribe'; text: string }[] = []
    for (const m of messages) {
      const d = m.draft_text ?? extractDraft(m.content)
      if (d) out.push({ key: m.id, role: m.role, text: d })
    }
    return out
  }, [messages])

  const committedDraft = draftTrail.length ? draftTrail[draftTrail.length - 1].text : null
  const streamingDraft = streaming ? partialDraft(streamText) : null
  const streamingEdits = streaming ? countEditBlocks(streamText) : 0
  const viewedSnapshot = viewedDraftId ? drafts.find(d => d.id === viewedDraftId) ?? null : null
  const draftShown = viewedSnapshot?.draft_text ?? liveDraft ?? streamingDraft ?? committedDraft

  // What the shown draft gets compared against in the changes view. First entry
  // is the default: the state the draft was in immediately before this one.
  const bases = useMemo<DiffBase[]>(() => {
    const out: DiffBase[] = []
    if (viewedSnapshot) {
      const i = drafts.findIndex(d => d.id === viewedSnapshot.id)
      if (i > 0) {
        out.push({ id: 'prev', label: `Previous snapshot · ${drafts[i - 1].stage}`, text: drafts[i - 1].draft_text })
      }
    } else {
      // Mid-stream the previous state is the last committed draft; once the
      // turn lands, that draft IS the current one, so step back one further.
      const prevIdx = draftTrail.length - (streamingDraft ? 1 : 2)
      const prev = draftTrail[prevIdx]
      // When the working draft is one of Kyle's own hand revisions, diffing
      // against it would only show him his own edit and hide the Scribe turn
      // he has not reviewed yet. Reach back past Scribe's last draft instead,
      // so the changes view shows that turn and his edits together.
      const lastScribeIdx = draftTrail.map(d => d.role).lastIndexOf('scribe')
      const beforeScribe = lastScribeIdx > 0 ? draftTrail[lastScribeIdx - 1] : undefined
      if (beforeScribe && beforeScribe !== prev) {
        out.push({ id: 'before-scribe', label: 'Before Scribe’s last turn', text: beforeScribe.text })
      }
      if (prev) {
        out.push({
          id: 'prev',
          label: prev.role === 'user' ? 'Your last hand revision' : 'Previous Scribe draft',
          text: prev.text,
        })
      }
    }
    drafts.forEach((d, i) => {
      if (viewedSnapshot?.id === d.id) return
      out.push({ id: `snap-${d.id}`, label: `Snapshot ${i + 1} · ${d.stage}`, text: d.draft_text })
    })
    if (entry?.raw_text) out.push({ id: 'raw', label: 'Original journal fragment', text: entry.raw_text })
    return out.filter(b => b.text.trim() && b.text.trim() !== draftShown?.trim())
  }, [viewedSnapshot, drafts, draftTrail, streamingDraft, entry, draftShown])

  // A viewed final snapshot shows its own stored read. On the working view:
  // the live read from the turn just finished, else the last saved final
  // snapshot's read — which is persisted in the DB, so it survives reloads and
  // further edits (no need to re-run finalize just to see it again).
  const latestFinalWithReview = [...drafts].reverse().find(d => d.stage === 'final' && d.review)
  const reviewShown = viewedSnapshot?.review ?? (viewedDraftId ? null : (liveReview ?? latestFinalWithReview?.review ?? null))
  // True when the shown read is the saved fallback (may predate current edits).
  const reviewIsSavedFallback = !viewedDraftId && !liveReview && !!latestFinalWithReview

  // Source panel: live during a turn, else the latest scribe turn's sources.
  const latestSources = (() => {
    if (streaming || liveSources.length) return liveSources
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'scribe' && messages[i].sources_used?.length) {
        return messages[i].sources_used as Source[]
      }
    }
    return []
  })()

  async function snapshot(stage: 'middle' | 'full') {
    if (!selectedId || !committedDraft) return
    setSnapshotting(true)
    try {
      const res = await fetch(`/api/admin/scribe/entries/${selectedId}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, draft_text: committedDraft, sources_used: latestSources.length ? latestSources : null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Snapshot failed')
      showToast(`Saved as ${stage} draft`)
      await loadEntry(selectedId)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Snapshot failed')
    }
    setSnapshotting(false)
  }

  // The final handoff: Scribe stops developing, produces the final draft plus
  // the retype punch-list, and the server fires one cold outside read.
  async function finalize() {
    if (!selectedId || streaming || !committedDraft) return
    await runTurn(selectedId, 'Finalize the draft and hand it off: produce the final draft and the retype punch-list. No new directions or sources.')
  }

  // Kyle's resolved version of a turn's changes becomes the working draft, as a
  // real turn in the thread so Scribe carries his decisions forward.
  async function applyRevision(text: string, summary: string) {
    if (!selectedId) return
    setApplying(true)
    try {
      const res = await fetch(`/api/admin/scribe/entries/${selectedId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_text: text, summary }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not apply the revision')
      showToast(`Working draft updated — ${summary}`)
      await Promise.all([loadEntry(selectedId), loadEntries()])
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not apply the revision')
    }
    setApplying(false)
  }

  // ── The quotation check ─────────────────────────────────────────────────
  // Runs against whatever draft is on screen, shortly after it settles. The
  // pipeline has always machine-checked quotes; this is chat mode's.
  useEffect(() => {
    if (!selectedId || !draftShown || streaming) return
    let cancelled = false
    const t = setTimeout(async () => {
      setQuotesChecking(true)
      try {
        const res = await fetch(`/api/admin/scribe/entries/${selectedId}/quotes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_text: draftShown }),
        })
        const json = await res.json()
        if (!cancelled && res.ok) setQuotes(json.findings ?? [])
      } catch {
        // A failed check is not a finding; leave the last result standing.
      } finally {
        if (!cancelled) setQuotesChecking(false)
      }
    }, 900)
    return () => { cancelled = true; clearTimeout(t) }
  }, [selectedId, draftShown, streaming])

  // Hand the draft to the Composer, where it gets retyped into Kyle's voice.
  async function sendToComposer() {
    if (!selectedId || !draftShown) return
    setSendingToComposer(true)
    try {
      const res = await fetch(`/api/admin/scribe/entries/${selectedId}/to-composer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_text: draftShown, title: entry?.title ?? null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not send the draft')
      showToast('Opening the Composer on this draft')
      window.open(`/dashboard/composer?piece=${json.pieceId}`, '_blank', 'noopener')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not send the draft')
    }
    setSendingToComposer(false)
  }

  // Turn the gaps-only posture on or off for this entry.
  async function toggleGapsMode() {
    if (!selectedId || !entry) return
    const next = !entry.gaps_mode
    setEntry({ ...entry, gaps_mode: next })
    try {
      const res = await fetch(`/api/admin/scribe/entries/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gaps_mode: next }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Could not change the mode')
      showToast(
        next
          ? 'Gaps mode on — Scribe will leave the paragraphs to you from the next turn'
          : 'Gaps mode off — Scribe will write prose again'
      )
    } catch (e) {
      setEntry({ ...entry, gaps_mode: !next })
      showToast(e instanceof Error ? e.message : 'Could not change the mode')
    }
  }

  // One cold read of the draft as it stands. Not persisted: the draft moves.
  async function outsideReadNow() {
    if (!selectedId || !draftShown) return
    setReadingOutside(true)
    try {
      const res = await fetch(`/api/admin/scribe/entries/${selectedId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_text: draftShown }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'The outside read failed')
      setLiveReview(json.review as Review)
      setRightTab('review')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'The outside read failed')
    }
    setReadingOutside(false)
  }

  async function exportDraft() {
    if (!draftShown) return
    const title = entry?.title ? `# ${entry.title}\n\n` : ''
    await navigator.clipboard.writeText(withAttribution(`${title}${draftShown}`))
    showToast('Draft copied — retype by hand before publishing')
  }

  // A .docx of the draft, built on demand; the library loads on first use.
  async function exportWord() {
    if (!draftShown) return
    try {
      const [{ Packer }, { buildDraftDocument, docxFilename }] = await Promise.all([
        import('docx'),
        import('@/lib/scribe/docx-export'),
      ])
      const blob = await Packer.toBlob(buildDraftDocument(entry?.title ?? null, draftShown))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = docxFilename(entry?.title ?? null)
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      showToast('Word document downloaded — retype by hand before publishing')
    } catch (e) {
      showToast(e instanceof Error ? `Word export failed: ${e.message}` : 'Word export failed')
    }
  }

  const canChat = !!selectedId && messages.length > 0
  const lastMessage = messages[messages.length - 1]
  const needsOpening =
    canChat && !streaming && lastMessage.role === 'user' && !isHandRevision(lastMessage.content)

  // Auto-run the opening turn when arriving from the Log with &run=1.
  useEffect(() => {
    if (autoRunRef.current && needsOpening && selectedId) {
      autoRunRef.current = false
      runTurn(selectedId)
    }
  }, [needsOpening, selectedId, runTurn])

  async function saveToLog() {
    if (!draftShown) return
    try {
      const res = await fetch('/api/admin/scribe/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'essay', title: entry?.title || null, content: draftShown }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      showToast('Draft saved to the Log as an essay')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed')
    }
  }

  // A passage Kyle highlighted in the draft, sent as a narrowly scoped
  // instruction. Same turn machinery as the composer; the difference is that
  // Scribe is told to change that passage and reproduce everything else.
  function runScopedTurn(prompt: string) {
    if (!selectedId || streaming) return
    setHighlight(null)
    setFullscreen(false)
    runTurn(selectedId, prompt)
  }

  // Every committed draft state in thread order: what provenance is computed
  // from. The journal fragment rides separately as the writer's own.
  const history: DraftState[] = draftTrail.map(d => ({ role: d.role, text: d.text }))

  const workspaceProps = {
    tab: rightTab,
    onTabChange: setRightTab,
    sources: latestSources,
    highlight,
    onHighlight: setHighlight,
    onScopedTurn: runScopedTurn,
    onNotice: showToast,
    title: entry?.title ?? null,
    draftText: draftShown,
    bases,
    review: reviewShown,
    reviewIsSavedFallback,
    viewingSnapshotStage: viewedSnapshot?.stage ?? null,
    drafts,
    viewedDraftId,
    onViewDraft: setViewedDraftId,
    streaming,
    snapshotting,
    canSnapshot: !!committedDraft,
    onSnapshot: snapshot,
    onFinalize: finalize,
    onExport: exportDraft,
    onExportWord: exportWord,
    onSaveToLog: saveToLog,
    onSendToComposer: sendToComposer,
    sendingToComposer,
    quotes,
    quotesChecking,
    history,
    rawText: entry?.raw_text ?? null,
    gapsMode: entry?.gaps_mode === true,
    onToggleGapsMode: toggleGapsMode,
    onOutsideRead: outsideReadNow,
    readingOutside,
    onApplyRevision: applyRevision,
    applying,
    findings,
    onFindingStatus: setFindingStatus,
  }

  const fit = fitLayout(layout, viewportW)
  const gridColumns = fit.stacked
    ? 'minmax(0, 1fr)'
    : [
        fit.entriesOpen ? `${layout.entries}px` : `${RAIL}px`,
        '6px',
        `${fit.convo}px`,
        '6px',
        `minmax(${MIN_DRAFT}px, 1fr)`,
        '6px',
        fit.sourcesOpen ? `${layout.sources}px` : `${RAIL}px`,
      ].join(' ')

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1>Scribe — Chat</h1>
        <p>
          Journal fragment in, editorial conversation out. The corpus is re-queried every turn;
          nothing publishes itself — export, then retype by hand.
        </p>
      </div>

      {error && <div className={admin.errorBanner}>{error}</div>}
      {toast && <div className={admin.toast}>{toast}</div>}

      {fullscreen && (
        <DraftWorkspace
          {...workspaceProps}
          fullscreen
          pane={false}
          onToggleFullscreen={() => setFullscreen(false)}
        />
      )}

      <div
        className={`${styles.grid} ${fit.stacked ? styles.gridStacked : ''}`}
        style={{ gridTemplateColumns: gridColumns }}
      >
        {/* ── Entries ── */}
        {fit.entriesOpen ? (
          <div className={`${styles.pane} ${styles.sidebar}`}>
            <div className={styles.paneHead}>
              Entries
              <span className={styles.headBtns}>
                <button className={admin.ghostBtn} onClick={() => setShowNew(s => !s)}>
                  {showNew ? 'Cancel' : 'New entry'}
                </button>
                <button className={styles.railBtn} onClick={() => setLayout(l => ({ ...l, entriesOpen: false }))} title="Hide the entries">‹</button>
              </span>
            </div>
            {showNew && (
              <div className={styles.newEntry}>
                <input
                  className={styles.newEntryTitle}
                  placeholder="Title (optional)…"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
                <textarea
                  className={styles.newEntryText}
                  placeholder="Paste the handwritten journal fragment, verbatim…"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                />
                <button className={admin.primaryBtn} onClick={createEntry} disabled={creating || !newText.trim()}>
                  {creating ? 'Starting…' : 'Start the conversation'}
                </button>
              </div>
            )}
            <div className={styles.paneBody}>
              {book && (
                <>
                  <div className={styles.searchNote}>
                    <a href={`/admin/scribe/book/${book.id}`}>{book.title}</a> · chapters
                  </div>
                  {book.chapters.map(c => (
                    <button
                      key={c.id}
                      className={`${styles.entryItem} ${c.entry_id === selectedId ? styles.entryItemOn : ''}`}
                      onClick={() => setSelectedId(c.entry_id)}
                      title={`${c.status}, ${c.word_count.toLocaleString()} words`}
                    >
                      {c.position}. {c.title}
                      <span className={styles.entryDate}>{c.status}</span>
                    </button>
                  ))}
                  <div className={styles.searchNote}>all entries</div>
                </>
              )}
              {entries.length === 0 && <p className={styles.draftEmpty}>No entries yet.</p>}
              {entries.map(e => (
                <button
                  key={e.id}
                  className={`${styles.entryItem} ${e.id === selectedId ? styles.entryItemOn : ''}`}
                  onClick={() => setSelectedId(e.id)}
                >
                  {e.title || e.raw_text.slice(0, 48) + (e.raw_text.length > 48 ? '…' : '')}
                  <span className={styles.entryDate}>{new Date(e.updated_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        ) : fit.stacked ? null : (
          <button
            className={styles.rail}
            onClick={() => setLayout(l => ({ ...l, entriesOpen: true, lastOpened: 'entries' }))}
            title="Show the entries"
          >
            <span>Entries ({entries.length})</span>
          </button>
        )}
        <div
          className={`${styles.resizer} ${fit.entriesOpen ? '' : styles.resizerOff}`}
          onPointerDown={e => fit.entriesOpen && startResize('entries', e)}
          hidden={fit.stacked}
        />

        {/* ── Conversation ── */}
        <div className={`${styles.pane} ${styles.convo}`}>
          <div className={styles.paneHead}>
            {book && chapterIndex >= 0
              ? `Chapter ${book.chapters[chapterIndex].position} of ${book.chapters.length}`
              : 'Conversation'}
            {book && (
              <span className={styles.headBtns}>
                <button className={styles.railBtn} onClick={() => prevChapter && setSelectedId(prevChapter.entry_id)} disabled={!prevChapter || streaming} title={prevChapter ? `Previous: ${prevChapter.title}` : 'First chapter'}>‹</button>
                <button className={styles.railBtn} onClick={() => nextChapter && setSelectedId(nextChapter.entry_id)} disabled={!nextChapter || streaming} title={nextChapter ? `Next: ${nextChapter.title}` : 'Last chapter'}>›</button>
              </span>
            )}
          </div>
          <div className={styles.paneBody} ref={threadRef}>
            {!selectedId && <p className={styles.draftEmpty}>Pick an entry or start a new one.</p>}
            <div className={styles.thread}>
              {messages.map(m => {
                if (m.role === 'user' && isHandRevision(m.content)) {
                  const summary = revisionSummary(m.content)
                  return (
                    <div key={m.id} className={styles.revisionNote}>
                      You settled the changes by hand{summary ? ` — ${summary}` : ''}
                    </div>
                  )
                }
                return (
                  <div key={m.id} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgScribe}`}>
                    <div className={styles.msgRole}>{m.role === 'user' ? 'Kyle' : 'Scribe'}</div>
                    {m.role === 'scribe' ? commentaryOf(m.content) : userTurnText(m.content)}
                  </div>
                )
              })}
              {streaming && (
                <div className={`${styles.msg} ${styles.msgScribe}`}>
                  <div className={styles.msgRole}>Scribe</div>
                  {streamText
                    ? commentaryOf(streamText) +
                      (partialDraft(streamText) !== null
                        ? '\n\n⟨drafting — see the draft pane⟩'
                        : streamingEdits
                          ? `\n\n⟨editing ${streamingEdits} passage${streamingEdits === 1 ? '' : 's'} — the draft updates when the turn lands⟩`
                          : '')
                    : '…'}
                </div>
              )}
              {searchingQuery && (
                <div className={styles.searchNote}>searching: “{searchingQuery}”</div>
              )}
              {needsOpening && (
                <button className={admin.ghostBtn} onClick={() => runTurn(selectedId!)}>
                  Scribe hasn&apos;t answered this turn — run it
                </button>
              )}
            </div>
          </div>
          <div className={styles.draftActions}>
            <button
              className={styles.snapshotChip}
              onClick={() => send('/rewrite')}
              disabled={!canChat || streaming || !committedDraft}
              title="Turn the raw draft into finished prose in your voice, as edits you review one by one. About two thousand words a turn; /rewrite next continues."
            >
              /rewrite
            </button>
            <button
              className={styles.snapshotChip}
              onClick={() => send('/gaps')}
              disabled={!canChat || streaming || !committedDraft}
              title="Where the argument has gaps, in this chapter and against the rest of the book. Changes nothing."
            >
              /gaps
            </button>
            <button
              className={styles.snapshotChip}
              onClick={() => send('/factcheck')}
              disabled={!canChat || streaming || checkingFacts || !committedDraft}
              title="Check every claim about Stoic figures, texts, dates and doctrines against the corpus. A verdict only stands with the passage it rests on."
            >
              {checkingFacts ? 'checking…' : '/factcheck'}
            </button>
          </div>
          <div className={styles.composer}>
            <textarea
              className={styles.composerInput}
              placeholder='Direct the revision, or type a command: /rewrite, /gaps, /factcheck. “concede that point”, “bring in Marcus on the citadel”, “develop the full draft”…'
              value={input}
              rows={2}
              disabled={!canChat || streaming}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
            />
            <button className={admin.primaryBtn} onClick={() => send()} disabled={!canChat || streaming || !input.trim()}>
              {streaming ? 'Working…' : 'Send'}
            </button>
          </div>
        </div>
        {!fit.stacked && <div className={styles.resizer} onPointerDown={e => startResize('convo', e)} />}

        {/* ── Draft ── */}
        <div className={styles.draftCol} ref={draftColRef}>
          {!fullscreen && (
            <DraftWorkspace
              {...workspaceProps}
              fullscreen={false}
              pane={paneWide}
              onToggleFullscreen={() => setFullscreen(true)}
            />
          )}
        </div>
        <div
          className={`${styles.resizer} ${fit.sourcesOpen ? '' : styles.resizerOff}`}
          onPointerDown={e => fit.sourcesOpen && startResize('sources', e)}
          hidden={fit.stacked}
        />

        {/* ── Sources ── */}
        {fit.sourcesOpen ? (
          <div className={`${styles.pane} ${styles.sourcePane}`}>
            <div className={styles.paneHead}>
              Sources · this turn
              <button className={styles.railBtn} onClick={() => setLayout(l => ({ ...l, sourcesOpen: false }))} title="Hide the sources">›</button>
            </div>
            <div className={styles.paneBody}>
              <SourceList
                sources={latestSources}
                draftText={draftShown}
                highlight={highlight}
                onHighlight={h => { setHighlight(h); if (h) setRightTab('draft') }}
                emptyNote="Corpus, log, and Cabinet passages Scribe retrieves each turn land here."
              />
            </div>
          </div>
        ) : fit.stacked ? null : (
          <button
            className={styles.rail}
            onClick={() => setLayout(l => ({ ...l, sourcesOpen: true, lastOpened: 'sources' }))}
            title="Show the sources"
          >
            <span>Sources ({latestSources.length})</span>
          </button>
        )}
      </div>
    </div>
  )
}
