import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// POST /api/admin/quality-audit/mute — accept a finding as known debt.
//
// A reason is required and not as ceremony: an unexplained mute is
// indistinguishable from a bug being hidden, and the whole point of the mute
// list is that the next reader can tell the difference. `expires_at` makes a
// mute a deferral rather than a deletion — the finding comes back on its own.
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const fingerprint = typeof body?.fingerprint === 'string' ? body.fingerprint.trim() : ''
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    const expiresAt = body?.expires_at || null

    if (!fingerprint) return NextResponse.json({ error: 'fingerprint is required' }, { status: 400 })
    if (!reason) return NextResponse.json({ error: 'A reason is required to mute a finding' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin
      .from('quality_audit_mutes')
      .upsert({ fingerprint, reason, expires_at: expiresAt }, { onConflict: 'fingerprint' })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, fingerprint })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to mute finding' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/quality-audit/mute?fingerprint=... — lift a mute. The
// finding returns on the next run, marked new.
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fingerprint = new URL(req.url).searchParams.get('fingerprint')
  if (!fingerprint) return NextResponse.json({ error: 'fingerprint is required' }, { status: 400 })

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('quality_audit_mutes').delete().eq('fingerprint', fingerprint)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, fingerprint })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to lift mute' },
      { status: 500 }
    )
  }
}
