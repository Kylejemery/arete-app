'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getIsPremium } from './db'

export interface SubscriptionState {
  tier: string
  isPremium: boolean
  loading: boolean
}

/**
 * Client hook exposing the user's premium state. Delegates the unlock
 * decision to getIsPremium() (single source of the OR logic across
 * tier/is_premium — do not fork it) and reads the raw tier for display.
 */
export function useSubscription(): SubscriptionState {
  const [tier, setTier] = useState<string>('free')
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }
      const [premium, profile] = await Promise.all([
        getIsPremium(),
        supabase.from('profiles').select('tier').eq('id', user.id).single(),
      ])
      if (cancelled) return
      setIsPremium(premium)
      setTier(profile.data?.tier ?? 'free')
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { tier, isPremium, loading }
}
