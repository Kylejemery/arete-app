import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
  requireEnv,
} from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const FALLBACK_APP_URL = 'https://app.pursuearete.com'

export async function POST(req: NextRequest) {
  try {
    // Authenticate the caller from the Supabase session cookie
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // The client sends a plan key; the price ids live in server-only env.
    // A raw priceId is also accepted as long as it matches one of the three.
    const body = await req.json()
    const planPrices: Record<string, string> = {
      monthly: requireEnv('STRIPE_PRICE_MONTHLY'),
      yearly: requireEnv('STRIPE_PRICE_YEARLY'),
      pro: requireEnv('STRIPE_PRICE_PRO'),
    }
    const priceId: string | undefined =
      typeof body.plan === 'string' ? planPrices[body.plan] : undefined
    const resolvedPriceId =
      priceId ??
      (Object.values(planPrices).includes(body.priceId) ? (body.priceId as string) : undefined)
    if (!resolvedPriceId) {
      return NextResponse.json({ error: 'Invalid plan or priceId' }, { status: 400 })
    }

    const stripe = getStripe()
    const admin = createSupabaseAdminClient()

    // Reuse an existing Stripe customer so we never create duplicates
    const { data: existing, error: lookupError } = await admin
      .from('subscriptions')
      .select('id, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('billing_source', 'stripe')
      .maybeSingle()
    if (lookupError) throw lookupError

    // 7-day free trial for first-time subscribers only. A row that has ever
    // held a subscription id means this user subscribed before, so a
    // cancel-and-resubscribe never re-trials. Checkout still collects the
    // card up front, so trials convert automatically unless cancelled.
    const trialEligible = !existing?.stripe_subscription_id

    let customerId = existing?.stripe_customer_id ?? null

    // A stored id can go stale — most commonly a sandbox customer id left in
    // the row after a test/live mode switch ("No such customer"). Verify it
    // before reuse and fall through to creation if it's gone or deleted.
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if ((customer as { deleted?: boolean }).deleted) customerId = null
      } catch (err) {
        if ((err as { code?: string }).code === 'resource_missing') {
          customerId = null
        } else {
          throw err
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      // Persist immediately so a second checkout attempt reuses the customer
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

    const appUrl = req.headers.get('origin') ?? FALLBACK_APP_URL
    // Idempotency: a double-click or client retry inside the same 10-minute
    // window returns the same session instead of minting duplicates.
    const idempotencyKey = `checkout:${user.id}:${resolvedPriceId}:${Math.floor(Date.now() / 600_000)}`
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: `${appUrl}/upgrade?status=success`,
      cancel_url: `${appUrl}/upgrade?status=cancelled`,
      client_reference_id: user.id,
      // Stamp the user id on both the session and the subscription so the
      // webhook can resolve the user without a customer lookup
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
        ...(trialEligible ? { trial_period_days: 7 } : {}),
      },
    },
    { idempotencyKey })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[/api/create-checkout]', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
