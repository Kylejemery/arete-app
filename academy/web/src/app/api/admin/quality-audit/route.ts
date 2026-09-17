import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/quality-audit — the Quality tab. Returns the latest completed
// run ("current"), the last 14 runs for the history strip, and the live mute
// list so the UI can show what is being suppressed and offer to lift it.
// Admin-gated, same ADMIN_EMAIL pattern as the other admin routes.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    // History includes failed and running rows on purpose: a night the agent
    // died is something the tab should show, not hide.
    const [{ data: runs, error }, { data: mutes }] = await Promise.all([
      admin
        .from('quality_audit_reports')
        .select('id, run_date, started_at, finished_at, status, domains, probes_run, probes_skipped, probes_errored, counts, findings, resolved, brief, error')
        .order('started_at', { ascending: false })
        .limit(14),
      admin
        .from('quality_audit_mutes')
        .select('fingerprint, reason, expires_at, created_at')
        .order('created_at', { ascending: false }),
    ])
    if (error) throw new Error(error.message)

    const rows = runs ?? []
    const current = rows.find(r => r.status === 'completed') ?? null

    return NextResponse.json({ current, history: rows, mutes: mutes ?? [] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load quality audit' },
      { status: 500 }
    )
  }
}
