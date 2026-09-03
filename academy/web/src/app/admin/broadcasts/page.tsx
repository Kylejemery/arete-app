'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from '../admin.module.css'
import { TIER_LABEL, type TierKey } from '@/lib/email-format'

// Broadcasts tab: write one message as a counselor and send it to the
// membership. It arrives twice — as a push notification, and as a post in the
// member's Cabinet chat.
//
// The Cabinet post is the delivery that matters. Only a minority of members
// have granted notification permission, so the push is a nudge and the post is
// the message: the app collects it on its next foreground whether or not a
// notification ever appeared. That is why "pushed" and "in cabinet" are two
// separate tallies below, and why a low push count is not a failure.

type Broadcast = {
  id: string
  counselor_slug: string | null
  fallback_counselor_slug: string
  title: string
  push_body: string
  message: string
  audience: { label?: string; tiers?: TierKey[]; testOnly?: boolean } | null
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
  send_date: string | null
  send_hour: number | null
  recipient_count: number
  pushed_count: number
  failed_count: number
  seeded_count: number
  created_at: string
  updated_at: string
}

type Counselor = { slug: string; name: string }

type Data = {
  broadcasts: Broadcast[]
  counselors: Counselor[]
  counts: { free: number; premium: number; pro: number; total: number }
}

const TIERS: TierKey[] = ['free', 'premium', 'pro']
const PUSH_MAX = 240
const MESSAGE_MAX = 2000
const OWN_CABINET = '__own_cabinet__'

