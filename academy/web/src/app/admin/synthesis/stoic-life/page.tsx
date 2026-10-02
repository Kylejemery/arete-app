'use client'

// /admin/synthesis/stoic-life — review for the Synthesis Agent's Stoic Life
// mode (server/synthesis/modes/stoic-life.js). Topics first: approve, reject,
// or retitle each proposal. Then the one draft in review: read the Markdown
// the corpus would load, edit it, approve or reject. Approved drafts wait for
// academy/corpus-ingestion/export-synthesis-drafts.js, which writes them into
// the repo for a PR; nothing reaches the corpus before that file is merged.

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import styles from '../../admin.module.css'

type Topic = {
  id: string
  title: string
  original_title: string | null
  status: 'proposed' | 'approved' | 'rejected' | 'drafting' | 'drafted'
  source: 'seed' | 'corpus_gap' | 'primary_text' | 'follow_on' | 'journal_theme'
  rationale: string
  evidence: Record<string, unknown>
  world_context: string | null
  review_notes: string | null
  last_error: string | null
  approved_at: string | null
  reviewed_at: string | null
  drafted_at: string | null
  created_at: string
}

type CitationCheck = { heading: string; supported: boolean; problem: string }
type PoliticalCheck = { flagged: boolean; items: string[]; error?: string }

type Draft = {
  id: string
  topic_id: string | null
  doc_key: string
  version: number
  title: string
  markdown: string
  word_count: number | null
  status: 'pending_review' | 'edited' | 'approved' | 'rejected' | 'exported' | 'ingested'
  checks: { citations?: CitationCheck[]; downgraded?: string[]; political?: PoliticalCheck; political_first_pass?: PoliticalCheck }
  follow_ons: { title: string; rationale: string }[]
  world_observation_id: string | null
  review_notes: string | null
  reviewed_at: string | null
  exported_at: string | null
  export_file_path: string | null
  ingested_at: string | null
  created_at: string
}

type World = {
  latestApproved: { observation_week: string; dominant_signal: string | null } | null
  pendingReview: number
}

const SOURCE_LABEL: Record<Topic['source'], string> = {
  seed: 'seed',
  corpus_gap: 'corpus gap',
  primary_text: 'primary text',
  follow_on: 'follow-on',
  journal_theme: 'journal theme',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(`${isoDate}T00:00:00Z`).getTime()) / 86400000)
}

const small = { height: 30, padding: '0 12px', fontSize: 12 }

