import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Opens the Stripe Customer Portal for a student who subscribed through
// Stripe, so they can change plan, update a card, or cancel without leaving
// the Academy. Manually granted plans have no Stripe customer and get a 404.

const FALLBACK_URL = 'https://academy.pursuearete.com'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: sub, error } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .eq('billing_source', 'stripe')
      .maybeSingle()
    if (error) throw error
    if (!sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'This plan was not purchased through Stripe, so there is nothing to manage here.' },
        { status: 404 }
      )
    }

    const origin = req.headers.get('origin') ?? FALLBACK_URL
    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/dashboard/profile`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[/api/billing/portal]', error)
    const message = error instanceof Error ? error.message : 'Portal session failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
