'use client'

// Scribe chat mode — the conversation IS the product. Kyle pastes a journal
// fragment; Scribe develops it against the corpus turn by turn; every turn
// re-retrieves live and the whole thread persists. Sibling of the pipeline
// at /admin/scribe; export is copy-out only — the hand-retype gate stays.

import { useCallback, useEffect, useRef, useState } from 'react'
import admin from '../../admin.module.css'
import styles from './chat.module.css'

type Entry = { id: string; title: string | null; raw_text: string; created_at: string; updated_at: string }
type Source = {
  chunk_id: string
  author: string
  work: string
  section_label: string | null
  translator: string | null
  mode: 'quote' | 'paraphrase'
  similarity: number
  query: string
}
type Message = { id: string; role: 'user' | 'scribe'; content: string; sources_used: Source[] | null; created_at: string }
type Draft = { id: string; stage: 'middle' | 'full'; draft_text: string; sources_used: Source[] | null; created_at: string }

function extractDraft(text: string): string | null {
  const m = text.match(/<draft>([\s\S]*?)<\/draft>/)
  return m ? m[1].trim() : null
}

// Chat-bubble text: commentary only — the draft lives in its own pane.
function commentaryOf(text: string): string {
  const out = text
    .replace(/<snapshot stage="(?:middle|full)"\s*\/>/g, '')
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

  // Composer + draft pane
  const [input, setInput] = useState('')
  const [viewedDraftId, setViewedDraftId] = useState<string | null>(null) // null = working draft
  const [snapshotting, setSnapshotting] = useState(false)

  const threadRef = useRef<HTMLDivElement>(null)

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load entry')
    }
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])
  useEffect(() => { if (selectedId) loadEntry(selectedId) }, [selectedId, loadEntry])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages, streamText])

  // Run one Scribe turn (message === undefined → opening turn / retry).
  const runTurn = useCallback(async (entryId: string, message?: string) => {
    setStreaming(true)
    setStreamText('')
    setSearchingQuery('')
    setLiveSources([])
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
          } else if (ev.t === 'error') {
            throw new Error(ev.v as string)
          } else if (ev.t === 'done') {
            const v = ev.v as { snapshot: { stage: string } | null }
            if (v.snapshot) showToast(`Saved a ${v.snapshot.stage} draft snapshot`)
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

  // Working draft: latest scribe message containing <draft>, unless a snapshot
  // is being viewed; while streaming, the partial draft streams in live.
  const lastScribeDraft = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== 'scribe') continue
      const d = extractDraft(messages[i].content)
      if (d) return d
    }
    return null
  })()
  const streamingDraft = streaming ? partialDraft(streamText) : null
  const viewedSnapshot = viewedDraftId ? drafts.find(d => d.id === viewedDraftId) : null
  const draftShown = viewedSnapshot?.draft_text ?? streamingDraft ?? lastScribeDraft

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
    if (!selectedId || !lastScribeDraft) return
    setSnapshotting(true)
    try {
      const res = await fetch(`/api/admin/scribe/entries/${selectedId}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, draft_text: lastScribeDraft, sources_used: latestSources.length ? latestSources : null }),
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

  async function exportDraft() {
    if (!draftShown) return
    const title = entry?.title ? `# ${entry.title}\n\n` : ''
    await navigator.clipboard.writeText(`${title}${draftShown}`)
    showToast('Draft copied — retype by hand before publishing')
  }

  const canChat = selectedId && messages.length > 0
  const needsOpening = canChat && !streaming && messages[messages.length - 1].role === 'user'

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
              {messages.map(m => (
                <div key={m.id} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgScribe}`}>
                  <div className={styles.msgRole}>{m.role === 'user' ? 'Kyle' : 'Scribe'}</div>
                  {m.role === 'scribe' ? commentaryOf(m.content) : m.content}
                </div>
              ))}
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
          <div className={`${styles.pane} ${styles.draftPane}`}>
            <div className={styles.paneHead}>
              {viewedSnapshot
                ? `Snapshot · ${viewedSnapshot.stage} · ${new Date(viewedSnapshot.created_at).toLocaleString()}`
                : 'Working draft'}
              <button className={admin.ghostBtn} onClick={exportDraft} disabled={!draftShown}>
                Export
              </button>
            </div>
            <div className={styles.paneBody}>
              {draftShown
                ? <div className={styles.draftText}>{draftShown}</div>
                : <p className={styles.draftEmpty}>The working draft appears here as Scribe writes.</p>}
            </div>
            <div className={styles.draftActions}>
              <button className={styles.snapshotChip} onClick={() => snapshot('middle')} disabled={snapshotting || !lastScribeDraft || streaming}>
                Save as middle
              </button>
              <button className={styles.snapshotChip} onClick={() => snapshot('full')} disabled={snapshotting || !lastScribeDraft || streaming}>
                Save as full
              </button>
              {drafts.length > 0 && (
                <>
                  <span className={styles.sourceLoc} style={{ fontSize: 11 }}>Snapshots:</span>
                  <button
                    className={`${styles.snapshotChip} ${viewedDraftId === null ? styles.snapshotChipOn : ''}`}
                    onClick={() => setViewedDraftId(null)}
                  >
                    working
                  </button>
                  {drafts.map((d, i) => (
                    <button
                      key={d.id}
                      className={`${styles.snapshotChip} ${viewedDraftId === d.id ? styles.snapshotChipOn : ''}`}
                      onClick={() => setViewedDraftId(d.id)}
                      title={new Date(d.created_at).toLocaleString()}
                    >
                      {i + 1} · {d.stage}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className={`${styles.pane} ${styles.sourcePane}`}>
            <div className={styles.paneHead}>Sources · this turn</div>
            <div className={styles.paneBody}>
              {latestSources.length === 0 && (
                <p className={styles.draftEmpty}>Corpus passages Scribe retrieves each turn land here.</p>
              )}
              {latestSources.map(s => (
                <div key={s.chunk_id} className={styles.sourceItem}>
                  <span className={`${styles.sourceMode} ${s.mode === 'quote' ? styles.modeQuote : styles.modeParaphrase}`}>
                    {s.mode === 'quote' ? 'QUOTE' : 'PARAPHRASE'}
                  </span>
                  <strong>{s.author}</strong>{' '}
                  <span className={styles.sourceLoc}>
                    — {[s.work, s.section_label].filter(Boolean).join(' ')}
                    {s.translator ? `, trans. ${s.translator}` : ''}
                  </span>
                  <div className={styles.sourceQuery}>for: “{s.query}”</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
