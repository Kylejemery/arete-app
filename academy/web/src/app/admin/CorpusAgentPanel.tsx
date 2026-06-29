'use client'

import { useEffect, useState, useCallback } from 'react'
import styles from './admin.module.css'

export type Health = 'loading' | 'ok' | 'warn' | 'error' | 'idle'

type Run = {
  id: string
  run_started_at: string
  run_completed_at: string | null
  sources_processed: number
  sources_succeeded: number
  sources_failed: number
  total_chunks_added: number
  status: string
  coverage_report: Record<string, number> | null
}

type QueueItem = {
  author: string
  work: string
  language: string
  status: string
  priority: number
  error_message: string | null
  chunks_ingested: number | null
}

type CorpusData = {
  lastRun: Run | null
  runs: Run[]
  queue: {
    counts: Record<string, number>
    total: number
    nextPending: QueueItem[]
    failed: QueueItem[]
  }
  coverage: Record<string, number> | null
}

function computeHealth(d: CorpusData): Health {
  const r = d.lastRun
  if (!r) return 'idle'
  if (r.status === 'failed') return 'error'
  if (r.status === 'running') return 'ok'
  if (r.run_completed_at) {
    const ageH = (Date.now() - new Date(r.run_completed_at).getTime()) / 3.6e6
    if (ageH > 30) return 'warn' // nightly cron should have run by now
  }
  if ((d.queue.counts.failed ?? 0) > 0) return 'warn'
  return 'ok'
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6)
  if (h < 1) return `${Math.max(1, Math.floor(diff / 6e4))}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const STATUS_PILL: Record<string, string> = {
  completed: styles.pillOk,
  running: styles.pillRunning,
  failed: styles.pillFailed,
}

export default function CorpusAgentPanel({ onHealth }: { onHealth?: (h: Health) => void }) {
  const [data, setData] = useState<CorpusData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/agents/corpus', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load corpus status')
      setData(json)
      onHealth?.(computeHealth(json))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      onHealth?.('error')
    }
    setLoading(false)
  }, [onHealth])

  useEffect(() => { load() }, [load])

  const runNow = useCallback(async () => {
    setRunning(true)
    setRunMsg('')
    try {
      const res = await fetch('/api/admin/corpus-agent/run', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start the agent')
      setRunMsg('✓ Ingestion started on Railway — it drains the queue and logs a run here. Refresh in a minute or two.')
      // Give Railway a moment to spin up + create the run row, then refresh.
      setTimeout(() => load(), 10000)
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : 'Failed to start the agent')
    }
    setRunning(false)
  }, [load])

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Loading RAG corpus status…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>RAG Corpus agent</h1>
          <p>Nightly ingestion into the rag_corpus table.</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Couldn&apos;t load status</div>
          <p className={styles.errText}>{error}</p>
          <p className={styles.muted} style={{ marginTop: 8 }}>
            If this says the admin client isn&apos;t configured, add
            {' '}<code>SUPABASE_SERVICE_ROLE_KEY</code> to Vercel and redeploy.
          </p>
          <div className={styles.actions}>
            <button className={styles.ghostBtn} onClick={load}>↺ Retry</button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { lastRun, runs, queue, coverage } = data
  const coverageEntries = Object.entries(coverage ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
  const coverageMax = coverageEntries.length ? coverageEntries[0][1] : 1
  const totalChunks = Object.values(coverage ?? {}).reduce((s, n) => s + n, 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>RAG Corpus agent</h1>
            <p>Nightly autonomous ingestion into the rag_corpus table.</p>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={runNow}
            disabled={running}
            style={{ flexShrink: 0 }}
            title="Trigger the nightly ingestion agent now (drains the queue)"
          >
            {running ? 'Starting…' : '▶ Run ingestion now'}
          </button>
        </div>
        {runMsg && <p className={styles.muted} style={{ marginTop: 8 }}>{runMsg}</p>}
      </div>

      {/* Last run */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Last run</span>
          {lastRun && (
            <span className={`${styles.pill} ${STATUS_PILL[lastRun.status] || ''}`}>
              {lastRun.status}
            </span>
          )}
        </div>
        {lastRun ? (
          <>
            <p className={styles.muted} style={{ marginBottom: 14 }}>
              {lastRun.status === 'running'
                ? `Started ${timeAgo(lastRun.run_started_at)}`
                : `Finished ${timeAgo(lastRun.run_completed_at)}`}
            </p>
            <div className={styles.statGrid}>
              <div className={styles.stat}>
                <div className={styles.statValue}>{lastRun.sources_processed}</div>
                <div className={styles.statLabel}>Processed</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{lastRun.sources_succeeded}</div>
                <div className={styles.statLabel}>Succeeded</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{lastRun.sources_failed}</div>
                <div className={styles.statLabel}>Failed</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{lastRun.total_chunks_added}</div>
                <div className={styles.statLabel}>Chunks added</div>
              </div>
            </div>
          </>
        ) : (
          <p className={styles.muted}>No runs yet. The agent logs a row here on its first nightly run.</p>
        )}
      </div>

      {/* Queue */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Source queue</div>
        <div className={styles.countRow}>
          {(['pending', 'processing', 'done', 'failed', 'skipped'] as const).map(k => (
            <span key={k} className={styles.count}>
              <span className={styles.countNum}>{queue.counts[k] ?? 0}</span> {k}
            </span>
          ))}
        </div>

        {queue.nextPending.length > 0 && (
          <>
            <div className={styles.sectionLabel}>Next up</div>
            {queue.nextPending.map((q, i) => (
              <div key={i} className={styles.rowItem}>
                <span>{q.author} — {q.work} <span className={styles.muted}>({q.language})</span></span>
                <span className={styles.muted}>p{q.priority}</span>
              </div>
            ))}
          </>
        )}

        {queue.failed.length > 0 && (
          <>
            <div className={styles.sectionLabel} style={{ marginTop: 16 }}>Failed</div>
            {queue.failed.map((q, i) => (
              <div key={i} className={styles.rowItem}>
                <span>{q.author} — {q.work}</span>
                <span className={styles.errText}>{q.error_message || 'error'}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Coverage */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Coverage</span>
          <span className={styles.muted}>{totalChunks.toLocaleString()} chunks</span>
        </div>
        {coverageEntries.length ? (
          coverageEntries.map(([author, n]) => (
            <div key={author} className={styles.barRow}>
              <span className={styles.barLabel} title={author}>{author}</span>
              <span className={styles.barTrack}>
                <span className={styles.barFill} style={{ width: `${(n / coverageMax) * 100}%` }} />
              </span>
              <span className={styles.barValue}>{n}</span>
            </div>
          ))
        ) : (
          <p className={styles.muted}>No coverage snapshot yet.</p>
        )}
      </div>

      {/* Run history */}
      {runs.length > 1 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Recent runs</div>
          {runs.map(r => (
            <div key={r.id} className={styles.rowItem}>
              <span>{timeAgo(r.run_completed_at || r.run_started_at)}</span>
              <span className={styles.muted}>
                {r.sources_succeeded}✓ / {r.sources_failed}✗ · {r.total_chunks_added} chunks
              </span>
              <span className={`${styles.pill} ${STATUS_PILL[r.status] || ''}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.ghostBtn} onClick={load}>↺ Refresh</button>
      </div>
    </div>
  )
}
