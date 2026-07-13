import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createSupabaseAdminClient, requireEnv } from '@/lib/supabaseServer'

// Signature verification needs the raw body; in the App Router the body is
// only parsed when you ask for it, so req.text() below is the raw payload.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Stripe price → Arete tier. Monthly and yearly are both the premium tier;
// Pro is its own tier and unlocks via is_premium=true under getIsPremium()'s
// OR logic. Read lazily so a missing env var fails the request, not the build.
function getPriceTierMap(): Record<string, string> {
  return {
    [requireEnv('STRIPE_PRICE_MONTHLY')]: 'premium',
    [requireEnv('STRIPE_PRICE_YEARLY')]: 'premium',
    [requireEnv('STRIPE_PRICE_PRO')]: 'pro',
  }
}

// Statuses that grant premium. past_due is deliberately in neither list:
// it records on the subscription row but leaves the profile untouched
// (grace period) until Stripe resolves it to active or canceled.
const GRANT_STATUSES = ['active', 'trialing']
const REVOKE_STATUSES = ['canceled', 'unpaid', 'incomplete_expired', 'paused']

export async function POST(req: NextRequest) {
  const stripe = getStripe()

  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      requireEnv('STRIPE_WEBHOOK_SECRET')
    )
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode === 'subscription' && session.subscription) {
          // Fetch the live subscription state so a re-delivered event
          // converges on current truth instead of replaying stale data
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          )
          await syncStripeSubscription(
            subscription,
            session.client_reference_id ?? session.metadata?.supabase_user_id ?? null
          )
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncStripeSubscription(event.data.object, null)
        break
      }
      default:
        break
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`[stripe-webhook] failed handling ${event.type}:`, error)
    // 500 → Stripe retries the delivery
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

/**
 * Bring the subscriptions row and profiles premium state in line with a
 * Stripe subscription object. Idempotent: every delivery converges on the
 * same row (one per user via the partial unique index) and the same
 * profiles state, so retries and re-deliveries are safe.
 */
async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId: string | null
) {
  const admin = createSupabaseAdminClient()
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  // Resolve the Arete user: subscription metadata first (stamped at
  // checkout), then the fallback from the session, then customer lookup
  let userId = subscription.metadata?.supabase_user_id ?? fallbackUserId
  if (!userId) {
    const { data } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .eq('billing_source', 'stripe')
      .maybeSingle()
    userId = data?.user_id ?? null
  }
  if (!userId) {
    console.error(
      `[stripe-webhook] cannot attribute subscription ${subscription.id} (customer ${customerId}) to a user`
    )
    return
  }

  const item = subscription.items.data[0]
  const priceId = item?.price.id ?? null
  const tier = priceId ? getPriceTierMap()[priceId] ?? null : null
  if (priceId && !tier) {
    console.error(`[stripe-webhook] unmapped Stripe price ${priceId} — recording row without tier`)
  }
  const status = subscription.status
  // API 2025-03-31+ keeps current_period_end on the subscription item
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null

  // Upsert the single Stripe row for this user (select-then-write because
  // ON CONFLICT can't target the partial unique index through PostgREST)
  const row = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status,
    price_id: priceId,
    tier,
    current_period_end: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  }
  const { data: existing, error: lookupError } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('billing_source', 'stripe')
    .maybeSingle()
  if (lookupError) throw lookupError

  if (existing) {
    const { error } = await admin.from('subscriptions').update(row).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await admin
      .from('subscriptions')
      .insert({ ...row, user_id: userId, billing_source: 'stripe' })
    if (error) throw error
  }

  if (GRANT_STATUSES.includes(status) && tier) {
    // Always write both premium columns together
    const { error } = await admin
      .from('profiles')
      .update({ tier, is_premium: true, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) throw error
  } else if (REVOKE_STATUSES.includes(status)) {
    // billing_source guard: a lapsed Stripe subscription must never clobber
    // an Apple or manually-granted tier — only downgrade when no such row exists
    const { data: otherSource, error: guardError } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .in('billing_source', ['apple', 'manual'])
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
}
