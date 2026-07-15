import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import type { SocialPost } from '@/lib/scribe/pipeline/draft'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/drafts/[id]/to-scheduler — hand a social draft's
// post variants to the existing post_queue as 'pending' rows for the cron.
// Body: { scheduled_at: ISO string (must be in the future), platforms?: [] }.
// Nothing posts immediately and nothing is scheduled without this explicit
// call — Scribe never publishes on its own.
export async function POST(req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  const body = await req.json().catch(() => ({}))
  const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null
  if (!scheduledAt || isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: 'Pass scheduled_at as a future ISO timestamp — Scribe drafts are always scheduled, never posted immediately.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data: draft, error } = await admin
    .from('scribe_drafts')
    .select('id, format, meta')
    .eq('id', id)
    .single()
  if (error || !draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

  const posts: SocialPost[] = draft.meta?.posts ?? []
  if (draft.format !== 'social' || posts.length === 0) {
    return NextResponse.json(
      { error: 'This draft has no machine-readable social posts — generate a social-format draft first.' },
      { status: 400 }
    )
  }

  const wanted: string[] | null = Array.isArray(body.platforms) && body.platforms.length ? body.platforms : null
  const toQueue = wanted ? posts.filter(p => wanted.includes(p.platform)) : posts

  let queued = 0
  const errors: string[] = []
  for (const p of toQueue) {
    const { error: insErr } = await admin.from('post_queue').insert({
      platform: p.platform,
      text: p.text,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
    })
    if (insErr) errors.push(`${p.platform}: ${insErr.message}`)
    else queued++
  }

  return NextResponse.json({ queued, errors, scheduled_at: scheduledAt.toISOString() })
}
