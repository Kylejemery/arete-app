'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from '../admin.module.css'
import { renderEmail, substitute, TIER_LABEL, type EmailFormat, type TierKey } from '@/lib/email-format'

// Email tab: compose one message and send it from the owner's Gmail account
// to any subset of members — pick by tier (free / premium / pro), search, or
// tick individual rows. Sends go out one message per recipient in short
// chunks so a full roster never hits the serverless timeout.

type Recipient = {
  id: string
  email: string
  name: string | null
  tier: TierKey
  rawTier: string | null
  isAdmin: boolean
  onboarded: boolean
  createdAt: string | null
}

type Campaign = {
  id: string
  subject: string
  audience: { label?: string } | null
  recipient_count: number
  sent_count: number
  failed_count: number
  is_test: boolean
  created_at: string
}

type Roster = {
  generatedAt: string
  gmail: { configured: boolean; from: string | null; replyTo: string | null }
  adminEmail: string | null
  counts: { free: number; premium: number; pro: number; total: number }
  recipients: Recipient[]
  campaigns: Campaign[]
}

type Failure = { email: string; error: string }
type Progress = {
  phase: 'idle' | 'sending' | 'done' | 'error'
  total: number
  done: number
  sent: number
  failed: number
  failures: Failure[]
  error: string
  test: boolean
}

const TIERS: TierKey[] = ['free', 'premium', 'pro']
const CHUNK_SIZE = 20
const DRAFT_KEY = 'arete-admin-email-draft'
const DEFAULT_FOOTER =
  "You're receiving this because you have an Arete account. Reply to this email if you'd rather not hear from us."

const TIER_PILL: Record<TierKey, string> = {
  free: '',
  premium: styles.pillRunning,
  pro: styles.pillOk,
}

