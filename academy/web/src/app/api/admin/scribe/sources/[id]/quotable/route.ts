import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { ingestQuotableSource } from '@/lib/scribe/ingest'

export const dynamic = 'force-dynamic'
// PDF extraction + per-chunk embedding for a ~20-page paper runs well under a
// minute, but leave headroom over the admin-route default of 30.
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/sources/[id]/quotable — extract the source's PDF,
// chunk + embed the full text into scribe_source_chunks (private grounding
// for verbatim-quote verification), and return the ingest report.
export async function POST(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  try {
    const report = await ingestQuotableSource(id)
    return NextResponse.json({ report })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ingestion failed'
    console.error('[scribe/quotable]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
