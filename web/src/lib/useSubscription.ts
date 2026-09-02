'use client'

import { useEffect, useState } from 'react'
import { getIsPremium, getSubscriptionTier } from './db'
import type { SubscriptionTier } from './types'

export interface SubscriptionState {
  tier: SubscriptionTier
  isPremium: boolean
  loading: boolean
}

async function fetchState(): Promise<{ tier: SubscriptionTier; isPremium: boolean }> {
  try {
    const [tier, isPremium] = await Promise.all([getSubscriptionTier(), getIsPremium()])
    return { tier, isPremium }
  } catch {
    return { tier: 'free', isPremium: false }
  }
}

/**
 * Client hook exposing the user's entitlement. Entitlement is READ-ONLY on
 * the client — it is written server-side only, by the Stripe webhook. The
 * tier is re-read when the tab becomes visible again so a purchase or
 * cancellation completed in the Stripe portal shows up without a reload.
 */
export function useSubscription(): SubscriptionState {
  const [tier, setTier] = useState<SubscriptionTier>('free')
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const next = await fetchState()
      if (!cancelled) {
        setTier(next.tier)
        setIsPremium(next.isPremium)
        setLoading(false)
      }
    }

    load()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return { tier, isPremium, loading }
}

// Only the free tier enforces a client-visible daily message cap. Paid tiers
// are gated server-side and show no counter.
const MAX_MESSAGES_BY_TIER: Record<SubscriptionTier, number | null> = {
  free: 10,
  premium: null,
  pro: null,
}

export function useTierLimits(): { tier: SubscriptionTier; maxMessages: number | null } {
  const { tier } = useSubscription()
  return { tier, maxMessages: MAX_MESSAGES_BY_TIER[tier] }
}
