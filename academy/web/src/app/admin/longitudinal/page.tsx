'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from '../admin.module.css'

// The Longitudinal tab is AGGREGATE and ANONYMIZED — patterns across the user
// base, never an individual portrait. Individual portraits are for the user
// themselves (a future mobile build). Nothing here identifies a person.

type ThemeMapEntry = { theme: string; users: number; trend: 'up' | 'down' | 'flat' }
type GrowthCluster = { keyword: string; edgeCount: number; userCount: number; examples: string[] }
type Orientation = { orientation: string; count: number; pct: number }
type Aggregate = {
  metrics: {
    active_models: number
    avg_weeks_analyzed: number
    top_persistent_theme: string | null
    top_growth_edge: string | null
  }
  theme_map: ThemeMapEntry[]
  growth_clusters: GrowthCluster[]
  orientation_distribution: Orientation[]
}

const TREND: Record<string, { glyph: string; color: string; label: string }> = {
  up: { glyph: '▲', color: '#0F6E56', label: 'trending up' },
  down: { glyph: '▼', color: '#B23535', label: 'trending down' },
  flat: { glyph: '—', color: '#8a8a8a', label: 'steady' },
}

function MetricCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className={styles.card} style={{ marginBottom: 0 }}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ marginTop: 6 }}>{value}</div>
      {sub && <div className={styles.muted} style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function LongitudinalPage() {
  const [data, setData] = useState<Aggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/longitudinal', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const m = data?.metrics
  const themeMap = data?.theme_map ?? []
  const clusters = data?.growth_clusters ?? []
  const orientations = data?.orientation_distribution ?? []
  const maxThemeUsers = themeMap.reduce((mx, t) => Math.max(mx, t.users), 0) || 1

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Longitudinal</h1>
        <p>
          Aggregate, anonymized patterns across every user&rsquo;s living philosophical portrait.
          Rebuilt weekly (Mondays 04:30 UTC). No individual portraits are shown here — those belong to the user.
        </p>
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && !data && <p className={styles.muted}>Loading longitudinal patterns…</p>}

      {!loading && m && m.active_models === 0 && !error && (
        <div className={styles.card}>
          <p className={styles.muted}>
            No user models yet. The agent runs Mondays at 04:30 UTC and builds a portrait for each user
            with 4+ weeks of journal analysis.
          </p>
        </div>
      )}

      {m && m.active_models > 0 && (
        <>
          {/* ── Metric cards ─────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <MetricCard label="Users with active models" value={m.active_models.toLocaleString()} />
            <MetricCard label="Avg weeks analyzed" value={m.avg_weeks_analyzed} sub="across all models" />
            <MetricCard label="Most common theme" value={m.top_persistent_theme ?? '—'} sub="persistent across base" />
            <MetricCard label="Most common growth edge" value={m.top_growth_edge ?? '—'} sub="clustered by keyword" />
          </div>

          <div className={styles.corpusGrid}>
            {/* ── Aggregate theme map ────────────────────────────────────── */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Aggregate theme map</div>
              <p className={styles.muted} style={{ marginTop: -4, marginBottom: 12 }}>
                Persistent themes across the base, by number of users carrying them.
              </p>
              {themeMap.length === 0 && <p className={styles.muted}>No persistent themes yet.</p>}
              {themeMap.map((t) => {
                const tr = TREND[t.trend] ?? TREND.flat
                return (
                  <div key={t.theme} className={styles.barRow}>
                    <span className={styles.barLabel} title={t.theme}>{t.theme}</span>
                    <span className={styles.barTrack}>
                      <span className={styles.barFill} style={{ width: `${Math.round((t.users / maxThemeUsers) * 100)}%` }} />
                    </span>
                    <span className={styles.barValue} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t.users}
                      <span title={tr.label} style={{ color: tr.color, fontSize: 11 }}>{tr.glyph}</span>
                    </span>
                  </div>
                )
              })}
            </div>

            {/* ── Orientation distribution ───────────────────────────────── */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Orientation distribution</div>
              <p className={styles.muted} style={{ marginTop: -4, marginBottom: 12 }}>
                Inferred dominant philosophical orientation across the base.
              </p>
              {orientations.length === 0 && <p className={styles.muted}>No data yet.</p>}
              {orientations.map((o) => (
                <div key={o.orientation} className={styles.barRow}>
                  <span className={styles.barLabel} style={{ textTransform: 'capitalize' }}>{o.orientation}</span>
                  <span className={styles.barTrack}>
                    <span className={styles.barFill} style={{ width: `${o.pct}%` }} />
                  </span>
                  <span className={styles.barValue}>{o.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Growth edge clusters ─────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Growth edge clusters</div>
            <p className={styles.muted} style={{ marginTop: -4, marginBottom: 12 }}>
              Growth edges grouped by keyword — the philosophical challenges the base is collectively working on.
            </p>
            {clusters.length === 0 && <p className={styles.muted}>No growth edges yet.</p>}
            {clusters.map((c) => (
              <div key={c.keyword} className={styles.gapRow}>
                <div className={styles.gapRowMain}>
                  <span className={styles.pill} style={{ textTransform: 'capitalize' }}>{c.keyword}</span>
                  <span className={styles.gapTitle}>
                    {c.edgeCount} edge{c.edgeCount === 1 ? '' : 's'} · {c.userCount} user{c.userCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className={styles.gapMeta}>
                  {c.examples.map((ex, i) => (
                    <div key={i} style={{ marginTop: i ? 4 : 0 }}>&ldquo;{ex}&rdquo;</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button className={styles.ghostBtn} onClick={load}>↺ Refresh</button>
          </div>
        </>
      )}
    </div>
  )
}
