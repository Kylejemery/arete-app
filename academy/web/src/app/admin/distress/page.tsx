'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'

type Item = {
  id: string
  user_id: string
  distress_notes: string | null
  status: string
  created_at: string
  analysis: { analysis_week: string } | null
}

const ACTIONS = [
  { label: 'Mark Reviewed', value: 'reviewed' },
  { label: 'Escalate', value: 'escalated' },
  { label: 'Dismiss', value: 'dismissed' },
]

export default function DistressQueuePage() {
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')
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
      const res = await fetch('/api/admin/distress', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setItems(data.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [])

  useEffect(() => {
    if (authorized) load()
  }, [authorized, load])

  async function updateStatus(id: string, status: string) {
    await fetch('/api/admin/distress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  if (authLoading) {
    return <div className={styles.page}><p className={styles.muted}>Checking access…</p></div>
  }
  if (!authorized) return null

  const cell = { padding: '8px', verticalAlign: 'top' as const }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Distress review queue</h1>
        <p>Flagged journal analyses held for human review — never auto-delivered to users.</p>
      </div>

      {error && <div className={styles.card}><p className={styles.errText}>{error}</p></div>}

      <div className={styles.card}>
        {items.length === 0 ? (
          <p className={styles.muted}>Nothing flagged.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['User', 'Week', 'Notes', 'Status', 'Actions'].map(h => (
                  <th key={h} className={styles.sectionLabel} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} style={{ borderTop: '0.5px solid #eee' }}>
                  <td style={{ ...cell, fontFamily: 'monospace' }}>{i.user_id.slice(0, 8)}</td>
                  <td style={cell}>{i.analysis?.analysis_week ?? '—'}</td>
                  <td style={{ ...cell, maxWidth: 360 }}>{i.distress_notes ?? '—'}</td>
                  <td style={cell}>{i.status}</td>
                  <td style={cell}>
                    {i.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {ACTIONS.map(a => (
                          <button
                            key={a.value}
                            className={styles.ghostBtn}
                            style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                            onClick={() => updateStatus(i.id, a.value)}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.muted}>—</span>
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
