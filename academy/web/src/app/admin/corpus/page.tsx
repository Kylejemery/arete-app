'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useDictation } from '@/lib/useDictation'
import styles from '../admin.module.css'

type Mode = 'summary' | 'verbatim'
type Status = 'idle' | 'summarizing' | 'ready' | 'ingesting' | 'done' | 'error'
type Coverage = { totalChunks: number; authors: { author: string; chunks: number }[] }
type IngestResult = {
  chunksCreated: number
  wordCount: number
  author: string
  work: string
  authorChunkCount: number
}

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

const DRAFT_KEY = 'corpus-ingest:draft'

type Draft = {
  inputText: string
  author: string
  work: string
  section: string
  pages: string
  language: 'en' | 'grc' | 'lat'
  courseRelevance: string
  difficulty: string
  mode: Mode
  savedAt: number
}

// Recognition locales. Greek and Latin have no dictation engine, so those fall
// back to English — dictation there is for the translator, not the source.
const DICTATION_LOCALE: Record<'en' | 'grc' | 'lat', string> = {
  en: 'en-US',
  grc: 'en-US',
  lat: 'en-US',
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  return new Date(ts).toLocaleString()
}

export default function CorpusIngestPage() {
  // Same admin gate as the main /admin page.
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  // Form state
  const [inputText, setInputText] = useState('')
  const [author, setAuthor] = useState('')
  const [work, setWork] = useState('')
  const [section, setSection] = useState('')
  const [pages, setPages] = useState('')
  const [language, setLanguage] = useState<'en' | 'grc' | 'lat'>('en')
  const [courseRelevance, setCourseRelevance] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [mode, setMode] = useState<Mode>('summary')
  const [publicDomainConfirmed, setPublicDomainConfirmed] = useState(false)

  // Output state
  const [summaryText, setSummaryText] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<IngestResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [coverage, setCoverage] = useState<Coverage | null>(null)

  // Draft state (saved to the browser so work isn't lost on refresh/navigation)
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)

  // Dictation — read a passage aloud instead of pasting it. Settled phrases are
  // appended to the source text, which then flows through the normal
  // summarize/ingest path unchanged.
  const appendDictated = useCallback((phrase: string) => {
    setInputText(prev => (prev && !/\s$/.test(prev) ? `${prev} ${phrase}` : `${prev}${phrase}`))
  }, [])
  const dictation = useDictation({
    onFinalText: appendDictated,
    lang: DICTATION_LOCALE[language],
  })

  // Verbatim ingestion stores text as authoritative and character-exact, and a
  // misheard word would corrupt it silently. Dictation is summary-mode only.
  const dictationAllowed = mode === 'summary'
  const { listening: dictating, stop: stopDictation } = dictation
  useEffect(() => {
    if (!dictationAllowed && dictating) stopDictation()
  }, [dictationAllowed, dictating, stopDictation])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        setAuthorized(true)
      } else {
        router.push('/')
      }
      setAuthLoading(false)
    })
  }, [router])

  const loadCoverage = useCallback(async () => {
    try {
      const res = await fetch('/api/corpus-ingest/coverage', { cache: 'no-store' })
      if (res.ok) setCoverage(await res.json())
    } catch {
      // coverage is non-critical; ignore
    }
  }, [])

  useEffect(() => {
    if (authorized) loadCoverage()
  }, [authorized, loadCoverage])

  // Deep-link from "Manage Works → + Add chapter": prefill Author/Work (and an
  // optional starting Section) so a new passage appends to an existing work.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const a = q.get('author'), w = q.get('work'), s = q.get('section')
      if (a) setAuthor(a)
      if (w) setWork(w)
      if (s) setSection(s)
    } catch {
      // ignore
    }
  }, [])

  // On load, surface any draft saved in this browser so it can be restored.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Draft
      if (d && (d.inputText || d.author || d.work)) setSavedDraft(d)
    } catch {
      // ignore malformed/unavailable storage
    }
  }, [])

  const saveDraft = useCallback(() => {
    const d: Draft = {
      inputText, author, work, section, pages, language, courseRelevance, difficulty, mode,
      savedAt: Date.now(),
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
      setDraftSavedAt(d.savedAt)
      setSavedDraft(null) // current form now matches the saved draft
    } catch {
      // ignore quota/availability errors
    }
  }, [inputText, author, work, section, pages, language, courseRelevance, difficulty, mode])

  function restoreDraft() {
    if (!savedDraft) return
    setInputText(savedDraft.inputText)
    setAuthor(savedDraft.author)
    setWork(savedDraft.work)
    setSection(savedDraft.section)
    setPages(savedDraft.pages)
    setLanguage(savedDraft.language)
    setCourseRelevance(savedDraft.courseRelevance)
    setDifficulty(savedDraft.difficulty)
    setMode(savedDraft.mode)
    setSavedDraft(null)
  }

  const canStart = author.trim() && work.trim() && inputText.trim().length > 0

  // Summarize (streaming) for summary mode; for verbatim, just move text across.
  async function handleStart() {
    setErrorMessage(null)
    setResult(null)

    if (mode === 'verbatim') {
      setSummaryText(inputText)
      setStatus('ready')
      return
    }

    setStatus('summarizing')
    setSummaryText('')
    try {
      const response = await fetch('/api/corpus-ingest/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, author, work, section, language, courseRelevance, difficulty }),
      })
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Summarization failed')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      // Stream the summary in word by word as it's generated.
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setSummaryText(accumulated)
      }
      setStatus('ready')
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Summarization failed')
      setStatus('error')
    }
  }

  async function handleIngest() {
    setStatus('ingesting')
    setErrorMessage(null)
    try {
      const response = await fetch('/api/corpus-ingest/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: summaryText,
          // The original pasted passage — stored admin-only as the source of
          // record (never shelved in the Reading Room). For verbatim it equals
          // the summary; for summary mode it's the un-summarized source.
          sourceText: inputText,
          mode,
          publicDomainConfirmed,
          author,
          work,
          section,
          pages,
          language,
          courseRelevance,
          difficulty,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setResult(data)
        setStatus('done')
        loadCoverage()
      } else {
        setErrorMessage(data.error || 'Ingestion failed')
        setStatus('error')
      }
    } catch {
      setErrorMessage('Network error — please try again')
      setStatus('error')
    }
  }

  function resetAll() {
    setInputText('')
    setAuthor('')
    setWork('')
    setSection('')
    setPages('')
    setCourseRelevance('')
    setDifficulty('')
    setMode('summary')
    setPublicDomainConfirmed(false)
    setSummaryText('')
    setResult(null)
    setErrorMessage(null)
    setStatus('idle')
    // Clear the saved draft once a passage has been ingested.
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    setSavedDraft(null)
    setDraftSavedAt(null)
  }

  if (authLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Checking access…</p>
      </div>
    )
  }
  if (!authorized) return null

  const verbatimBlocked = mode === 'verbatim' && !publicDomainConfirmed

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Corpus passage ingestion</h1>
        <p>Paste a passage, review the agent&apos;s summary, then approve it into the RAG corpus.</p>
        <p style={{ marginTop: 4 }}>
          <a href="/admin/corpus/works" className={styles.ghostBtn} style={{ display: 'inline-block' }}>
            📚 Manage works — edit, append chapters, or remove
          </a>
        </p>
      </div>

      <div className={styles.corpusGrid}>
        {/* ── Left: source text ────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.sectionLabel}>Source text</div>

          {savedDraft && (
            <div className={styles.draftNote}>
              <span>📝 Draft saved {timeAgo(savedDraft.savedAt)}{savedDraft.work ? ` — “${savedDraft.work}”` : ''}.</span>
              <button type="button" className={styles.ghostBtn} onClick={restoreDraft}>Restore</button>
              <button type="button" className={styles.ghostBtn} onClick={() => setSavedDraft(null)}>Dismiss</button>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Author *</label>
            <input className={styles.textInput} value={author} onChange={e => setAuthor(e.target.value)} placeholder="Pierre Hadot" />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Work *</label>
            <input className={styles.textInput} value={work} onChange={e => setWork(e.target.value)} placeholder="Philosophy as a Way of Life" />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Section / Chapter</label>
              <input className={styles.textInput} value={section} onChange={e => setSection(e.target.value)} placeholder="Chapter 3 — Spiritual Exercises" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Page(s)</label>
              <input className={styles.textInput} value={pages} onChange={e => setPages(e.target.value)} placeholder="pp. 81–84" />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Language</label>
              <select className={styles.textInput} value={language} onChange={e => setLanguage(e.target.value as 'en' | 'grc' | 'lat')}>
                <option value="en">English</option>
                <option value="grc">Ancient Greek</option>
                <option value="lat">Latin</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Difficulty</label>
              <select className={styles.textInput} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="">—</option>
                <option value="Introductory">Introductory</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Course relevance</label>
            <input className={styles.textInput} value={courseRelevance} onChange={e => setCourseRelevance(e.target.value)} placeholder="PHIL 701" />
          </div>

          <div className={styles.sectionLabel} style={{ marginTop: '1rem' }}>Ingestion mode</div>
          <label className={styles.modeOption}>
            <input type="radio" checked={mode === 'summary'} onChange={() => setMode('summary')} />
            <span>
              <strong>Summarize first</strong> <span className={styles.muted}>(recommended)</span>
              <br /><span className={styles.muted}>Agent rewrites in its own words. Use for all modern texts.</span>
            </span>
          </label>
          <label className={styles.modeOption}>
            <input type="radio" checked={mode === 'verbatim'} onChange={() => setMode('verbatim')} />
            <span>
              <strong>Verbatim</strong> <span className={styles.muted}>(public domain only)</span>
              <br /><span className={styles.muted}>Ingests text exactly as pasted. Ancient texts and pre-1928 translations only.</span>
            </span>
          </label>

          {mode === 'verbatim' && (
            <label className={styles.pdCheckbox}>
              <input type="checkbox" checked={publicDomainConfirmed} onChange={e => setPublicDomainConfirmed(e.target.checked)} />
              <span>I confirm this text is in the public domain</span>
            </label>
          )}

          <div className={styles.field} style={{ marginTop: '1rem' }}>
            <div className={styles.dictateRow}>
              <label className={styles.fieldLabel}>
                {dictation.supported ? 'Paste or dictate text *' : 'Paste text *'}
              </label>
              {dictation.supported && (
                <button
                  type="button"
                  className={dictation.listening ? styles.micBtnActive : styles.micBtn}
                  onClick={dictation.toggle}
                  disabled={!dictationAllowed}
                  title={
                    dictationAllowed
                      ? 'Read aloud — your words are added to the text below'
                      : 'Dictation is disabled in verbatim mode (text must match the source exactly)'
                  }
                >
                  {dictation.listening ? '● Stop dictating' : '🎤 Dictate'}
                </button>
              )}
            </div>
            <textarea
              className={styles.bigTextarea}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                dictation.supported && dictationAllowed
                  ? 'Paste the passage here — or click Dictate and read it aloud…'
                  : 'Paste the verbatim passage here…'
              }
            />
            {dictation.listening && (
              <p className={styles.dictateStatus}>
                <span className={styles.micPulse} /> Listening…
                {dictation.interimText && <em> {dictation.interimText}</em>}
              </p>
            )}
            {dictation.error && <p className={styles.dictateError}>{dictation.error}</p>}
            <span className={styles.charCount}>{inputText.length.toLocaleString()} characters</span>
          </div>

          <div className={styles.generateRow} style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className={styles.draftBar}>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={saveDraft}
                disabled={!inputText.trim() && !author.trim() && !work.trim()}
              >
                ⤓ Save draft
              </button>
              {draftSavedAt && (
                <span className={styles.muted}>
                  ✓ Saved {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <button
              className={styles.primaryBtn}
              disabled={!canStart || status === 'summarizing' || status === 'ingesting'}
              onClick={handleStart}
            >
              {status === 'summarizing' ? 'Summarizing…' : mode === 'summary' ? '✦ Summarize' : 'Preview'}
            </button>
          </div>
        </div>

        {/* ── Right: agent output ──────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.sectionLabel}>Agent output</div>

          {status === 'idle' && (
            <p className={styles.placeholder}>
              Paste text and click {mode === 'summary' ? 'Summarize' : 'Preview'} to see the output here.
              The summary appears word by word as it&apos;s generated. Review it before ingesting.
            </p>
          )}

          {(status === 'summarizing' || status === 'ready' || status === 'ingesting') && (
            <>
              <textarea
                className={styles.summaryArea}
                value={summaryText}
                onChange={e => setSummaryText(e.target.value)}
                readOnly={status === 'summarizing' || status === 'ingesting'}
                placeholder="Summary will appear here…"
              />
              <div className={styles.summaryFooter}>
                <span className={styles.charCount}>{countWords(summaryText)} words</span>
                {status === 'summarizing' && <span className={styles.muted}>generating…</span>}
              </div>

              {status === 'ready' && (
                <>
                  {!courseRelevance.trim() && (
                    <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8a6d1e', background: '#FBF6EC', border: '1px solid #E8DFC8', borderRadius: 8, padding: '8px 12px' }}>
                      ⚠ No course mapping set — this won&apos;t surface in course-filtered retrieval. Ingestion is not blocked.
                    </p>
                  )}
                  <div className={styles.actions}>
                    <button className={styles.ghostBtn} onClick={() => { setSummaryText(''); setStatus('idle') }}>✗ Discard</button>
                    <button className={styles.scheduleBtn} onClick={handleIngest} disabled={verbatimBlocked || summaryText.trim().length < 50}>
                      ✓ Ingest {mode === 'summary' ? 'summary' : 'text'}
                    </button>
                  </div>
                  <p className={styles.muted} style={{ marginTop: 8 }}>
                    {verbatimBlocked
                      ? 'Confirm public domain to enable ingestion.'
                      : 'You can edit the text above before ingesting.'}
                  </p>
                </>
              )}
              {status === 'ingesting' && <p className={styles.muted} style={{ marginTop: 12 }}>Ingesting…</p>}
            </>
          )}

          {status === 'done' && result && (
            <div className={styles.successBanner}>
              <strong>✓ Ingested successfully</strong>
              <div className={styles.resultLine}>Chunks created: <b>{result.chunksCreated}</b></div>
              <div className={styles.resultLine}>Words ingested: <b>{result.wordCount}</b></div>
              <div className={styles.resultLine}>{result.author} — now <b>{result.authorChunkCount}</b> chunks in corpus</div>
              <div className={styles.actions} style={{ marginTop: 12 }}>
                <button className={styles.primaryBtn} onClick={resetAll}>Ingest another passage</button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className={styles.errorBanner}>
              <strong>Something went wrong</strong>
              <div className={styles.resultLine}>{errorMessage}</div>
              <div className={styles.actions} style={{ marginTop: 12 }}>
                <button className={styles.ghostBtn} onClick={() => setStatus(summaryText ? 'ready' : 'idle')}>Try again</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Current corpus ───────────────────────────────── */}
      {coverage && (
        <div className={styles.card} style={{ marginTop: '1.5rem' }}>
          <div className={styles.cardTitleRow}>
            <span className={styles.cardTitle}>Current corpus</span>
            <span className={styles.muted}>{coverage.totalChunks.toLocaleString()} chunks</span>
          </div>
          {coverage.authors.map(a => (
            <div key={a.author} className={styles.rowItem}>
              <span>{a.author}</span>
              <span className={styles.muted}>{a.chunks}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
