import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { runBookGaps } from '@/lib/scribe/book-store'
import { stripFindingsBlock } from '@/lib/scribe/book-draft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/books/[id]/gaps — the book level gap analysis, over
// the outline and the chapter summaries, with the book tools. Stores the
// cross chapter findings on the chapters they name and returns them with the
// commentary. Nothing in any draft changes.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  try {
    const { commentary, findings } = await runBookGaps(createAdminClient(), id)
    return NextResponse.json({ commentary: stripFindingsBlock(commentary), findings })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gap analysis failed'
    console.error('[scribe/books/gaps]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
