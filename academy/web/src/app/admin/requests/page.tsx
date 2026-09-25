'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'
import type { RequestCluster } from '@/app/api/admin/requests/route'

// Ideas members asked the Cabinet to pass along (personalization run C,
// Part C3), grouped by need. Counts exclude admin and internal accounts.
// Nothing here identifies who asked.
export default function RequestsPage() {
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [clusters, setClusters] = useState<RequestCluster[]>([])
  const [pending, setPending] = useState(0)
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
      const res = await fetch('/api/admin/requests', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setClusters(data.clusters)
      setPending(data.pending)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [])

  useEffect(() => {
    if (!authorized) return
    // Retry any idea whose summary or clustering failed the first time, then
    // show the list.
    fetch('/api/admin/requests/process', { method: 'POST' }).catch(() => {}).finally(() => { load() })
  }, [authorized, load])

  if (authLoading) {
    return <div className={styles.page}><p className={styles.muted}>Checking access…</p></div>
  }
  if (!authorized) return null

  const cell = { padding: '8px', verticalAlign: 'top' as const }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Requests</h1>
        <p>
          Ideas members asked the Cabinet to pass along, grouped by need. Counts exclude admin and internal accounts.
          Summaries are rewritten without personal details; nothing here says who asked.
        </p>
      </div>

      {error && <div className={styles.card}><p className={styles.errText}>{error}</p></div>}
      {pending > 0 && (
        <div className={styles.card}><p className={styles.muted}>{pending} passed-along idea{pending === 1 ? '' : 's'} still being summarized.</p></div>
      )}

      <div className={styles.card}>
        {clusters.length === 0 ? (
          <p className={styles.muted}>No ideas passed along yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Need', 'People', 'Last asked', 'Status'].map(h => (
                  <th key={h} className={styles.sectionLabel} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clusters.map(c => (
                <tr key={c.id} style={{ borderTop: '0.5px solid #eee' }}>
                  <td style={{ ...cell, maxWidth: 460 }}>
                    <strong>{c.title}</strong>
                    {c.samples.length > 1 && (
                      <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                        {c.samples.filter(sm => sm !== c.title).map(sm => <li key={sm} className={styles.muted}>{sm}</li>)}
                      </ul>
                    )}
                  </td>
                  <td style={cell}>{c.requesters}</td>
                  <td style={cell}>{c.lastRequestedAt ? new Date(c.lastRequestedAt).toLocaleDateString() : '—'}</td>
                  <td style={cell}>{c.status === 'shipped' ? `Shipped as ${c.moduleKey}` : c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
