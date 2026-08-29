import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Account deletion (App Review 5.1.1(v)). Called by both the web settings
// page and the mobile app — mobile sends the Supabase JWT as a Bearer token,
// which is the only identity accepted here: an account can delete itself and
// nothing else.
//
// Tables whose user_id has no FK to auth.users — the cascades can't reach
// these, so they're deleted explicitly before the auth user. Order matters
// only for habit_logs → habits.
const ORPHAN_TABLES = [
  'habit_logs',
  'habits',
  'beliefs',
  'books',
  'cabinet_conversations', // cascades session_participants + session_messages
  'check_ins',
  'courtyard_presence',
  'milestones',
  'sessions',
  'weekly_reviews',
]

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Cancel any live Stripe subscription first — deleting the account must
    // never leave someone being billed for a service they can't access.
    // Failure here aborts the deletion: better a still-existing account than
    // an orphaned charge.
    const { data: stripeSubs, error: subsError } = await admin
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('billing_source', 'stripe')
      .not('stripe_subscription_id', 'is', null)
    if (subsError) throw subsError

    const live = (stripeSubs ?? []).filter(s =>
      ['active', 'trialing', 'past_due'].includes(s.status ?? '')
    )
    if (live.length > 0) {
      const stripe = getStripe()
      for (const sub of live) {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id as string)
      }
    }

    // Sweep the FK-less tables, then delete the auth user — every table with
    // a CASCADE FK (profiles, subscriptions, journal_entries, ...) follows.
    for (const table of ORPHAN_TABLES) {
      const { error } = await admin.from(table).delete().eq('user_id', user.id)
      // A missing legacy table shouldn't block deletion; anything else should.
      if (error && error.code !== '42P01') throw error
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    console.log(`[delete-account] deleted account ${user.id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[delete-account] failed:', error)
    return NextResponse.json(
      { error: 'Account deletion failed. Please try again or contact support.' },
      { status: 500 }
    )
  }
}
