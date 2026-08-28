'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'

type Candidate = {
  id: string
  platform: string
  author_handle: string
  permalink: string
  body: string
  parent_context: string | null
  comment_count: number | null
  posted_at: string
  stoic_fit: number | null
  openness: number | null
  already_answered: boolean | null
  doctrine: string | null
  triage_reasoning: string | null
  matched_query: string | null
}

type Draft = {
  id: string
  draft_text: string
  final_text: string | null
  doctrine: string | null
  passage_used: string | null
  model: string | null
  status: string
  created_at: string
  candidate: Candidate | null
}

type RecentApproval = {
  id: string
  final_text: string | null
  posted_at: string | null
  candidate: { platform: string; permalink: string; author_handle: string } | null
}

type QueueData = {
  queue: Draft[]
  approvedToday: Record<string, number>
  dailyCap: number
  pipeline: Record<string, number>
  recent: RecentApproval[]
}

const REJECT_REASONS = ['not_relevant', 'bad_draft', 'wrong_tone', 'too_late', 'unsafe']

export default function StoicRepliesPage() {
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [data, setData] = useState<QueueData | null>(null)
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [runBusy, setRunBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) setAuthorized(true)
      else router.push('/')
      setAuthLoading(false)
    })
  }, [router])

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/stoic-replies', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json)
      setIndex(i => Math.min(i, Math.max(0, (json.queue?.length ?? 1) - 1)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [])

  useEffect(() => {
    if (authorized) load()
  }, [authorized, load])

  const current: Draft | null = data?.queue[index] ?? null

  // Reset the editor whenever the card changes.
  useEffect(() => {
    setText(current ? (current.final_text ?? current.draft_text) : '')
    setRejectReason('')
    setNotice('')
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(action: 'approve' | 'edit' | 'reject') {
    if (!current) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stoic-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: current.id,
          action,
          final_text: text,
          reject_reason: action === 'reject' ? rejectReason : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Failed to ${action}`)
      if (action === 'edit') setNotice('Saved. The draft stays in the queue as edited.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action}`)
    } finally {
      setBusy(false)
    }
  }

  // Approve: copy FIRST and await it — opening the thread steals focus, and an
  // unfocused page is refused clipboard access. Only then open the tab and
  // record the approval. You paste it yourself; the pipeline never posts.
  // Approved text is also kept in the Recently approved list below, so a
  // failed paste is never lost.
  async function approve() {
    if (!current?.candidate) return
    const permalink = current.candidate.permalink
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      setNotice('Clipboard copy failed — use the Copy button in Recently approved below.')
    }
    window.open(permalink, '_blank', 'noopener')
    act('approve')
  }

  async function runPipeline() {
    setRunBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/admin/stoic-replies/run', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start the pipeline')
      setNotice('Pipeline started on the Railway server. Scout, triage, and drafting take a few minutes; refresh to see new drafts.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start the pipeline')
    } finally {
      setRunBusy(false)
    }
  }

  if (authLoading) {
    return <div className={styles.page}><p className={styles.muted}>Checking access…</p></div>
  }
  if (!authorized) return null

  const cand = current?.candidate ?? null
  const platformCount = cand ? (data?.approvedToday[cand.platform] ?? 0) : 0
  const capReached = !!data && !!cand && platformCount >= data.dailyCap
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Stoic reply queue</h1>
        <p>
          Drafted replies to public posts where a Stoic response might genuinely help.
          Nothing posts automatically: Approve copies the text and opens the thread, you paste it yourself.
          Reject reasons are the training signal — after fifty, read them and revise the triage prompt.
        </p>
      </div>

      <div className={styles.card}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
          <span className={styles.sectionLabel} style={{ margin: 0 }}>Today</span>
          {['hn', 'bluesky', 'reddit'].map(p => (
            <span key={p} style={{ fontFamily: 'monospace' }}>
              {p} {data?.approvedToday[p] ?? 0}/{data?.dailyCap ?? 3}
            </span>
          ))}
          <span className={styles.muted} style={{ marginLeft: 'auto' }}>
            pipeline: {data ? Object.entries(data.pipeline).map(([k, v]) => `${k} ${v}`).join(' · ') || 'empty' : '…'}
          </span>
          <button className={styles.ghostBtn} style={{ height: 32 }} onClick={runPipeline} disabled={runBusy}>
            {runBusy ? 'Starting…' : 'Run pipeline now'}
          </button>
        </div>
      </div>

      {error && <div className={styles.card}><p className={styles.errText}>{error}</p></div>}
      {notice && <div className={styles.card}><p className={styles.muted}>{notice}</p></div>}

      {!current ? (
        <div className={styles.card}>
          <p className={styles.muted}>Queue is empty. Run the pipeline, or come back after the next 6-hour cycle.</p>
        </div>
      ) : (
        <>
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span className={styles.sectionLabel} style={{ margin: 0 }}>
                Card {index + 1} of {data?.queue.length} · {cand?.platform} · {cand?.author_handle}
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button className={styles.ghostBtn} style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                  onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}>← Prev</button>
                <button className={styles.ghostBtn} style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                  onClick={() => setIndex(i => Math.min((data?.queue.length ?? 1) - 1, i + 1))}
                  disabled={index >= (data?.queue.length ?? 1) - 1}>Next →</button>
              </span>
            </div>

            {cand && (
              <>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55, marginTop: 12 }}>{cand.body}</p>
                {cand.parent_context && (
                  <p className={styles.muted} style={{ whiteSpace: 'pre-wrap', fontSize: 13, marginTop: 8 }}>
                    In reply to: {cand.parent_context}
                  </p>
                )}
                <p style={{ marginTop: 10, fontSize: 13 }}>
                  <a href={cand.permalink} target="_blank" rel="noreferrer noopener">Open thread ↗</a>
                  <span className={styles.muted}>
                    {' '}· {cand.comment_count ?? 0} comments · posted {new Date(cand.posted_at).toLocaleString()}
                    {cand.matched_query ? ` · matched "${cand.matched_query}"` : ''}
                  </span>
                </p>
                <p style={{ fontSize: 13, marginTop: 10, fontFamily: 'monospace' }}>
                  fit {cand.stoic_fit ?? '–'}/10 · openness {cand.openness ?? '–'}/10 · doctrine {cand.doctrine ?? '–'}
                </p>
                {cand.triage_reasoning && (
                  <p className={styles.muted} style={{ fontSize: 13, marginTop: 4 }}>{cand.triage_reasoning}</p>
                )}
              </>
            )}
          </div>

          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className={styles.sectionLabel} style={{ margin: 0 }}>
                Draft ({current.model ?? 'model unknown'}{current.passage_used ? ` · grounded in ${current.passage_used}` : ''})
              </span>
              <span className={styles.muted} style={{ fontSize: 12 }}>
                {wordCount} words{wordCount > 120 ? ' — over the 120 limit' : ''}
              </span>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={7}
              style={{ width: '100%', marginTop: 10, fontSize: 14, lineHeight: 1.5, padding: 10, boxSizing: 'border-box' }}
            />

            {capReached && (
              <p className={styles.errText} style={{ marginTop: 8 }}>
                Daily ceiling reached for {cand?.platform} ({platformCount}/{data?.dailyCap}). Approval is blocked until tomorrow.
              </p>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className={styles.primaryBtn}
                onClick={approve}
                disabled={busy || capReached || !text.trim()}
              >
                Approve · copy + open thread
              </button>
              <button className={styles.ghostBtn} onClick={() => act('edit')} disabled={busy || !text.trim()}>
                Save edit
              </button>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ height: 32 }}>
                  <option value="">reject reason…</option>
                  {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className={styles.ghostBtn} onClick={() => act('reject')} disabled={busy || !rejectReason}>
                  Reject
                </button>
              </span>
            </div>
          </div>
        </>
      )}

      {(data?.recent?.length ?? 0) > 0 && (
        <div className={styles.card}>
          <span className={styles.sectionLabel} style={{ margin: 0 }}>Recently approved</span>
          {data!.recent.map(r => (
            <div key={r.id} style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid #eee' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12 }}>
                <span className={styles.muted}>
                  {r.candidate?.platform} · {r.candidate?.author_handle} · {r.posted_at ? new Date(r.posted_at).toLocaleString() : ''}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    className={styles.ghostBtn}
                    style={{ height: 26, padding: '0 10px', fontSize: 11 }}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(r.final_text ?? '')
                        setNotice('Copied.')
                      } catch {
                        setNotice('Clipboard unavailable — select the text and copy manually.')
                      }
                    }}
                  >
                    Copy
                  </button>
                  {r.candidate?.permalink && (
                    <a href={r.candidate.permalink} target="_blank" rel="noreferrer noopener" style={{ fontSize: 12 }}>
                      Thread ↗
                    </a>
                  )}
                </span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{r.final_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
