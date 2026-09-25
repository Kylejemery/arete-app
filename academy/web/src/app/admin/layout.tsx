'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './admin.module.css'

// Shared admin chrome: one auth gate for every /admin/* route plus the
// top-level agent tab navigation. Individual pages render their own content.
//
// Tabs are grouped by what a destination is for, not by when its agent fires:
// the console, the corpus and what feeds it, the Monday thinking chain, the
// member-facing readers, everything that speaks outward, and the writing desk.
// Within a group, order still follows the pipeline (Gap → Tension → Synthesis
// → Inquiry). A tab belongs to exactly one group; add new ones to the group
// they read from rather than to the end of the list.
const TAB_GROUPS: { label: string; tabs: { href: string; label: string }[] }[] = [
  {
    label: 'Console',
    tabs: [
      { href: '/admin', label: 'Overview' },
      { href: '/admin/usage', label: 'Usage' },
      { href: '/admin/quality', label: 'Quality' },
      { href: '/admin/architecture', label: 'Architecture' },
    ],
  },
  {
    label: 'Corpus',
    tabs: [
      { href: '/admin/corpus-agent', label: 'Corpus Agent' },
      { href: '/admin/corpus', label: 'Ingestion' },
      { href: '/admin/papers', label: 'Papers' },
      { href: '/admin/gap-agent', label: 'Coverage Gap' },
    ],
  },
  {
    label: 'Thinking',
    tabs: [
      { href: '/admin/tensions', label: 'Tensions' },
      { href: '/admin/synthesis', label: 'Synthesis' },
      { href: '/admin/inquiry', label: 'Inquiry' },
      { href: '/admin/convergence', label: 'Convergence' },
      { href: '/admin/consolidation', label: 'Consolidation' },
      { href: '/admin/dreams', label: 'Dreams' },
      { href: '/admin/reflection', label: 'Self-Reflection' },
    ],
  },
  {
    label: 'Members',
    tabs: [
      { href: '/admin/journal-agent', label: 'Journal Agent' },
      { href: '/admin/distress', label: 'Distress' },
      { href: '/admin/longitudinal', label: 'Longitudinal' },
      { href: '/admin/enchiridion', label: 'Enchiridion' },
    ],
  },
  {
    label: 'Outward',
    tabs: [
      { href: '/admin/dispatch', label: 'Dispatch' },
      { href: '/admin/broadcasts', label: 'Broadcasts' },
      { href: '/admin/email', label: 'Email' },
      { href: '/admin/requests', label: 'Requests' },
      { href: '/admin/scheduler', label: 'Scheduler' },
      { href: '/admin/stoic-replies', label: 'Stoic Replies' },
      { href: '/admin/world', label: 'World' },
      { href: '/admin/moltbook', label: 'Moltbook' },
    ],
  },
  {
    label: 'Desk',
    tabs: [
      { href: '/admin/scribe', label: 'Scribe' },
      { href: '/admin/scribe/chat', label: 'Scribe Chat' },
      { href: '/admin/scribe/book', label: 'Book' },
      { href: '/admin/scribe/log', label: 'Log' },
    ],
  },
]

const TABS = TAB_GROUPS.flatMap(g => g.tabs)

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
        <div className={styles.fleetGroups}>
          {TAB_GROUPS.map(g => {
            const groupActive = g.tabs.some(t => isActive(t.href))
            return (
              <Fragment key={g.label}>
                <span
                  className={`${styles.fleetGroupLabel} ${groupActive ? styles.fleetGroupLabelOn : ''}`}
                >
                  {g.label}
                </span>
                <div className={styles.fleetTabs}>
                  {g.tabs.map(t => (
                    <Link
                      key={t.href}
                      href={t.href}
                      className={`${styles.fleetTab} ${isActive(t.href) ? styles.fleetTabOn : ''}`}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
              </Fragment>
            )
          })}
        </div>
      </div>
      {children}
    </div>
  )
}
