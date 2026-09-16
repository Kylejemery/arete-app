import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const FALLBACK_APP_URL = 'https://app.pursuearete.com'

// POST /api/enchiridion-checkout { requestId } — one-time Stripe Checkout for
// a printed Enchiridion. The request row (created by the Railway server when
// the member tapped Request on the Progress screen) carries the price that
// was quoted; this route charges exactly that and lets Stripe collect the
// shipping address, which the webhook copies onto the request. Physical
// goods are sold on the web, never through the App Store.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const requestId: string | undefined = typeof body.requestId === 'string' ? body.requestId : undefined
    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const { data: request, error } = await admin
      .from('enchiridion_requests')
      .select('id, user_id, format, price_cents, currency, status, payment_ref')
      .eq('id', requestId)
      .maybeSingle()
    if (error) throw error
    if (!request || request.user_id !== user.id) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    if (['paid', 'printing', 'shipped', 'delivered'].includes(request.status)) {
      return NextResponse.json({ error: 'This request is already paid' }, { status: 409 })
    }
    if (request.status === 'cancelled') {
      return NextResponse.json({ error: 'This request was cancelled' }, { status: 409 })
    }

    const { data: cfg } = await admin
      .from('agent_config')
      .select('config')
      .eq('agent_name', 'enchiridion-agent')
      .maybeSingle()
    const formats = (cfg?.config?.formats ?? {}) as Record<string, { label?: string }>
    const label = formats[request.format]?.label ?? request.format

    const stripe = getStripe()

    // Reuse the member's Stripe customer if they have one from a subscription.
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .eq('billing_source', 'stripe')
      .maybeSingle()
    let customerId = sub?.stripe_customer_id ?? null
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if ((customer as { deleted?: boolean }).deleted) customerId = null
      } catch (err) {
        if ((err as { code?: string }).code === 'resource_missing') customerId = null
        else throw err
      }
    }

    const appUrl = req.headers.get('origin') ?? FALLBACK_APP_URL
    const idempotencyKey = `enchiridion:${request.id}:${Math.floor(Date.now() / 600_000)}`
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ...(customerId ? { customer: customerId } : { customer_email: user.email ?? undefined }),
      line_items: [{
        quantity: 1,
        price_data: {
          currency: request.currency || 'usd',
          unit_amount: request.price_cents,
          product_data: {
            name: `Your Enchiridion, ${label}`,
            description: 'A printed handbook compiled from your own writing in Arete, set beside the texts.',
          },
        },
      }],
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'IE', 'AU', 'NZ'] },
      success_url: `${appUrl}/enchiridion?request=${request.id}&status=success`,
      cancel_url: `${appUrl}/enchiridion?request=${request.id}&status=cancelled`,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, enchiridion_request_id: request.id },
      payment_intent_data: {
        metadata: { supabase_user_id: user.id, enchiridion_request_id: request.id },
      },
    }, { idempotencyKey })

    await admin
      .from('enchiridion_requests')
      .update({ status: 'awaiting_payment', payment_provider: 'stripe', updated_at: new Date().toISOString() })
      .eq('id', request.id)
      .in('status', ['requested', 'generating', 'proofing', 'awaiting_payment'])

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[/api/enchiridion-checkout]', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
