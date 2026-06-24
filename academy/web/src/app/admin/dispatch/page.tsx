'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from '../admin.module.css'

type DispatchToday = {
  id: string
  dispatch_date: string
  title: string
  body: string
  teaser: string
  practice: string
  community_themes: { theme: string; frequency: number }[] | null
  corpus_context: { recentNewAuthors?: string[]; latestSynthesisConcept?: string | null } | null
  total_recipients: number
  delivered_count: number
  failed_count: number
}

type DispatchHistory = {
  id: string
  dispatch_date: string
  title: string
  total_recipients: number
  delivered_count: number
  failed_count: number
}

type AgentConfig = {
  enabled?: boolean
  max_community_themes?: number
  target_word_count?: number
  model?: string
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function DispatchPage() {
  const [today, setToday] = useState<DispatchToday | null>(null)
  const [history, setHistory] = useState<DispatchHistory[]>([])
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Config form state.
  const [cfgEnabled, setCfgEnabled] = useState(true)
  const [cfgThemes, setCfgThemes] = useState(5)
  const [cfgModel, setCfgModel] = useState('claude-haiku-4-5-20251001')
  const [savingCfg, setSavingCfg] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/dispatch', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load dispatch data')
      setToday(json.today || null)
      setHistory(json.history || [])
      if (json.config) {
        setConfig(json.config)
        setCfgEnabled(json.config.enabled ?? true)
        setCfgThemes(json.config.max_community_themes ?? 5)
        setCfgModel(json.config.model ?? 'claude-haiku-4-5-20251001')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveConfig() {
    if (!config) return
    setSavingCfg(true)
    try {
      const merged: AgentConfig = {
        ...config,
        enabled: cfgEnabled,
        max_community_themes: cfgThemes,
        model: cfgModel,
      }
      const res = await fetch('/api/admin/agent-config/dispatch_agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: merged }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save config')
      setConfig(json.config)
      showToast('Config saved')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save config')
    }
    setSavingCfg(false)
  }

  const groundedIn = today?.corpus_context?.recentNewAuthors?.filter(Boolean) || []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Daily Dispatch</h1>
        <p>The community&apos;s morning briefing — one dispatch generated each day at 5:00 AM ET, delivered at each user&apos;s local 7 AM.</p>
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && !today && history.length === 0 && <p className={styles.muted}>Loading dispatch data…</p>}

      {/* ── Section 1: Today's dispatch (preview) ──────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Today&apos;s dispatch</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={load}>↺ Refresh</button>
        </div>
        {!today ? (
          <p className={styles.muted}>
            Not yet generated. The generation agent runs daily at 5:00 AM ET — or run{' '}
            <code>node server/dispatch-generation-agent.js</code> manually.
          </p>
        ) : (
          <>
            <div className={styles.gapMeta} style={{ marginBottom: 8 }}>
              {fmtDate(today.dispatch_date)} · {today.delivered_count}/{today.total_recipients} delivered
              {today.failed_count > 0 ? ` · ${today.failed_count} failed` : ''}
            </div>
            <h2 style={{ margin: '4px 0 12px', fontSize: 20 }}>{today.title}</h2>
            <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{today.body}</p>
            <div className={styles.sectionLabel} style={{ marginTop: 16 }}>Today&apos;s practice</div>
            <p style={{ lineHeight: 1.6, fontStyle: 'italic' }}>{today.practice}</p>
            {groundedIn.length > 0 && (
              <p className={styles.muted} style={{ marginTop: 12 }}>Grounded in: {groundedIn.join(', ')}</p>
            )}
            {today.community_themes && today.community_themes.length > 0 && (
              <p className={styles.muted} style={{ marginTop: 4 }}>
                Themes: {today.community_themes.map(t => `${t.theme} (${t.frequency})`).join(' · ')}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Section 2: Dispatch history ────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>History (last 14 days)</div>
        {history.length === 0 ? (
          <p className={styles.muted}>No dispatches yet.</p>
        ) : (
          history.map(h => (
            <div key={h.id} className={styles.rowItem}>
              <span>{fmtDate(h.dispatch_date)} — {h.title}</span>
              <span className={styles.muted}>
                {h.delivered_count}/{h.total_recipients} delivered{h.failed_count > 0 ? ` · ${h.failed_count} failed` : ''}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── Section 3: Agent config ────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Agent config</div>
        {!config ? (
          <p className={styles.muted}>Config unavailable.</p>
        ) : (
          <>
            <p className={styles.muted} style={{ marginBottom: 10 }}>
              Generation time: 5:00 AM ET (10:00 UTC) · User delivery hour: 7 AM local
            </p>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Max community themes</label>
                <input
                  className={styles.textInput}
                  type="number"
                  min={1}
                  max={10}
                  value={cfgThemes}
                  onChange={e => setCfgThemes(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Model</label>
                <select
                  className={styles.textInput}
                  value={cfgModel}
                  onChange={e => setCfgModel(e.target.value)}
                >
                  <option value="claude-haiku-4-5-20251001">claude-haiku</option>
                  <option value="claude-sonnet-4-6">claude-sonnet</option>
                </select>
              </div>
            </div>
            <label className={styles.modeOption} style={{ alignItems: 'center' }}>
              <input type="checkbox" checked={cfgEnabled} onChange={e => setCfgEnabled(e.target.checked)} />
              Enabled {cfgEnabled ? '' : '— agent will skip its next run'}
            </label>
            <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 8 }}>
              <button className={styles.primaryBtn} disabled={savingCfg} onClick={saveConfig}>
                {savingCfg ? 'Saving…' : 'Save Config'}
              </button>
            </div>
          </>
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
