import { NextRequest, NextResponse } from 'next/server'
import { getStripe, requireEnv } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Starts a Stripe Checkout session for the signed-in Academy student. Mirrors
// web/src/app/api/create-checkout on app.pursuearete.com: same price ids,
// same customer reuse via the subscriptions table, same 7-day first-time
// trial. Entitlement is granted by the Stripe webhook registered on
// app.pursuearete.com (events are account-wide), which writes profiles.tier —
// this route never touches entitlement itself.

const FALLBACK_URL = 'https://academy.pursuearete.com'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const planPrices: Record<string, string> = {
      monthly: requireEnv('STRIPE_PRICE_MONTHLY'),
      yearly: requireEnv('STRIPE_PRICE_YEARLY'),
      pro: requireEnv('STRIPE_PRICE_PRO'),
    }
    const priceId = typeof body.plan === 'string' ? planPrices[body.plan] : undefined
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const stripe = getStripe()
    const admin = createAdminClient()

    const { data: existing, error: lookupError } = await admin
      .from('subscriptions')
      .select('id, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('billing_source', 'stripe')
      .maybeSingle()
    if (lookupError) throw lookupError

    // First-time subscribers only: a row that has ever held a subscription id
    // means this user subscribed before, so a cancel-and-resubscribe never
    // re-trials.
    const trialEligible = !existing?.stripe_subscription_id

    let customerId = existing?.stripe_customer_id ?? null
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if ((customer as { deleted?: boolean }).deleted) customerId = null
      } catch (err) {
        if ((err as { code?: string }).code === 'resource_missing') customerId = null
        else throw err
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      if (existing) {
        const { error } = await admin
          .from('subscriptions')
          .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await admin.from('subscriptions').insert({
          user_id: user.id,
          stripe_customer_id: customerId,
          billing_source: 'stripe',
        })
        if (error) throw error
      }
    }

    const origin = req.headers.get('origin') ?? FALLBACK_URL
    const idempotencyKey = `academy-checkout:${user.id}:${priceId}:${Math.floor(Date.now() / 600_000)}`
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/dashboard/profile?status=success`,
        cancel_url: `${origin}/dashboard/profile?status=cancelled`,
        client_reference_id: user.id,
        metadata: { supabase_user_id: user.id },
        subscription_data: {
          metadata: { supabase_user_id: user.id },
          ...(trialEligible ? { trial_period_days: 7 } : {}),
        },
      },
      { idempotencyKey }
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[/api/billing/checkout]', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
