'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './admin.module.css'

// Shared admin chrome: one auth gate for every /admin/* route plus the
// top-level agent tab navigation. Individual pages render their own content.
// Tab order follows the fleet's weekly pipeline: daily substrate agents, the
// Monday thinking chain (Gap → Tension → Synthesis → Inquiry), the user-facing
// output, then the Sunday meta/dream agents and operational tools.
const TABS: { href: string; label: string }[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/corpus-agent', label: 'Corpus Agent' },
  { href: '/admin/journal-agent', label: 'Journal Agent' },
  { href: '/admin/world', label: 'World' },
  { href: '/admin/longitudinal', label: 'Longitudinal' },
  { href: '/admin/gap-agent', label: 'Gap Agent' },
  { href: '/admin/tensions', label: 'Tensions' },
  { href: '/admin/synthesis', label: 'Synthesis' },
  { href: '/admin/inquiry', label: 'Inquiry' },
  { href: '/admin/dispatch', label: 'Dispatch' },
  { href: '/admin/reflection', label: 'Self-Reflection' },
  { href: '/admin/dreams', label: 'Dreams' },
  { href: '/admin/scribe', label: 'Scribe' },
  { href: '/admin/scribe/chat', label: 'Scribe Chat' },
  { href: '/admin/scribe/log', label: 'Log' },
  { href: '/admin/scheduler', label: 'Scheduler' },
  { href: '/admin/corpus', label: 'Corpus Ingestion' },
  { href: '/admin/papers', label: 'Papers' },
  { href: '/admin/architecture', label: 'Architecture' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        setAuthorized(true)
      } else {
        router.push('/')
      }
      setAuthLoading(false)
    })
  }, [router])

  if (authLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Checking access…</p>
      </div>
    )
  }
  if (!authorized) return null

  // Longest matching tab wins, so /admin/scribe/chat doesn't also light the
  // Scribe tab (and /admin only matches exactly).
  const activeHref = TABS
    .filter(t => (t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
  const isActive = (href: string) => href === activeHref

  return (
    <div>
      <div className={styles.fleetBar}>
        <span className={styles.fleetTitle}>Arete Agents</span>
        <div className={styles.fleetTabs}>
          {TABS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className={`${styles.fleetTab} ${isActive(t.href) ? styles.fleetTabOn : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}
