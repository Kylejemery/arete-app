import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createSupabaseAdminClient, requireEnv } from '@/lib/supabaseServer'

// RevenueCat posts JSON with a shared-secret Authorization header (set on the
// webhook in the RevenueCat dashboard). There is no signature scheme, so the
// header is the only thing standing between this route and a forged grant —
// compare it in constant time and never fall back to "no secret configured".
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// RevenueCat entitlement identifier → Arete tier. Highest wins, matching
// lib/purchases.ts on the mobile side.
const ENTITLEMENT_TIERS: { entitlement: string; tier: string }[] = [
  { entitlement: 'arete_pro', tier: 'pro' },
  { entitlement: 'arete', tier: 'premium' },
]

// Events that mean the user currently holds the entitlement.
const GRANT_EVENTS = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'TRANSFER',
]

// Only EXPIRATION revokes. CANCELLATION means auto-renew was switched off —
// the user keeps access until the period actually ends, so treating it as a
// revoke would cut off someone who already paid for the remaining term.
const REVOKE_EVENTS = ['EXPIRATION']

function authorized(req: NextRequest): boolean {
  const expected = requireEnv('REVENUECAT_WEBHOOK_SECRET')
  const provided = req.headers.get('authorization') ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// Only the fields this handler actually reads. RevenueCat sends a great deal
// more, and the body is attacker-reachable until `authorized` has passed, so
// every field stays optional and nothing here is trusted to exist.
interface RevenueCatEvent {
  type?: string
  app_user_id?: string
  entitlement_ids?: unknown
  expiration_at_ms?: number
  product_id?: string
}

interface RevenueCatPayload {
  event?: RevenueCatEvent
}

function tierForEntitlements(entitlementIds: unknown): string | null {
  const ids = Array.isArray(entitlementIds) ? entitlementIds : []
  for (const { entitlement, tier } of ENTITLEMENT_TIERS) {
    if (ids.includes(entitlement)) return tier
  }
  return null
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: RevenueCatPayload
  try {
    payload = (await req.json()) as RevenueCatPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = payload?.event
  const type: string = event?.type ?? ''

  // app_user_id is the Supabase user id — configurePurchases() passes it as
  // appUserID. Anonymous ids ($RCAnonymousID:...) mean the purchase happened
  // before the SDK was configured with a real user and cannot be attributed.
  const userId: string | undefined = event?.app_user_id
  if (!userId || userId.startsWith('$RCAnonymousID')) {
    console.error(`[revenuecat-webhook] ${type}: unattributable app_user_id "${userId}"`)
    // 200 so RevenueCat stops retrying something that can never succeed.
    return NextResponse.json({ received: true, attributed: false })
  }

  const isGrant = GRANT_EVENTS.includes(type)
  const isRevoke = REVOKE_EVENTS.includes(type)
  if (!isGrant && !isRevoke) {
    return NextResponse.json({ received: true, ignored: type })
  }

  try {
    const admin = createSupabaseAdminClient()
    const tier = tierForEntitlements(event?.entitlement_ids)
    const expiresAt = event?.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null

    // Upsert the single apple row for this user. Select-then-write because the
    // table's unique index is partial on billing_source='stripe'.
    const row = {
      status: isGrant ? 'active' : 'expired',
      price_id: event?.product_id ?? null,
      tier: tier ?? null,
      current_period_end: expiresAt,
      updated_at: new Date().toISOString(),
    }

    const { data: existing, error: lookupError } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('billing_source', 'apple')
      .maybeSingle()
    if (lookupError) throw lookupError

    if (existing) {
      const { error } = await admin.from('subscriptions').update(row).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await admin
        .from('subscriptions')
        .insert({ ...row, user_id: userId, billing_source: 'apple' })
      if (error) throw error
    }

    if (isGrant && tier) {
      // Always write both entitlement columns together, same as the Stripe
      // webhook — mobile and web each read one half of the OR.
      const { error } = await admin
        .from('profiles')
        .update({ tier, is_premium: true, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) throw error
    } else if (isRevoke) {
      // Mirror of the Stripe webhook's guard: an expired Apple subscription
      // must not clobber a live Stripe subscription or a manual grant.
      const { data: otherSource, error: guardError } = await admin
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .in('billing_source', ['stripe', 'manual'])
        .limit(1)
        .maybeSingle()
      if (guardError) throw guardError

      if (!otherSource) {
        const { error } = await admin
          .from('profiles')
          .update({ tier: 'free', is_premium: false, updated_at: new Date().toISOString() })
          .eq('id', userId)
        if (error) throw error
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`[revenuecat-webhook] failed handling ${type}:`, error)
    // 500 → RevenueCat retries the delivery.
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
