'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://arete-app-production.up.railway.app'

/**
 * Site-wide toast for shared-session invites the user never saw in email:
 * "{Name} has invited you to a shared Cabinet session." Join routes through
 * the existing /join flow; Dismiss remembers the token in localStorage.
 * Renders nothing when signed out or already on the join page.
 */
export default function PendingInviteToast() {
  const pathname = usePathname()
  const [invite, setInvite] = useState<{ token: string; inviterName: string } | null>(null)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const response = await fetch(`${API_BASE_URL}/api/sessions/pending-invite`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!response.ok) return
        const data = await response.json().catch(() => ({}))
        const found = data?.invite
        if (!found?.token) return
        try {
          if (localStorage.getItem(`dismissed_invite_${found.token}`)) return
        } catch { /* storage unavailable — show it */ }
        setInvite({ token: found.token, inviterName: found.inviterName || 'Someone' })
      } catch {
        /* best-effort — never block the page over an invite check */
      }
    })()
  }, [])

  if (!invite || pathname?.startsWith('/join')) return null

  const dismiss = () => {
    try { localStorage.setItem(`dismissed_invite_${invite.token}`, '1') } catch { /* ignore */ }
    setInvite(null)
  }

  return (
    <div
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 shadow-2xl"
      style={{ background: '#16213e', border: '1px solid rgba(201,168,76,0.4)' }}
    >
      <p className="text-[15px] font-bold mb-1" style={{ color: '#e0d5b5' }}>
        👥 {invite.inviterName} has invited you to a shared Cabinet session
      </p>
      <p className="text-[12px] leading-relaxed mb-4" style={{ color: '#8A9BB0' }}>
        You each bring your philosophical profile, and your counselors respond to both
        of you together.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={dismiss}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ color: '#9aa0a6', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          Not now
        </button>
        <a
          href={`/join?token=${encodeURIComponent(invite.token)}`}
          className="px-4 py-2 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90"
          style={{ background: '#c9a84c', color: '#1a1a2e' }}
        >
          Join Session
        </a>
      </div>
    </div>
  )
}
