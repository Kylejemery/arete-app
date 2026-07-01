'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './admin.module.css'

// Shared admin chrome: one auth gate for every /admin/* route plus the
// top-level agent tab navigation. Individual pages render their own content.
const TABS: { href: string; label: string }[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/corpus-agent', label: 'Corpus Agent' },
  { href: '/admin/journal-agent', label: 'Journal Agent' },
  { href: '/admin/gap-agent', label: 'Gap Agent' },
  { href: '/admin/synthesis', label: 'Synthesis' },
  { href: '/admin/inquiry', label: 'Inquiry' },
  { href: '/admin/dispatch', label: 'Dispatch' },
  { href: '/admin/reflection', label: 'Self-Reflection' },
  { href: '/admin/longitudinal', label: 'Longitudinal' },
  { href: '/admin/world', label: 'World' },
  { href: '/admin/scheduler', label: 'Scheduler' },
  { href: '/admin/corpus', label: 'Corpus Ingestion' },
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

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

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
