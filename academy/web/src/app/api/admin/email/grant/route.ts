import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Temporary Premium grants from the admin Email tab. Both halves live in
// Postgres (see the manual_premium_grants migration): grant_manual_premium
// writes the manual subscriptions row + flips the profile in one transaction,
// expire_manual_grants deletes a grant and downgrades the profile only when
// no other entitlement (Stripe, Apple, permanent manual) remains. A pg_cron
// job runs the sweep every 30 minutes; the recipients route also runs it on
// every load as a safety net.

const MAX_DAYS = 365

type Body = { action?: 'grant' | 'revoke'; userId?: string; days?: number }

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const userId = typeof body.userId === 'string' ? body.userId : ''
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Admin client unavailable' },
      { status: 500 }
    )
  }

  if (body.action === 'revoke') {
    const { data, error } = await admin.rpc('expire_manual_grants', { p_user_id: userId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, revoked: data ?? 0 })
  }

  if (body.action === 'grant') {
    const days = Math.floor(Number(body.days))
    if (!Number.isFinite(days) || days < 1 || days > MAX_DAYS) {
      return NextResponse.json({ error: `days must be between 1 and ${MAX_DAYS}` }, { status: 400 })
    }
    const { data, error } = await admin.rpc('grant_manual_premium', { p_user_id: userId, p_days: days })
    if (error) {
      // The function raises a plain-text message for the two expected refusals
      // (unknown user, user already entitled); surface those as 409.
      const conflict = /already|not found/i.test(error.message)
      return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 500 })
    }
    return NextResponse.json({ ok: true, expiresAt: data })
  }

  return NextResponse.json({ error: 'action must be "grant" or "revoke"' }, { status: 400 })
}
