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

    const { priceId } = await req.json()
    const allowedPrices = [
      requireEnv('STRIPE_PRICE_MONTHLY'),
      requireEnv('STRIPE_PRICE_YEARLY'),
      requireEnv('STRIPE_PRICE_PRO'),
    ]
    if (!priceId || !allowedPrices.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid priceId' }, { status: 400 })
    }

    const stripe = getStripe()
    const admin = createSupabaseAdminClient()

    // Reuse an existing Stripe customer so we never create duplicates
    const { data: existing, error: lookupError } = await admin
      .from('subscriptions')
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .eq('billing_source', 'stripe')
      .maybeSingle()
    if (lookupError) throw lookupError

    let customerId = existing?.stripe_customer_id ?? null
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
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/upgrade?status=success`,
      cancel_url: `${appUrl}/upgrade?status=cancelled`,
      client_reference_id: user.id,
      // Stamp the user id on both the session and the subscription so the
      // webhook can resolve the user without a customer lookup
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[/api/create-checkout]', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