const IDLE: Progress = { phase: 'idle', total: 0, done: 0, sent: 0, failed: 0, failures: [], error: '', test: false }

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function EmailPage() {
  const [data, setData] = useState<Roster | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Audience
  const [tierFilter, setTierFilter] = useState<Set<TierKey>>(new Set(TIERS))
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Compose
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [format, setFormat] = useState<EmailFormat>('text')
  const [footer, setFooter] = useState(DEFAULT_FOOTER)
  const [showPreview, setShowPreview] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)

  const [progress, setProgress] = useState<Progress>(IDLE)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/admin/email/recipients', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load recipients')
      setData(json)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Draft persistence — a half-written announcement survives a reload.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (typeof d.subject === 'string') setSubject(d.subject)
        if (typeof d.body === 'string') setBody(d.body)
        if (d.format === 'html' || d.format === 'text') setFormat(d.format)
        if (typeof d.footer === 'string') setFooter(d.footer)
      }
    } catch { /* ignore */ }
    setDraftLoaded(true)
  }, [])
  useEffect(() => {
    if (!draftLoaded) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, body, format, footer })) } catch { /* ignore */ }
  }, [draftLoaded, subject, body, format, footer])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const recipients = useMemo(() => data?.recipients ?? [], [data])
  const byId = useMemo(() => new Map(recipients.map(r => [r.id, r])), [recipients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recipients.filter(r => {
      if (!tierFilter.has(r.tier)) return false
      if (!q) return true
      return r.email.toLowerCase().includes(q) || (r.name ?? '').toLowerCase().includes(q)
    })
  }, [recipients, tierFilter, search])

  const selectedCounts = useMemo(() => {
    const c: Record<TierKey, number> = { free: 0, premium: 0, pro: 0 }
    for (const id of selected) {
      const r = byId.get(id)
      if (r) c[r.tier] += 1
    }
    return c
  }, [selected, byId])

  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))

  function toggleTier(t: TierKey) {
    setTierFilter(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectFiltered(on: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      for (const r of filtered) {
        if (on) next.add(r.id)
        else next.delete(r.id)
      }
      return next
    })
  }

  // One-click audiences: replace the selection with exactly this group.
  function selectGroup(group: 'all' | TierKey) {
    const ids = recipients.filter(r => group === 'all' || r.tier === group).map(r => r.id)
    setSelected(new Set(ids))
    setTierFilter(group === 'all' ? new Set(TIERS) : new Set([group]))
    setSearch('')
  }

  const audienceLabel = useMemo(() => {
    const n = selected.size
    if (n === 0) return 'nobody'
    if (n === recipients.length) return `all ${n} users`
    const parts = TIERS.filter(t => selectedCounts[t] > 0).map(t => `${selectedCounts[t]} ${TIER_LABEL[t].toLowerCase()}`)
    return `${n} users (${parts.join(', ')})`
  }, [selected, recipients.length, selectedCounts])

  const canCompose = !!data?.gmail.configured && progress.phase !== 'sending'
  const composeValid = subject.trim().length > 0 && body.trim().length > 0

  async function postChunk(payload: Record<string, unknown>) {
    const res = await fetch('/api/admin/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || `Send failed (${res.status})`)
    return json as { campaignId: string | null; sent: number; failed: number; failures: Failure[]; logError: string | null }
  }

  async function send(test: boolean) {
    if (!composeValid) return
    const ids = test ? [] : [...selected]
    if (!test) {
      if (ids.length === 0) return
      const ok = window.confirm(
        `Send "${subject.trim()}" to ${audienceLabel}?\n\nThis goes out from ${data?.gmail.from ?? 'your Gmail'} as one email per person and cannot be recalled.`
      )
      if (!ok) return
    }

    const chunks = test ? [[]] : chunk(ids, CHUNK_SIZE)
    const total = test ? 1 : ids.length
    setProgress({ ...IDLE, phase: 'sending', total, test })

    let campaignId: string | null = null
    let sent = 0
    let failed = 0
    let failures: Failure[] = []
    let done = 0
    const audience = {
      label: test ? 'test (admin only)' : audienceLabel,
      tiers: TIERS.filter(t => selectedCounts[t] > 0),
      counts: selectedCounts,
    }

    try {
      for (const c of chunks) {
        const r = await postChunk({
          subject: subject.trim(),
          body,
          format,
          footer,
          userIds: c,
          test,
          campaignId,
          audience,
          totalRecipients: total,
        })
        campaignId = r.campaignId ?? campaignId
        sent += r.sent
        failed += r.failed
        failures = [...failures, ...r.failures]
        done += test ? 1 : c.length
        setProgress({ phase: 'sending', total, done, sent, failed, failures, error: '', test })
      }
      setProgress({ phase: 'done', total, done, sent, failed, failures, error: '', test })
      setToast(test ? 'Test email sent to you' : `Sent to ${sent} recipient${sent === 1 ? '' : 's'}`)
      load()
    } catch (e) {
      setProgress({
        phase: 'error', total, done, sent, failed, failures,
        error: e instanceof Error ? e.message : 'Send failed', test,
      })
    }
  }

  const previewHtml = useMemo(() => {
    if (!showPreview) return ''
    const vars = { name: 'Marcus', email: 'member@example.com' }
    return renderEmail({ body: substitute(body, vars), format, footer: substitute(footer, vars) }).html
  }, [showPreview, body, format, footer])

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>Email</h1>
            <p>
              Write once, send from your Gmail to any set of members — everyone, a tier, or
              hand-picked rows. Each person gets their own message; nobody sees anyone else&rsquo;s address.
            </p>
          </div>
          {data && (
            <button className={styles.ghostBtn} onClick={load} style={{ flexShrink: 0 }} disabled={loading}>↺ Refresh</button>
          )}
        </div>
        {data && (
          <p className={styles.muted} style={{ marginTop: 6 }}>
            {data.gmail.configured
              ? <>Sending as <strong>{data.gmail.from}</strong>{data.gmail.replyTo ? <> · replies to {data.gmail.replyTo}</> : null}</>
              : 'Gmail not configured'}
            {' · '}{data.counts.total} users: {data.counts.free} free, {data.counts.premium} premium, {data.counts.pro} pro
          </p>
        )}
      </div>

      {loadError && (
        <div className={styles.card}>
          <p className={styles.errText}>{loadError}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && !data && <p className={styles.muted}>Loading members…</p>}

      {data && !data.gmail.configured && (
        <div className={styles.errorBanner} style={{ marginBottom: 16 }}>
          <strong>Gmail isn&rsquo;t connected.</strong> Set <code>GMAIL_USER</code> (your Gmail address) and{' '}
          <code>GMAIL_APP_PASSWORD</code> (Google Account → Security → 2-Step Verification → App passwords)
          in the Vercel environment, then redeploy. Optional: <code>GMAIL_FROM_NAME</code> and <code>GMAIL_REPLY_TO</code>.
        </div>
      )}

      {data && (
        <>
          {/* ── Compose ──────────────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle} style={{ marginBottom: 0 }}>Message</div>
              <span className={styles.muted}>
                Merge fields: <code>{'{{name}}'}</code> (falls back to &ldquo;there&rdquo;) and <code>{'{{email}}'}</code>
              </span>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Subject</label>
              <input
                className={styles.textInput}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="What's new in Arete this month"
                maxLength={200}
                disabled={progress.phase === 'sending'}
              />
            </div>

            <div className={styles.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.fieldLabel}>Body</label>
                <span style={{ display: 'flex', gap: 6 }}>
                  {(['text', 'html'] as EmailFormat[]).map(f => (
                    <button
                      key={f}
                      type="button"
                      className={`${styles.chip} ${format === f ? styles.chipOn : ''}`}
                      onClick={() => setFormat(f)}
                      disabled={progress.phase === 'sending'}
                    >
                      {f === 'text' ? 'Plain text' : 'Raw HTML'}
                    </button>
                  ))}
                </span>
              </div>
              <textarea
                className={styles.bigTextarea}
                style={{ minHeight: 260, fontFamily: format === 'html' ? undefined : 'inherit', fontSize: 14 }}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={format === 'html'
                  ? '<p>Hi {{name}},</p>\n<p>…</p>'
                  : 'Hi {{name}},\n\nBlank lines become paragraphs. Links are made clickable automatically.'}
                disabled={progress.phase === 'sending'}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Footer (plain text, appended to every message — clear it to omit)</label>
              <input
                className={styles.textInput}
                value={footer}
                onChange={e => setFooter(e.target.value)}
                disabled={progress.phase === 'sending'}
              />
            </div>

            <div className={styles.actions} style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setShowPreview(p => !p)}
              >
                {showPreview ? 'Hide preview' : 'Preview'}
              </button>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => send(true)}
                  disabled={!canCompose || !composeValid}
                  title={data.adminEmail ? `Sends only to ${data.adminEmail}` : ''}
                >
                  Send test to me
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => send(false)}
                  disabled={!canCompose || !composeValid || selected.size === 0}
                >
                  {progress.phase === 'sending' && !progress.test
                    ? `Sending… ${progress.done}/${progress.total}`
                    : `Send to ${audienceLabel}`}
                </button>
              </span>
            </div>

            {showPreview && (
              <div style={{ marginTop: 14, border: '0.5px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: '0.5px solid #f0f0f0', fontSize: 12, color: '#666' }}>
                  <strong>From:</strong> {data.gmail.from ?? 'Arete'} &nbsp;·&nbsp; <strong>Subject:</strong>{' '}
                  {substitute(subject, { name: 'Marcus', email: 'member@example.com' }) || <span className={styles.muted}>(no subject)</span>}
                </div>
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={previewHtml}
                  style={{ width: '100%', height: 420, border: 'none', background: '#fff' }}
                />
              </div>
            )}
          </div>

          {/* ── Send status ───────────────────────────────────────────── */}
          {progress.phase !== 'idle' && (
            <div className={progress.phase === 'error' ? styles.errorBanner : progress.failed > 0 ? styles.errorBanner : styles.successBanner} style={{ marginBottom: 16 }}>
              {progress.phase === 'sending' && (
                <>
                  <div>Sending {progress.test ? 'test' : `${progress.done} / ${progress.total}`}…</div>
                  <div style={{ marginTop: 8, height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#1D9E75', transition: 'width 0.3s' }} />
                  </div>
                </>
              )}
              {progress.phase === 'done' && (
                <div>
                  {progress.test ? 'Test sent' : 'Done'}: {progress.sent} delivered to Gmail
                  {progress.failed > 0 && <>, {progress.failed} failed</>}.
                </div>
              )}
              {progress.phase === 'error' && (
                <div>
                  <strong>Stopped:</strong> {progress.error}
                  {progress.done > 0 && <> — {progress.sent} were already sent before the error.</>}
                </div>
              )}
              {progress.failures.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13 }}>
                  {progress.failures.slice(0, 20).map(f => (
                    <li key={f.email}><code>{f.email}</code> — {f.error}</li>
                  ))}
                  {progress.failures.length > 20 && <li>…and {progress.failures.length - 20} more</li>}
                </ul>
              )}
              {(progress.phase === 'done' || progress.phase === 'error') && (
                <div style={{ marginTop: 8 }}>
                  <button className={styles.ghostBtn} style={{ height: 28, fontSize: 12 }} onClick={() => setProgress(IDLE)}>Dismiss</button>
                </div>
              )}
            </div>
          )}

          {/* ── Audience ─────────────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle} style={{ marginBottom: 0 }}>
                Recipients — {selected.size} selected
              </div>
              <span className={styles.muted}>
                {selectedCounts.free} free · {selectedCounts.premium} premium · {selectedCounts.pro} pro
              </span>
            </div>

            <div className={styles.sectionLabel}>Quick pick</div>
            <div className={styles.chipRow} style={{ marginBottom: 14 }}>
              <button type="button" className={styles.chip} onClick={() => selectGroup('all')}>
                All users ({data.counts.total})
              </button>
              {TIERS.map(t => (
                <button key={t} type="button" className={styles.chip} onClick={() => selectGroup(t)}>
                  {TIER_LABEL[t]} only ({data.counts[t]})
                </button>
              ))}
              <button type="button" className={styles.chip} onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
                Clear selection
              </button>
            </div>

            <div className={styles.sectionLabel}>Filter list</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ display: 'flex', gap: 6 }}>
                {TIERS.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.chip} ${tierFilter.has(t) ? styles.chipOn : ''}`}
                    onClick={() => toggleTier(t)}
                  >
                    {TIER_LABEL[t]}
                  </button>
                ))}
              </span>
              <input
                className={styles.textInput}
                style={{ flex: 1, minWidth: 200 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by email or name…"
              />
              <button
                type="button"
                className={styles.ghostBtn}
                style={{ height: 36, fontSize: 13 }}
                onClick={() => selectFiltered(!allFilteredSelected)}
                disabled={filtered.length === 0}
              >
                {allFilteredSelected ? `Deselect ${filtered.length} shown` : `Select ${filtered.length} shown`}
              </button>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
              <table className={styles.sigTable}>
                <thead>
                  <tr>
                    <th className={styles.sigTd} style={{ width: 28 }}>
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={e => selectFiltered(e.target.checked)}
                        disabled={filtered.length === 0}
                        aria-label="Select all shown"
                      />
                    </th>
                    {['Email', 'Name', 'Tier', 'Joined'].map(h => (
                      <th key={h} className={styles.sigTd} style={{ textAlign: 'left', color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td className={styles.sigTd} colSpan={5}><span className={styles.muted}>No users match.</span></td></tr>
                  )}
                  {filtered.map(r => {
                    const on = selected.has(r.id)
                    return (
                      <tr
                        key={r.id}
                        className={styles.sigTr}
                        style={{ background: on ? '#F7F6FE' : undefined, cursor: 'pointer' }}
                        onClick={() => toggleOne(r.id)}
                      >
                        <td className={styles.sigTd} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={on} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.email}`} />
                        </td>
                        <td className={styles.sigTd} style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5 }}>
                          {r.email}
                          {r.isAdmin && <span className={styles.guideTag} style={{ marginLeft: 6 }}>admin</span>}
                        </td>
                        <td className={styles.sigTd}>{r.name ?? <span className={styles.muted}>—</span>}</td>
                        <td className={styles.sigTd}>
                          <span
                            className={`${styles.pill} ${TIER_PILL[r.tier]}`}
                            style={r.tier === 'free' ? { background: '#f0f0f0', color: '#666' } : undefined}
                            title={r.rawTier && r.rawTier !== r.tier ? `profiles.tier = ${r.rawTier}` : undefined}
                          >
                            {TIER_LABEL[r.tier]}
                          </span>
                        </td>
                        <td className={styles.sigTd} style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── History ──────────────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Recent sends</div>
            {data.campaigns.length === 0 ? (
              <p className={styles.muted}>Nothing sent yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.sigTable}>
                  <thead>
                    <tr>
                      {['When', 'Subject', 'Audience', 'Sent', 'Failed'].map(h => (
                        <th key={h} className={styles.sigTd} style={{ textAlign: 'left', color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map(c => (
                      <tr key={c.id} className={styles.sigTr}>
                        <td className={styles.sigTd} style={{ whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleString()}</td>
                        <td className={styles.sigTd}>
                          {c.subject}
                          {c.is_test && <span className={styles.guideTag} style={{ marginLeft: 6 }}>test</span>}
                        </td>
                        <td className={styles.sigTd}>{c.audience?.label ?? `${c.recipient_count} users`}</td>
                        <td className={styles.sigTd} style={{ fontVariantNumeric: 'tabular-nums' }}>{c.sent_count} / {c.recipient_count}</td>
                        <td className={styles.sigTd}>
                          {c.failed_count > 0
                            ? <span className={`${styles.pill} ${styles.pillFailed}`}>{c.failed_count}</span>
                            : <span className={styles.muted}>0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
