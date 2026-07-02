'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './admin.module.css'

export type Health = 'loading' | 'ok' | 'warn' | 'error' | 'idle'

type Theme = { theme?: string; count?: number; weeksSeen?: number }

type Analysis = {
  id: string
  analysis_week: string
  dominant_theme: string | null
  themes: Theme[] | null
  insight_text: string | null
  weeks_analyzed: number | null
  delivered: boolean
  distress_flagged: boolean
  created_at: string
}

type JournalData = {
  total: number
  thisWeek: number
  delivered: number
  distressPending: number
  currentWeek: string
  lastCreatedAt: string | null
  recent: Analysis[]
}

function computeHealth(d: JournalData): Health {
  if (d.total === 0) return 'idle'
  if (d.distressPending > 0) return 'warn'
  if (d.lastCreatedAt) {
    const ageDays = (Date.now() - new Date(d.lastCreatedAt).getTime()) / 86400000
    if (ageDays > 8) return 'warn' // a weekly run should have happened
  }
  return 'ok'
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3.6e6)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function JournalAgentPanel({ onHealth }: { onHealth?: (h: Health) => void }) {
  const [data, setData] = useState<JournalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/agents/journal', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load journal status')
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
      const res = await fetch('/api/admin/journal-agent/run', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start the agent')
      setRunMsg('✓ Analysis running on the server — one Claude call per active user, so give it a minute or two. Re-running in the same week overwrites that week’s rows.')
      setTimeout(() => load(), 15000)
      setTimeout(() => load(), 60000)
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : 'Failed to start the agent')
    }
    setRunning(false)
  }, [load])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading && !data) {
    return <div className={styles.page}><p className={styles.muted}>Loading journal agent status…</p></div>
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}><h1>Journal Analysis agent</h1><p>Nightly weekly-insight analysis.</p></div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Couldn&apos;t load status</div>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>Journal Analysis agent</h1>
            <p>Nightly cross-source analysis of journals + Cabinet, delivering a weekly insight.</p>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={runNow}
            disabled={running}
            style={{ flexShrink: 0 }}
            title="Analyze all active users now instead of waiting for the nightly cron"
          >
            {running ? 'Starting…' : '▶ Run analysis now'}
          </button>
        </div>
        {runMsg && <p className={styles.muted} style={{ marginTop: 8 }}>{runMsg}</p>}
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Activity</span>
          <span className={styles.muted}>last analysis {timeAgo(data.lastCreatedAt)}</span>
        </div>
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{data.thisWeek}</div>
            <div className={styles.statLabel}>This week</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{data.total}</div>
            <div className={styles.statLabel}>Total</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{data.delivered}</div>
            <div className={styles.statLabel}>Delivered</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{data.distressPending}</div>
            <div className={styles.statLabel}>Distress pending</div>
          </div>
        </div>
        <p className={styles.muted} style={{ marginTop: 10, fontSize: 12 }}>
          &ldquo;Delivered&rdquo; counts insights a user has actually opened in the mobile app
          (GET /api/user/insight marks them on first fetch). Pending insights are generated and
          waiting — they deliver the moment the user views their weekly insight.
        </p>
      </div>

      {data.distressPending > 0 && (
        <div className={styles.card}>
          <p className={styles.errText}>
            {data.distressPending} distress case{data.distressPending !== 1 ? 's' : ''} awaiting review.
          </p>
          <div className={styles.actions}>
            <Link href="/admin/distress" className={styles.fleetLink}>Review queue →</Link>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardTitle}>Recent analyses</div>
        <p className={styles.muted} style={{ marginBottom: 10, fontSize: 12 }}>
          Shown anonymously — no user identities. Expand a row to read the full insight the user
          will see.
        </p>
        {data.recent.length === 0 ? (
          <p className={styles.muted}>No analyses yet. The agent writes one per active user each week.</p>
        ) : (
          data.recent.map(a => {
            const isOpen = expanded.has(a.id)
            const themes = (a.themes || []).map(t => t?.theme).filter(Boolean) as string[]
            return (
              <div key={a.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <span>{a.dominant_theme || <span className={styles.muted}>(no theme)</span>}</span>
                  <span className={styles.muted}>
                    {a.analysis_week}
                    {a.distress_flagged ? ' · ⚠ flagged' : a.delivered ? ' · delivered' : ' · pending'}
                    {' · '}
                    <button
                      onClick={() => toggleExpand(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 12, padding: 0 }}
                    >
                      {isOpen ? 'Hide ↑' : 'Read ↓'}
                    </button>
                  </span>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 8 }}>
                    {themes.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {themes.map(t => (
                          <span key={t} style={{ fontSize: 12, color: '#6b5a1e', background: '#FBF6EC', border: '1px solid #E8DFC8', borderRadius: 999, padding: '2px 10px' }}>{t}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.6, color: '#2a2a2a', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '12px 14px' }}>
                      {a.insight_text || '—'}
                    </div>
                    {a.weeks_analyzed ? (
                      <p className={styles.muted} style={{ marginTop: 6, fontSize: 12 }}>Built on {a.weeks_analyzed} week{a.weeks_analyzed === 1 ? '' : 's'} of history</p>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.ghostBtn} onClick={load}>↺ Refresh</button>
      </div>
    </div>
  )
}