export default function StoicLifePage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [world, setWorld] = useState<World | null>(null)
  const [maxAge, setMaxAge] = useState(21)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [showRejected, setShowRejected] = useState(false)
  const [showDone, setShowDone] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/synthesis/stoic-life', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setTopics(json.topics || [])
      setDrafts(json.drafts || [])
      setWorld(json.world || null)
      if (json.config?.world_observation_max_age_days) setMaxAge(json.config.world_observation_max_age_days)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function cycleNote(cycle: { started: boolean; message: string } | null | undefined): string {
    if (!cycle) return ''
    return cycle.started ? ' The agent is working; refresh in a minute or two.' : ` The agent did not start: ${cycle.message}`
  }

  async function reviewTopic(t: Topic, action: 'approve' | 'reject') {
    setBusy(t.id)
    try {
      const res = await fetch(`/api/admin/synthesis/stoic-life/topics/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, title: titles[t.id] ?? t.title }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      showToast(`${action === 'approve' ? 'Approved' : 'Rejected'}.${cycleNote(json.cycle)}`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Update failed')
    }
    setBusy(null)
  }

  async function patchDraft(d: Draft, body: Record<string, unknown>, done: string) {
    setBusy(d.id)
    try {
      const res = await fetch(`/api/admin/synthesis/stoic-life/drafts/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_notes: notes[d.id] ?? d.review_notes ?? '', ...body }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      showToast(`${done}${cycleNote(json.cycle)}`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Update failed')
    }
    setBusy(null)
  }

  async function runNow() {
    setBusy('run')
    try {
      const res = await fetch('/api/admin/synthesis/stoic-life/run', { method: 'POST' })
      const json = await res.json()
      showToast(json.started ? `${json.message}. Refresh in a minute or two.` : `Did not start: ${json.message}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Did not start')
    }
    setBusy(null)
  }

  const inReview = drafts.filter(d => d.status === 'pending_review' || d.status === 'edited')
  const proposed = topics.filter(t => t.status === 'proposed')
  const queued = topics.filter(t => t.status === 'approved' || t.status === 'drafting')
  const rejectedTopics = topics.filter(t => t.status === 'rejected')
  const awaitingExport = drafts.filter(d => d.status === 'approved')
  const done = drafts.filter(d => d.status === 'exported' || d.status === 'ingested' || d.status === 'rejected')
  const topicTitle = (id: string | null) => topics.find(t => t.id === id)?.title ?? '—'

  const latest = world?.latestApproved
  const worldUsable = latest && daysSince(latest.observation_week) <= maxAge

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Stoic Life</h1>
        <p>
          The Synthesis Agent&apos;s pieces on how to live a Stoic life. You approve every topic before it is drafted and every
          draft before it is exported. One draft is in review at a time. <Link href="/admin/synthesis">← Synthesis agent</Link>
        </p>
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {/* ── Status ─────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Status</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.primaryBtn} style={small} disabled={busy === 'run'} onClick={runNow}>
              {busy === 'run' ? 'Starting…' : '✦ Run now'}
            </button>
            <button className={styles.ghostBtn} style={small} onClick={load}>↺ Refresh</button>
          </div>
        </div>
        <div className={styles.gapMeta}>
          {inReview.length} draft in review · {queued.length} approved topics waiting · {proposed.length} proposals to review
          <br />
          World context:{' '}
          {worldUsable
            ? <>drafts use your approved observation of {latest!.observation_week}.</>
            : latest
              ? <>your newest approved observation ({latest.observation_week}) is older than {maxAge} days, so drafts are written without a present-day angle.</>
              : <>no approved observation, so drafts are written without a present-day angle.</>}
          {world && world.pendingReview > 0 && (
            <> {world.pendingReview} observation{world.pendingReview === 1 ? '' : 's'} wait in <Link href="/admin/world">World</Link>.</>
          )}
        </div>
        {loading && <p className={styles.muted}>Loading…</p>}
      </div>

      {/* ── Draft in review ────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Draft in review</div>
        {inReview.length === 0 ? (
          <p className={styles.muted}>
            No draft is waiting. The agent drafts the oldest approved topic as soon as one is waiting.
          </p>
        ) : inReview.map(d => {
          const political = d.checks?.political
          const downgraded = d.checks?.downgraded ?? []
          return (
            <div key={d.id} className={styles.gapRow}>
              <div className={styles.gapRowMain}>
                <span className={`${styles.pill} ${d.status === 'edited' ? styles.pillRunning : styles.pillFailed}`}>
                  {d.status === 'edited' ? 'edited' : 'pending'}
                </span>
                <span className={styles.gapTitle}>{d.title}</span>
              </div>
              <div className={styles.gapMeta}>
                Topic: {topicTitle(d.topic_id)} · {d.doc_key}.v{d.version}.md · {d.word_count ?? '—'} words · drafted {fmtDate(d.created_at)}
                {d.world_observation_id ? ' · used an approved world observation' : ' · no world context'}
              </div>

              {political?.flagged && (
                <div className={styles.errText} style={{ margin: '8px 0' }}>
                  Political check: {political.items.length
                    ? <>references not in the approved observation: {political.items.join('; ')}</>
                    : <>the check could not read its own verdict ({political.error || 'unknown'}). Read the present-day sections closely.</>}
                </div>
              )}
              {d.checks?.political_first_pass?.flagged && !political?.flagged && (
                <div className={styles.muted} style={{ margin: '8px 0' }}>
                  The first version named {d.checks.political_first_pass.items.join('; ') || 'unreviewed political content'}; this version was written without it.
                </div>
              )}
              {downgraded.length > 0 && (
                <div className={styles.muted} style={{ margin: '8px 0' }}>
                  Marked unverified (the citation check could not support them): {downgraded.join('; ')}.
                  {(d.checks?.citations ?? []).filter(c => !c.supported && c.problem).map(c => (
                    <div key={c.heading}>· {c.heading}: {c.problem}</div>
                  ))}
                </div>
              )}

              <div className={styles.sectionLabel}>The file the corpus would load</div>
              <textarea
                className={styles.summaryArea}
                style={{ minHeight: 420, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                value={edits[d.id] ?? d.markdown}
                onChange={e => setEdits(prev => ({ ...prev, [d.id]: e.target.value }))}
              />

              {d.follow_ons?.length > 0 && (
                <>
                  <div className={styles.sectionLabel} style={{ marginTop: 12 }}>Follow-on topics it proposes (offered as proposals once you approve the draft)</div>
                  {d.follow_ons.map(f => (
                    <div key={f.title} className={styles.gapMeta}><strong>{f.title}</strong>: {f.rationale}</div>
                  ))}
                </>
              )}

              <div className={styles.sectionLabel} style={{ marginTop: 12 }}>Notes</div>
              <textarea
                className={styles.summaryArea}
                style={{ minHeight: 60 }}
                placeholder="Optional review notes…"
                value={notes[d.id] ?? d.review_notes ?? ''}
                onChange={e => setNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
              />
              <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  className={styles.scheduleBtn}
                  disabled={busy === d.id || (edits[d.id] !== undefined && edits[d.id] !== d.markdown)}
                  title={edits[d.id] !== undefined && edits[d.id] !== d.markdown ? 'Save your edits first' : undefined}
                  onClick={() => patchDraft(d, { status: 'approved' }, 'Approved. It will be exported with the next export run.')}
                >
                  ✓ Approve
                </button>
                <button
                  className={styles.ghostBtn}
                  disabled={busy === d.id || edits[d.id] === undefined || edits[d.id] === d.markdown}
                  onClick={() => patchDraft(d, { markdown: edits[d.id] }, 'Edits saved. Approve when ready.')}
                >
                  ✎ Save edits
                </button>
                <button
                  className={styles.ghostBtn}
                  style={{ borderColor: '#B23535', color: '#B23535' }}
                  disabled={busy === d.id}
                  onClick={() => patchDraft(d, { status: 'rejected' }, 'Rejected. Its topic is back among the proposals.')}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Proposed topics ────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Proposed topics ({proposed.length})</div>
        {proposed.length === 0 ? (
          <p className={styles.muted}>Nothing to review. The agent proposes topics when fewer than five approved topics are waiting.</p>
        ) : proposed.map(t => (
          <div key={t.id} className={styles.gapRow}>
            <div className={styles.gapRowMain}>
              <span className={styles.pill}>{SOURCE_LABEL[t.source]}</span>
              <input
                className={styles.textInput}
                style={{ flex: 1, minWidth: 0 }}
                value={titles[t.id] ?? t.title}
                onChange={e => setTitles(prev => ({ ...prev, [t.id]: e.target.value }))}
                aria-label="Topic title"
              />
            </div>
            <div className={styles.gapMeta}>
              {t.rationale}
              {t.review_notes && <><br />{t.review_notes}</>}
              {t.world_context && <><br /><span className={styles.muted}>Context: {t.world_context}</span></>}
            </div>
            <div className={styles.gapActions}>
              <button className={styles.scheduleBtn} style={small} disabled={busy === t.id} onClick={() => reviewTopic(t, 'approve')}>
                {(titles[t.id] ?? t.title) !== t.title ? '✓ Approve with new title' : '✓ Approve'}
              </button>
              <button
                className={styles.ghostBtn}
                style={{ ...small, borderColor: '#B23535', color: '#B23535' }}
                disabled={busy === t.id}
                onClick={() => reviewTopic(t, 'reject')}
              >
                ✗ Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Approved, waiting to be drafted ────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Approved topics, in drafting order ({queued.length})</div>
        {queued.length === 0 ? (
          <p className={styles.muted}>None. Approve a proposal above.</p>
        ) : queued.map(t => (
          <div key={t.id} className={styles.rowItem}>
            <span>{t.status === 'drafting' ? '✎ ' : ''}{t.title}</span>
            <span className={styles.muted}>
              {SOURCE_LABEL[t.source]} · approved {fmtDate(t.approved_at)}
              {t.status === 'drafting' ? ' · drafting now' : ''}
              {t.last_error ? ` · last attempt failed: ${t.last_error}` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* ── Approved drafts awaiting export ────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Approved, waiting for export ({awaitingExport.length})</div>
        {awaitingExport.length === 0 ? (
          <p className={styles.muted}>None.</p>
        ) : (
          <>
            <p className={styles.muted}>
              In a Claude session: <code>cd academy/corpus-ingestion &amp;&amp; node export-synthesis-drafts.js</code>, then commit
              the files it writes and open a PR. The nightly corpus agent loads them after merge.
            </p>
            {awaitingExport.map(d => (
              <div key={d.id} className={styles.rowItem}>
                <span>{d.title}</span>
                <span className={styles.muted}>{d.doc_key}.v{d.version}.md · approved {fmtDate(d.reviewed_at)}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── History ────────────────────────────────────────────────── */}
      {(done.length > 0 || rejectedTopics.length > 0) && (
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <span className={styles.cardTitle}>History</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={styles.ghostBtn} style={small} onClick={() => setShowDone(s => !s)}>
                {showDone ? 'Hide drafts ↑' : `Drafts (${done.length}) ↓`}
              </button>
              <button className={styles.ghostBtn} style={small} onClick={() => setShowRejected(s => !s)}>
                {showRejected ? 'Hide rejected topics ↑' : `Rejected topics (${rejectedTopics.length}) ↓`}
              </button>
            </div>
          </div>
          {showDone && done.map(d => (
            <div key={d.id} className={styles.rowItem}>
              <span>{d.title}</span>
              <span className={styles.muted}>
                {d.status === 'ingested' ? `in the corpus since ${fmtDate(d.ingested_at)}`
                  : d.status === 'exported' ? `exported ${fmtDate(d.exported_at)}, waiting for merge and the nightly sync`
                  : `rejected ${fmtDate(d.reviewed_at)}${d.review_notes ? ` · ${d.review_notes}` : ''}`}
              </span>
            </div>
          ))}
          {showRejected && rejectedTopics.map(t => (
            <div key={t.id} className={styles.rowItem}>
              <span>{t.title}</span>
              <span className={styles.muted}>{SOURCE_LABEL[t.source]} · {fmtDate(t.reviewed_at)}</span>
            </div>
          ))}
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
