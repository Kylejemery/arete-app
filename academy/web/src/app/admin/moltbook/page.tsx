'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'

type Config = {
  enabled: boolean
  paused_reason: string | null
  max_actions_day: number
  updated_at: string
}

type Action = {
  id: number
  created_at: string
  kind: string
  target_id: string | null
  submolt: string | null
  body: string | null
  reason: string | null
  status: string | null
  error: string | null
}

const KIND_FILTERS = ['all', 'comment', 'post', 'skip', 'error'] as const

export default function MoltbookAgentPage() {
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [actions, setActions] = useState<Action[]>([])
  const [last24h, setLast24h] = useState(0)
  const [kindFilter, setKindFilter] = useState<(typeof KIND_FILTERS)[number]>('all')
  const [pauseReason, setPauseReason] = useState('')
  const [capDraft, setCapDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
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
      const res = await fetch('/api/admin/moltbook', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setConfig(data.config)
      setActions(data.actions)
      setLast24h(data.last24h)
      setCapDraft(String(data.config.max_actions_day))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [])

  useEffect(() => {
    if (authorized) load()
  }, [authorized, load])

  async function update(patch: Record<string, unknown>) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/moltbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setConfig(data.config)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  if (authLoading) {
    return <div className={styles.page}><p className={styles.muted}>Checking access…</p></div>
  }
  if (!authorized) return null

  const cap = config?.max_actions_day ?? 0
  const visible = kindFilter === 'all' ? actions : actions.filter(a => a.kind === kindFilter)
  const cell = { padding: '8px', verticalAlign: 'top' as const }
  const fmt = (ts: string) => new Date(ts).toLocaleString()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Moltbook Agent</h1>
        <p>
          The Stoic interlocutor worker on Railway. It re-reads this kill switch every tick
          (~30 min), so changes here take effect without a redeploy.
        </p>
      </div>

      {error && <div className={styles.card}><p className={styles.errText}>{error}</p></div>}

      {config && (
        <div className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontWeight: 600, fontSize: 14,
                color: config.enabled ? '#1D9E75' : '#B23535',
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: config.enabled ? '#1D9E75' : '#B23535',
              }} />
              {config.enabled ? 'Running' : 'Stopped'}
            </span>
            <span className={styles.muted}>
              {last24h}/{cap} actions in the last 24h
              {!config.enabled && config.paused_reason ? ` — paused: ${config.paused_reason}` : ''}
            </span>
            <span className={styles.muted} style={{ marginLeft: 'auto' }}>
              config updated {fmt(config.updated_at)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {config.enabled ? (
              <>
                <input
                  className={styles.topicInput}
                  style={{ maxWidth: 260 }}
                  placeholder="pause reason (optional)"
                  value={pauseReason}
                  onChange={e => setPauseReason(e.target.value)}
                />
                <button
                  className={styles.primaryBtn}
                  style={{ background: '#B23535' }}
                  disabled={busy}
                  onClick={() => update({ enabled: false, paused_reason: pauseReason || undefined })}
                >
                  Stop agent
                </button>
              </>
            ) : (
              <button
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => update({ enabled: true })}
              >
                Start agent
              </button>
            )}

            <span className={styles.muted} style={{ marginLeft: 12 }}>Daily cap</span>
            <input
              className={styles.topicInput}
              style={{ width: 70 }}
              type="number"
              min={0}
              max={100}
              value={capDraft}
              onChange={e => setCapDraft(e.target.value)}
            />
            <button
              className={styles.ghostBtn}
              disabled={busy || Number(capDraft) === cap || capDraft === ''}
              onClick={() => update({ max_actions_day: Number(capDraft) })}
            >
              Save cap
            </button>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className={styles.sectionLabel} style={{ margin: 0 }}>Action log</span>
          <div className={styles.chipRow} style={{ margin: 0 }}>
            {KIND_FILTERS.map(k => (
              <button
                key={k}
                className={`${styles.chip} ${kindFilter === k ? styles.chipOn : ''}`}
                onClick={() => setKindFilter(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <button className={styles.ghostBtn} style={{ marginLeft: 'auto' }} onClick={load}>
            Refresh
          </button>
        </div>

        {visible.length === 0 ? (
          <p className={styles.muted}>No actions logged yet. Skips are logged too — an empty log means the worker has not completed an enabled tick.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['When', 'Kind', 'Status', 'Target', 'Reason / body'].map(h => (
                  <th key={h} className={styles.sectionLabel} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(a => (
                <tr
                  key={a.id}
                  style={{ borderTop: '0.5px solid #eee', cursor: a.body || a.error ? 'pointer' : 'default' }}
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                >
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{fmt(a.created_at)}</td>
                  <td style={cell}>{a.kind}</td>
                  <td style={{
                    ...cell,
                    color: a.status === 'ok' ? '#1D9E75' : a.status === 'failed' ? '#B23535' : '#996A00',
                  }}>
                    {a.status ?? '—'}
                  </td>
                  <td style={{ ...cell, fontFamily: 'monospace', fontSize: 12 }}>
                    {a.target_id ? `${a.target_id.slice(0, 10)}…` : '—'}
                    {a.submolt ? <span className={styles.muted}> m/{a.submolt}</span> : null}
                  </td>
                  <td style={{ ...cell, maxWidth: 420 }}>
                    {a.reason ?? '—'}
                    {expanded === a.id && a.body && (
                      <div style={{ marginTop: 6, padding: 8, background: '#f8f8f8', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                        {a.body}
                      </div>
                    )}
                    {expanded === a.id && a.error && (
                      <div className={styles.errText} style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                        {a.error}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
