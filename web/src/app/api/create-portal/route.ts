import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const FALLBACK_APP_URL = 'https://app.pursuearete.com'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = createSupabaseAdminClient()
    const { data: sub, error } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .eq('billing_source', 'stripe')
      .maybeSingle()
    if (error) throw error
    if (!sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe subscription found for this account' },
        { status: 404 }
      )
    }

    const appUrl = req.headers.get('origin') ?? FALLBACK_APP_URL
    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/upgrade`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[/api/create-portal]', error)
    const message = error instanceof Error ? error.message : 'Portal session failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
