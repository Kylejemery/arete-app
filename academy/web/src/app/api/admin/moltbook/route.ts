import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// The Moltbook worker (moltbook-agent/, deployed on Railway) shares this
// Supabase project. These routes only touch its control tables — the worker
// itself reads moltbook_agent_config fresh every tick, so changes here take
// effect within one tick with no redeploy.

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// GET /api/admin/moltbook — config, last-24h action count, and the recent log.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [{ data: config, error: cErr }, { data: actions, error: aErr }, { count: last24h }] =
      await Promise.all([
        admin
          .from('moltbook_agent_config')
          .select('enabled, paused_reason, max_actions_day, updated_at')
          .eq('id', 1)
          .single(),
        admin
          .from('moltbook_agent_actions')
          .select('id, created_at, kind, target_id, submolt, body, reason, status, error')
          .order('created_at', { ascending: false })
          .limit(100),
        admin
          .from('moltbook_agent_actions')
          .select('id', { count: 'exact', head: true })
          .in('kind', ['comment', 'post'])
          .eq('status', 'ok')
          .gte('created_at', since),
      ])
    if (cErr) throw new Error(cErr.message)
    if (aErr) throw new Error(aErr.message)

    return NextResponse.json({ config, actions: actions ?? [], last24h: last24h ?? 0 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load Moltbook agent state' },
      { status: 500 }
    )
  }
}

// POST /api/admin/moltbook — update the kill switch and/or daily budget.
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof body.enabled === 'boolean') {
      patch.enabled = body.enabled
      // Enabling clears the pause note; disabling records why.
      patch.paused_reason = body.enabled ? null : (body.paused_reason ?? 'paused from admin')
    }
    if (typeof body.max_actions_day === 'number' && Number.isInteger(body.max_actions_day)) {
      if (body.max_actions_day < 0 || body.max_actions_day > 100) {
        return NextResponse.json({ error: 'max_actions_day must be 0–100' }, { status: 400 })
      }
      patch.max_actions_day = body.max_actions_day
    }
    if (Object.keys(patch).length === 1) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('moltbook_agent_config')
      .update(patch)
      .eq('id', 1)
      .select('enabled, paused_reason, max_actions_day, updated_at')
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ config: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update config' },
      { status: 500 }
    )
  }
}
