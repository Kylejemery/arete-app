'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from '../admin.module.css'

// Product-usage tab. Reads /api/admin/usage (aggregated server-side) and renders
// it in the admin's existing visual language — horizontal bars + stat cards, no
// new chart library. Everything is aggregate/anonymized; individual users appear
// as ranked rows only.

type Funnel = { step: string; users: number }
type Week = { week: string; count?: number; activeUsers?: number }
type EngRow = {
  rank: number; events: number; activeDays: number
  firstSeen: string; lastSeen: string; daysSince: number
  isAdmin: boolean; status: string
}
type Signal = { severity: 'crit' | 'warn' | 'good'; text: string }
type Usage = {
  generatedAt: string
  kpis: {
    totalUsers: number; activated: number; onboarded: number; premium: number
    active7d: number; active30d: number; new7d: number; new30d: number
  }
  funnel: Funnel[]
  signupsByWeek: Week[]
  wau: Week[]
  engagement: EngRow[]
  engagementTail: { oneAndDone: number; singleDayOnly: number; activated: number }
  signals: Signal[]
}

const STATUS_PILL: Record<string, string> = {
  active: styles.pillOk,
  new: styles.pillRunning,
  fading: styles.pillFailed,
  churned: styles.pillFailed,
}

function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className={styles.card} style={{ marginBottom: 0 }}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ marginTop: 6 }}>{value}</div>
      {sub && <div className={styles.muted} style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// A labelled horizontal bar, reusing the admin barRow vocabulary. `pct` is the
// fill width; `display` is the number shown at the right.
function Bar({ label, pct, display, dim }: { label: string; pct: number; display: React.ReactNode; dim?: boolean }) {
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel} title={label}>{label}</span>
      <span className={styles.barTrack}>
        <span
          className={styles.barFill}
          style={{ width: `${Math.max(2, Math.round(pct))}%`, opacity: dim ? 0.5 : 1 }}
        />
      </span>
      <span className={styles.barValue}>{display}</span>
    </div>
  )
}

function shortWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default function UsagePage() {
  const [data, setData] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/usage', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load usage')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const k = data?.kpis
  const funnelTop = data?.funnel?.[0]?.users || 1
  const maxSignups = (data?.signupsByWeek ?? []).reduce((m, w) => Math.max(m, w.count ?? 0), 0) || 1
  const maxWau = (data?.wau ?? []).reduce((m, w) => Math.max(m, w.activeUsers ?? 0), 0) || 1

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>Usage</h1>
            <p>
              How people actually use the app — signups, activation, feature adoption, and retention,
              read live from the user-facing tables. Aggregate and anonymized; no individual is named.
            </p>
          </div>
          {data && (
            <button className={styles.ghostBtn} onClick={load} style={{ flexShrink: 0 }}>↺ Refresh</button>
          )}
        </div>
        {data && (
          <p className={styles.muted} style={{ marginTop: 6 }}>
            As of {new Date(data.generatedAt).toLocaleString()} · activity = check-ins, cabinet chats, journal, goals
          </p>
        )}
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && !data && <p className={styles.muted}>Loading usage…</p>}

      {k && (
        <>
          {/* ── KPI cards ─────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Metric label="Total signups" value={k.totalUsers} sub={`+${k.new7d} in last 7d`} />
            <Metric label="Activated" value={`${k.activated} / ${k.totalUsers}`} sub={`${k.totalUsers - k.activated} never acted`} />
            <Metric label="Active last 7d" value={k.active7d} sub={`${k.active30d} in last 30d`} />
            <Metric label="Premium" value={`${k.premium} / ${k.totalUsers}`} />
            <Metric label="Onboarded" value={`${k.onboarded} / ${k.totalUsers}`} sub="know-thyself complete" />
          </div>

          {/* ── Adoption funnel ───────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Adoption funnel</div>
            <p className={styles.muted} style={{ marginTop: -4, marginBottom: 12 }}>
              Distinct users who ever reached each step.
            </p>
            {data.funnel.map((f, i) => (
              <Bar
                key={f.step}
                label={f.step}
                pct={(f.users / funnelTop) * 100}
                display={f.users}
                dim={i > 2}
              />
            ))}
          </div>

          {/* ── Weekly series ─────────────────────────────────────────── */}
          <div className={styles.corpusGrid}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Signups per week</div>
              <p className={styles.muted} style={{ marginTop: -4, marginBottom: 12 }}>Last shown by ISO week (Mon).</p>
              {data.signupsByWeek.length === 0 && <p className={styles.muted}>No signups recorded.</p>}
              {data.signupsByWeek.map(w => (
                <Bar key={w.week} label={shortWeek(w.week)} pct={((w.count ?? 0) / maxSignups) * 100} display={w.count ?? 0} />
              ))}
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>Weekly active users</div>
              <p className={styles.muted} style={{ marginTop: -4, marginBottom: 12 }}>Distinct active users, last 8 weeks.</p>
              {data.wau.length === 0 && <p className={styles.muted}>No activity in the last 8 weeks.</p>}
              {data.wau.map(w => (
                <Bar key={w.week} label={shortWeek(w.week)} pct={((w.activeUsers ?? 0) / maxWau) * 100} display={w.activeUsers ?? 0} />
              ))}
            </div>
          </div>

          {/* ── Engagement depth ──────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Engagement depth</div>
            <p className={styles.muted} style={{ marginTop: -4, marginBottom: 12 }}>
              Top users by lifetime activity. Anonymized — the admin account is flagged so it doesn&rsquo;t
              read as a real member.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.sigTable}>
                <tbody>
                  <tr>
                    <td className={styles.sigTd} style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>User</td>
                    <td className={styles.sigTd} style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Events</td>
                    <td className={styles.sigTd} style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Active days</td>
                    <td className={styles.sigTd} style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>First seen</td>
                    <td className={styles.sigTd} style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last seen</td>
                    <td className={styles.sigTd} style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</td>
                  </tr>
                  {data.engagement.map(r => (
                    <tr key={r.rank} className={styles.sigTr}>
                      <td className={styles.sigTd}>
                        #{r.rank}
                        {r.isAdmin && (
                          <span className={styles.guideTag} style={{ marginLeft: 6 }}>admin</span>
                        )}
                      </td>
                      <td className={styles.sigTd} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.events}</td>
                      <td className={styles.sigTd} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.activeDays}</td>
                      <td className={styles.sigTd}>{r.firstSeen}</td>
                      <td className={styles.sigTd}>{r.lastSeen}</td>
                      <td className={styles.sigTd}>
                        <span className={`${styles.pill} ${STATUS_PILL[r.status] ?? ''}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.muted} style={{ marginTop: 12 }}>
              {data.engagementTail.singleDayOnly} of {data.engagementTail.activated} activated users came for a
              single day only; {data.engagementTail.oneAndDone} fired exactly one event.
            </p>
          </div>

          {/* ── Signals / interpretation ──────────────────────────────── */}
          {data.signals.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>What this says</div>
              <ul className={styles.respList}>
                {data.signals.map((s, i) => (
                  <li key={i} className={styles.respItem}>
                    <span
                      className={styles.respMark}
                      style={{ color: s.severity === 'crit' ? '#B23535' : s.severity === 'warn' ? '#E0A100' : '#1D9E75' }}
                    >
                      {s.severity === 'good' ? '↑' : '!'}
                    </span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.ghostBtn} onClick={load}>↺ Refresh</button>
          </div>
        </>
      )}
    </div>
  )
}
