import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Monday (UTC) of the current week — matches the agent's analysis_week.
function mondayUTC(): string {
  const d = new Date()
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// Read-only status for the nightly Journal Analysis agent. Admin-gated; reads
// journal_analysis + distress_review_queue via the service role (RLS-locked).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const week = mondayUTC()

    const [recentRes, totalRes, weekRes, deliveredRes, distressRes] = await Promise.all([
      // insight_text + themes let the admin read each analysis in place.
      // Deliberately no user_id / email — analyses render anonymously.
      admin
        .from('journal_analysis')
        .select('id, analysis_week, dominant_theme, themes, insight_text, weeks_analyzed, delivered, distress_flagged, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      admin.from('journal_analysis').select('id', { count: 'exact', head: true }),
      admin.from('journal_analysis').select('id', { count: 'exact', head: true }).eq('analysis_week', week),
      admin.from('journal_analysis').select('id', { count: 'exact', head: true }).eq('delivered', true),
      admin.from('distress_review_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    if (recentRes.error) throw new Error(recentRes.error.message)

    return NextResponse.json({
      total: totalRes.count ?? 0,
      thisWeek: weekRes.count ?? 0,
      delivered: deliveredRes.count ?? 0,
      distressPending: distressRes.count ?? 0,
      currentWeek: week,
      lastCreatedAt: recentRes.data?.[0]?.created_at ?? null,
      recent: recentRes.data ?? [],
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load journal agent status' },
      { status: 500 }
    )
  }
}
