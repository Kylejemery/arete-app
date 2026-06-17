'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email
      // Only your email gets in
      if (email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        setAuthorized(true)
      } else {
        router.push('/')
      }
      setLoading(false)
    })
  }, [router])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <p style={{ color: '#888' }}>Checking access...</p>
    </div>
  )

  if (!authorized) return null

  return <AdminDashboard />
}
