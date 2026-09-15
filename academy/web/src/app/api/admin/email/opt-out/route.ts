import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Sticky "do not email" flag for the admin Email tab. A member who replies
// asking to be taken off the list is marked once here; from then on the
// roster greys them out, the quick picks and select-all skip them, and the
// send route refuses to mail them even if their id is submitted. Nothing is
// deleted, so marking them again with optOut=false re-enables them.

type Body = { userId?: string; optOut?: boolean }

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
  if (typeof body.optOut !== 'boolean') {
    return NextResponse.json({ error: 'optOut must be true or false' }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Admin client unavailable' },
      { status: 500 }
    )
  }

  const optOutAt = body.optOut ? new Date().toISOString() : null
  const { data, error } = await admin
    .from('profiles')
    .update({ email_opt_out: body.optOut, email_opt_out_at: optOutAt })
    .eq('id', userId)
    .select('id, email, email_opt_out, email_opt_out_at')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    userId: data.id,
    email: data.email,
    optOut: !!data.email_opt_out,
    optOutAt: data.email_opt_out_at ?? null,
  })
}
