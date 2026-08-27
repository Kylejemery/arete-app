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
import type { DiffBase, Draft, Entry, Message, Review, Source } from './types'
import { withAttribution } from '@/lib/scribe/attribution'
import { describeScopedTurn } from '@/lib/scribe/scoped-turns'
import type { Highlight } from '@/lib/scribe/prose'

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

// Chat-bubble text: commentary only — the draft lives in its own pane.
function commentaryOf(text: string): string {
  const out = text
    .replace(/<snapshot stage="(?:middle|full|final)"\s*\/>/g, '')
    .replace(/<draft>[\s\S]*?(<\/draft>|$)/, '')
    .trim()
  return out || '(revised the working draft — see the draft pane)'
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
      setViewedDraftId(null)
      setRightTab('draft')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load entry')
    }
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])
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

  async function send() {
    const msg = input.trim()
    if (!msg || !selectedId || streaming) return
    setInput('')
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

  // Every committed draft in thread order, whoever produced it — Scribe's turns
  // and Kyle's hand revisions alike. The last one is the working draft.
  const draftTrail = useMemo(() => {
    const out: { key: string; role: 'user' | 'scribe'; text: string }[] = []
    for (const m of messages) {
      const d = extractDraft(m.content)
      if (d) out.push({ key: m.id, role: m.role, text: d })
    }
    return out
  }, [messages])

  const committedDraft = draftTrail.length ? draftTrail[draftTrail.length - 1].text : null
  const streamingDraft = streaming ? partialDraft(streamText) : null
  const viewedSnapshot = viewedDraftId ? drafts.find(d => d.id === viewedDraftId) ?? null : null
  const draftShown = viewedSnapshot?.draft_text ?? streamingDraft ?? committedDraft

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

  async function exportDraft() {
    if (!draftShown) return
    const title = entry?.title ? `# ${entry.title}\n\n` : ''
    await navigator.clipboard.writeText(withAttribution(`${title}${draftShown}`))
    showToast('Draft copied — retype by hand before publishing')
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
    onSaveToLog: saveToLog,
    onApplyRevision: applyRevision,
    applying,
  }

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
          onToggleFullscreen={() => setFullscreen(false)}
        />
      )}

      <div className={styles.grid}>
        {/* ── Entries ── */}
        <div className={`${styles.pane} ${styles.sidebar}`}>
          <div className={styles.paneHead}>
            Entries
            <button className={admin.ghostBtn} onClick={() => setShowNew(s => !s)}>
              {showNew ? 'Cancel' : 'New entry'}
            </button>
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

        {/* ── Conversation ── */}
        <div className={`${styles.pane} ${styles.convo}`}>
          <div className={styles.paneHead}>Conversation</div>
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
                const scoped = m.role === 'user' ? describeScopedTurn(m.content) : null
                return (
                  <div key={m.id} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgScribe}`}>
                    <div className={styles.msgRole}>{m.role === 'user' ? 'Kyle' : 'Scribe'}</div>
                    {m.role === 'scribe' ? commentaryOf(m.content) : (scoped ?? m.content)}
                  </div>
                )
              })}
              {streaming && (
                <div className={`${styles.msg} ${styles.msgScribe}`}>
                  <div className={styles.msgRole}>Scribe</div>
                  {streamText
                    ? commentaryOf(streamText) + (partialDraft(streamText) !== null ? '\n\n⟨drafting — see the draft pane⟩' : '')
                    : '…'}
                </div>
              )}
              {searchingQuery && (
                <div className={styles.searchNote}>searching the corpus: “{searchingQuery}”</div>
              )}
              {needsOpening && (
                <button className={admin.ghostBtn} onClick={() => runTurn(selectedId!)}>
                  Scribe hasn&apos;t answered this turn — run it
                </button>
              )}
            </div>
          </div>
          <div className={styles.composer}>
            <textarea
              className={styles.composerInput}
              placeholder='Direct the revision — “concede that point”, “make character the moat”, “bring in Marcus on the citadel”, “develop the full draft”…'
              value={input}
              rows={2}
              disabled={!canChat || streaming}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
            />
            <button className={admin.primaryBtn} onClick={send} disabled={!canChat || streaming || !input.trim()}>
              {streaming ? 'Working…' : 'Send'}
            </button>
          </div>
        </div>

        {/* ── Draft + sources ── */}
        <div className={styles.rightCol}>
          {!fullscreen && (
            <DraftWorkspace
              {...workspaceProps}
              fullscreen={false}
              onToggleFullscreen={() => setFullscreen(true)}
            />
          )}

          <div className={`${styles.pane} ${styles.sourcePane}`}>
            <div className={styles.paneHead}>Sources · this turn</div>
            <div className={styles.paneBody}>
              <SourceList
                sources={latestSources}
                draftText={draftShown}
                highlight={highlight}
                onHighlight={h => { setHighlight(h); if (h) setRightTab('draft') }}
                emptyNote="Corpus passages Scribe retrieves each turn land here."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
