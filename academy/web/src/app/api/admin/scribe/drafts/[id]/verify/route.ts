import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyDraft, verificationPasses } from '@/lib/scribe/pipeline/verify'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/drafts/[id]/verify — Stage D. Runs the deterministic
// checks plus the haiku paraphrase-support pass, stores the results on the
// draft, and reports whether the draft is eligible for "ready".
export async function POST(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  const admin = createAdminClient()
  const { data: draft, error } = await admin
    .from('scribe_drafts')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

  try {
    const { verification, usage } = await verifyDraft(draft.content, draft.citations ?? [])
    const tokenUsage = { ...(draft.token_usage ?? {}), ...(usage ? { verify: usage } : {}) }

    const { error: updErr } = await admin
      .from('scribe_drafts')
      .update({ verification, token_usage: tokenUsage })
      .eq('id', id)
    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({
      verification,
      passes: verificationPasses(verification),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Verification failed'
    console.error('[scribe/verify]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
