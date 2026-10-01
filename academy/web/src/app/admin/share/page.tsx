'use client'

import { useState } from 'react'
import styles from '../admin.module.css'
import { DEFAULT_SHARE_DAYS, PLAYGROUND_PIECES, RELEASED_PLAYGROUND } from '@/lib/playground-share'

// Released pieces are public already, so only the rest need a link.
const UNRELEASED = PLAYGROUND_PIECES.filter(p => !RELEASED_PLAYGROUND.includes(p))
const OTHER = '__other'

// Private links to unreleased Playground pieces. A link opens one piece, and
// nothing else in the Playground, for whoever holds it until it expires.
// Forwarding works, so treat a link as shared with whoever might be sent it.
export default function ShareLinksPage() {
  const [choice, setChoice] = useState(UNRELEASED[0])
  const [other, setOther] = useState('')
  const piece = choice === OTHER ? other.trim() : choice
  const [days, setDays] = useState(DEFAULT_SHARE_DAYS)
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  async function make() {
    setError('')
    setLink(null)
    setCopied(false)
    setBusy(true)
    try {
      const res = await fetch('/api/admin/playground-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece, days }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not make the link')
      setLink(data)
      try {
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not make the link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Share Links</h1>
        <p>
          A private link to one Playground piece. It opens that piece and nothing else in the Playground, for
          anyone who has it, until it expires. Released pieces are already public and need no link. To revoke
          every link at once, change PLAYGROUND_SHARE_SECRET on Vercel and redeploy.
        </p>
      </div>

      <div className={styles.card}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={styles.field} style={{ marginBottom: 0 }}>
            <span className={styles.fieldLabel}>Piece</span>
            <select
              className={styles.textInput}
              value={choice}
              onChange={e => setChoice(e.target.value)}
              style={{ minWidth: 220 }}
            >
              {UNRELEASED.map(p => <option key={p} value={p}>{p}</option>)}
              <option value={OTHER}>Other path…</option>
            </select>
          </label>
          {choice === OTHER && (
            <label className={styles.field} style={{ marginBottom: 0 }}>
              <span className={styles.fieldLabel}>Path below /playground/</span>
              <input
                className={styles.textInput}
                value={other}
                onChange={e => setOther(e.target.value)}
                placeholder="perspectives/<slug>"
                style={{ minWidth: 240 }}
              />
            </label>
          )}
          <label className={styles.field} style={{ marginBottom: 0 }}>
            <span className={styles.fieldLabel}>Expires after</span>
            <select
              className={styles.textInput}
              value={days}
              onChange={e => setDays(Number(e.target.value))}
            >
              {[7, 30, 90, 365].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </label>
          <button className={styles.primaryBtn} onClick={make} disabled={busy || !piece}>
            {busy ? 'Making…' : 'Make link'}
          </button>
        </div>
      </div>

      {error && <div className={styles.card}><p className={styles.errText}>{error}</p></div>}
      {link && (
        <div className={styles.card}>
          <input
            className={styles.textInput}
            readOnly
            value={link.url}
            onFocus={e => e.currentTarget.select()}
            style={{ width: '100%' }}
          />
          <p className={styles.muted} style={{ marginTop: 8 }}>
            {copied ? 'Copied. ' : ''}Works until {new Date(link.expiresAt).toLocaleDateString()}.
          </p>
        </div>
      )}
    </div>
  )
}