const STATUS_PILL: Record<Broadcast['status'], string> = {
  draft: '',
  scheduled: styles.pillRunning,
  sending: styles.pillRunning,
  sent: styles.pillOk,
  cancelled: styles.pillFailed,
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtHour(hour: number | null): string {
  if (hour === null) return 'as soon as possible'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}${hour < 12 ? 'am' : 'pm'} local`
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BroadcastsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState('')

  // Composer
  const [editingId, setEditingId] = useState<string | null>(null)
  const [speaker, setSpeaker] = useState('marcus-aurelius')
  const [title, setTitle] = useState('')
  const [pushBody, setPushBody] = useState('')
  const [message, setMessage] = useState('')
  const [tiers, setTiers] = useState<Set<TierKey>>(new Set(TIERS))
  const [testOnly, setTestOnly] = useState(false)
  const [sendDate, setSendDate] = useState(todayISO())
  const [sendHour, setSendHour] = useState<number | null>(10)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/admin/broadcasts', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load broadcasts')
      setData(json)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load broadcasts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const counselorName = useMemo(() => {
    if (speaker === OWN_CABINET) return 'Their own cabinet'
    return data?.counselors.find(c => c.slug === speaker)?.name ?? 'Marcus Aurelius'
  }, [speaker, data])

  const audienceSize = useMemo(() => {
    if (!data) return 0
    if (testOnly) return 1
    return TIERS.filter(t => tiers.has(t)).reduce((n, t) => n + data.counts[t], 0)
  }, [data, tiers, testOnly])

  const resetComposer = () => {
    setEditingId(null)
    setSpeaker('marcus-aurelius')
    setTitle('')
    setPushBody('')
    setMessage('')
    setTiers(new Set(TIERS))
    setTestOnly(false)
    setSendDate(todayISO())
    setSendHour(10)
  }

  const edit = (b: Broadcast) => {
    setEditingId(b.id)
    setSpeaker(b.counselor_slug ?? OWN_CABINET)
    setTitle(b.title)
    setPushBody(b.push_body)
    setMessage(b.message)
    setTiers(new Set(b.audience?.tiers ?? TIERS))
    setTestOnly(!!b.audience?.testOnly)
    setSendDate(b.send_date ?? todayISO())
    setSendHour(b.send_hour)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const payload = () => ({
    id: editingId ?? undefined,
    counselorSlug: speaker === OWN_CABINET ? null : speaker,
    title,
    pushBody,
    message,
    tiers: TIERS.filter(t => tiers.has(t)),
    testOnly,
    sendDate,
    sendHour,
  })

  // Save keeps it a draft — nothing is sent, nothing is materialised.
  const saveDraft = async () => {
    setBusy('save')
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload(), action: 'save' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to save')
      if (!editingId && json?.id) setEditingId(json.id)
      showToast('Draft saved')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save')
    }
    setBusy('')
  }

  // Schedule fixes the audience (one delivery row per member) and hands the
  // broadcast to the delivery agent. With "as soon as possible" we also kick
  // the agent so the pushes go out now rather than on the hour.
  const schedule = async () => {
    const when = sendHour === null
      ? 'now'
      : `${fmtDate(sendDate)} at ${fmtHour(sendHour)}`
    const who = testOnly ? 'you only' : `${audienceSize} member${audienceSize === 1 ? '' : 's'}`
    if (!window.confirm(`Send "${title || 'this broadcast'}" as ${counselorName} to ${who} — ${when}?`)) return

    setBusy('schedule')
    try {
      let id = editingId
      if (!id) {
        const created = await fetch('/api/admin/broadcasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload()),
        })
        const createdJson = await created.json()
        if (!created.ok) throw new Error(createdJson?.error || 'Failed to save')
        id = createdJson.id
        setEditingId(id)
      }
      const res = await fetch('/api/admin/broadcasts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload(), id, action: 'schedule' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to schedule')

      showToast(`Scheduled for ${json.recipientCount} member${json.recipientCount === 1 ? '' : 's'}`)
      if (sendHour === null) await pushNow(false)
      resetComposer()
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to schedule')
    }
    setBusy('')
  }

  // Runs the delivery agent on Railway. Pushes only — the Cabinet posts are
  // collected by each app on its next foreground regardless.
  const pushNow = async (reload = true) => {
    if (reload) setBusy('push')
    try {
      const res = await fetch('/api/admin/broadcasts/deliver', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Delivery failed')
      showToast(`Pushed ${json.sent ?? 0} · skipped ${json.skipped ?? 0} (no token) · failed ${json.failed ?? 0}`)
      if (reload) await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delivery failed')
    }
    if (reload) setBusy('')
  }

  const cancel = async (b: Broadcast) => {
    if (!window.confirm(`Cancel "${b.title}"? Members who already have it keep it.`)) return
    setBusy(b.id)
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, action: 'cancel' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to cancel')
      showToast('Cancelled')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to cancel')
    }
    setBusy('')
  }

  const remove = async (b: Broadcast) => {
    if (!window.confirm(`Delete the draft "${b.title}"?`)) return
    setBusy(b.id)
    try {
      const res = await fetch(`/api/admin/broadcasts?id=${b.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to delete')
      if (editingId === b.id) resetComposer()
      showToast('Draft deleted')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete')
    }
    setBusy('')
  }

  const canSend = title.trim() && pushBody.trim() && message.trim() && (testOnly || audienceSize > 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Broadcasts</h1>
        <p>
          A message from a counselor to the membership. It arrives as a notification and as a post in
          the member&apos;s Cabinet chat — and because most members never granted notification
          permission, the Cabinet post is the delivery that counts.
        </p>
      </div>

      {loadError && (
        <div className={styles.card}>
          <p className={styles.errText}>{loadError}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {/* ── Compose ────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>{editingId ? 'Edit broadcast' : 'New broadcast'}</span>
          {editingId && (
            <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={resetComposer}>
              + Start a new one
            </button>
          )}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Who speaks</label>
            <select className={styles.textInput} value={speaker} onChange={e => setSpeaker(e.target.value)}>
              {(data?.counselors ?? []).map(c => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
              <option value={OWN_CABINET}>— whoever is in their own cabinet —</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Title (admin reference)</label>
            <input
              className={styles.textInput}
              value={title}
              maxLength={120}
              placeholder="A note in the margin"
              onChange={e => setTitle(e.target.value)}
            />
          </div>
        </div>
        {speaker === OWN_CABINET && (
          <p className={styles.muted} style={{ marginTop: -4 }}>
            Each member hears it from the first counselor in their own cabinet — Marcus for anyone
            whose cabinet resolves to nobody. Write copy that stays in voice for any of them.
          </p>
        )}

        <div className={styles.field} style={{ marginTop: 12 }}>
          <label className={styles.fieldLabel}>
            Notification line
            <span className={pushBody.length > PUSH_MAX ? styles.charOver : styles.charCount}>
              {' '}{pushBody.length}/{PUSH_MAX}
            </span>
          </label>
          <input
            className={styles.textInput}
            value={pushBody}
            placeholder="Did you know you can leave comments in the Reading Room?"
            onChange={e => setPushBody(e.target.value)}
          />
        </div>

        <div className={styles.field} style={{ marginTop: 12 }}>
          <label className={styles.fieldLabel}>
            Cabinet message
            <span className={message.length > MESSAGE_MAX ? styles.charOver : styles.charCount}>
              {' '}{message.length}/{MESSAGE_MAX}
            </span>
          </label>
          <textarea
            className={styles.bigTextarea}
            value={message}
            rows={7}
            placeholder="Did you know you can write in the margins? …"
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div className={styles.sectionLabel} style={{ marginTop: 16 }}>Audience</div>
        <div className={styles.chipRow}>
          {TIERS.map(t => (
            <button
              key={t}
              className={`${styles.chip} ${tiers.has(t) && !testOnly ? styles.chipOn : ''}`}
              disabled={testOnly}
              onClick={() => setTiers(prev => {
                const next = new Set(prev)
                if (next.has(t)) next.delete(t); else next.add(t)
                return next
              })}
            >
              {TIER_LABEL[t]} ({data?.counts[t] ?? 0})
            </button>
          ))}
          <button
            className={`${styles.chip} ${testOnly ? styles.chipOn : ''}`}
            onClick={() => setTestOnly(v => !v)}
          >
            Test — me only
          </button>
        </div>
        <p className={styles.muted} style={{ marginTop: 6 }}>
          {testOnly
            ? 'Goes to your account alone. Everything else behaves exactly as a real send.'
            : `${audienceSize} of ${data?.counts.total ?? 0} members. The audience is fixed when you schedule — anyone who joins later is not a recipient.`}
        </p>

        <div className={styles.sectionLabel} style={{ marginTop: 16 }}>When</div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Local day</label>
            <input
              className={styles.textInput}
              type="date"
              value={sendDate}
              disabled={sendHour === null}
              onChange={e => setSendDate(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Local hour</label>
            <select
              className={styles.textInput}
              value={sendHour === null ? 'asap' : String(sendHour)}
              onChange={e => setSendHour(e.target.value === 'asap' ? null : Number(e.target.value))}
            >
              <option value="asap">As soon as possible</option>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{fmtHour(h)}</option>
              ))}
            </select>
          </div>
        </div>
        <p className={styles.muted} style={{ marginTop: 6 }}>
          Measured in each member&apos;s own timezone, like the Daily Dispatch. Keep clear of 7am —
          that is when the dispatch push goes out, and two notifications in one morning is one too
          many.
        </p>

        <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 14, gap: 8 }}>
          <button className={styles.primaryBtn} disabled={!canSend || busy === 'schedule'} onClick={schedule}>
            {busy === 'schedule' ? 'Scheduling…' : sendHour === null ? '✦ Send now' : '✦ Schedule'}
          </button>
          <button className={styles.ghostBtn} disabled={!canSend || busy === 'save'} onClick={saveDraft}>
            {busy === 'save' ? 'Saving…' : 'Save draft'}
          </button>
          <button className={styles.ghostBtn} disabled={busy === 'push'} onClick={() => pushNow()}>
            {busy === 'push' ? 'Pushing…' : '↑ Run delivery agent'}
          </button>
        </div>
      </div>

      {/* ── Preview ────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Preview</div>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div>
            <div className={styles.sectionLabel}>Notification</div>
            <div style={{
              background: '#f2f2f5', color: '#111', borderRadius: 14, padding: '10px 12px',
              fontSize: 13, lineHeight: 1.4, boxShadow: '0 1px 3px rgba(0,0,0,.18)',
            }}>
              <div style={{ fontWeight: 700 }}>{counselorName === 'Their own cabinet' ? 'Marcus Aurelius' : counselorName}</div>
              <div>{pushBody || 'Your notification line appears here.'}</div>
            </div>
          </div>
          <div>
            <div className={styles.sectionLabel}>Cabinet chat</div>
            <div style={{ background: '#1a1a2e', borderRadius: 14, padding: 14 }}>
              <div style={{
                background: '#16213e', border: '1px solid #c9a84c44', borderRadius: 12, padding: '10px 12px',
              }}>
                <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: .4, marginBottom: 6 }}>
                  {(counselorName === 'Their own cabinet' ? 'Marcus Aurelius' : counselorName).toUpperCase()}
                </div>
                <div style={{ color: '#e0d5b5', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {message || 'Your Cabinet message appears here, as a post from the counselor the member can reply to.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sent and scheduled ─────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Broadcasts</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={load}>↺ Refresh</button>
        </div>
        {loading && !data ? (
          <p className={styles.muted}>Loading…</p>
        ) : (data?.broadcasts.length ?? 0) === 0 ? (
          <p className={styles.muted}>Nothing yet. Write one above.</p>
        ) : (
          (data?.broadcasts ?? []).map(b => {
            const speakerName = b.counselor_slug
              ? data?.counselors.find(c => c.slug === b.counselor_slug)?.name ?? b.counselor_slug
              : 'their own cabinet'
            return (
              <div key={b.id} className={styles.gapRow}>
                <div className={styles.gapRowMain}>
                  <div className={styles.gapTitle}>
                    {b.title} <span className={`${styles.pill} ${STATUS_PILL[b.status]}`}>{b.status}</span>
                  </div>
                  <div className={styles.gapMeta}>
                    {speakerName} · {b.audience?.label ?? 'Everyone'} ·{' '}
                    {b.send_date ? `${fmtDate(b.send_date)}, ${fmtHour(b.send_hour)}` : 'not scheduled'}
                  </div>
                  <div className={styles.gapMeta}>
                    {b.seeded_count}/{b.recipient_count} in cabinet · {b.pushed_count} pushed
                    {b.failed_count > 0 ? ` · ${b.failed_count} push failed` : ''}
                  </div>
                </div>
                <div className={styles.gapActions}>
                  {(b.status === 'draft' || b.status === 'cancelled') && (
                    <button className={styles.ghostBtn} onClick={() => edit(b)}>Edit</button>
                  )}
                  {(b.status === 'scheduled' || b.status === 'sending') && (
                    <button className={styles.ghostBtn} disabled={busy === b.id} onClick={() => cancel(b)}>Cancel</button>
                  )}
                  {b.status === 'draft' && (
                    <button className={styles.ghostBtn} disabled={busy === b.id} onClick={() => remove(b)}>Delete</button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
