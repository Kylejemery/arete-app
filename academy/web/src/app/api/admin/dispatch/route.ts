import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/dispatch — today's dispatch (preview), the last 14 days of
// dispatch history, and the dispatch_agent config. Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const today = new Date().toISOString().split('T')[0]

  try {
    const [{ data: todayRow }, { data: history }, { data: cfg }] = await Promise.all([
      admin.from('daily_dispatches')
        .select('id, dispatch_date, title, body, teaser, practice, community_themes, corpus_context, total_recipients, delivered_count, failed_count')
        .eq('dispatch_date', today).maybeSingle(),
      admin.from('daily_dispatches')
        .select('id, dispatch_date, title, total_recipients, delivered_count, failed_count')
        .order('dispatch_date', { ascending: false }).limit(14),
      admin.from('agent_config').select('config').eq('agent_name', 'dispatch_agent').maybeSingle(),
    ])

    return NextResponse.json({
      today: todayRow ?? null,
      history: history ?? [],
      config: cfg?.config ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load dispatch data' },
      { status: 500 }
    )
  }
}
