import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/agent-config/:agentName  { config: {...} }
// Update an agent's runtime config (e.g. synthesis_agent.documents_per_week).
// The agent reads agent_config at the start of each run, so changes take effect
// on the next scheduled run with no redeployment. Admin-gated.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { agentName } = await params
    const { config } = await req.json()
    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'config object is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('agent_config')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('agent_name', agentName)
      .select()
      .single()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Agent config not found' }, { status: 404 })

    return NextResponse.json({ success: true, config: data.config })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update agent config' },
      { status: 500 }
    )
  }
}
