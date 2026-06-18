import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type Rec = {
  author?: string
  work?: string
  url?: string | null
  priority?: number
  source_type?: string
  can_auto_queue?: boolean
  approved?: boolean | null
  queued?: boolean
}

// POST { reportWeek, author, work } — queue an approved structural recommendation
// into corpus_ingestion_queue for the nightly Corpus Agent. Only items the agent
// marked can_auto_queue (public domain + a URL) are eligible. Marks the matching
// recommendation approved + queued in the report JSONB. Admin-gated.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { reportWeek, author, work } = await req.json()
    if (!reportWeek || !author || !work) {
      return NextResponse.json({ error: 'reportWeek, author and work are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: report, error: repErr } = await admin
      .from('corpus_gap_reports')
      .select('report_week, recommended_additions')
      .eq('report_week', reportWeek)
      .maybeSingle()
    if (repErr) throw new Error(repErr.message)
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const recs: Rec[] = Array.isArray(report.recommended_additions) ? report.recommended_additions : []
    const rec = recs.find(r => r.author === author && r.work === work)
    if (!rec) return NextResponse.json({ error: 'Recommendation not found in report' }, { status: 404 })
    if (!rec.can_auto_queue) {
      return NextResponse.json(
        { error: 'This recommendation is not auto-queueable — it needs manual ingestion via the corpus page.' },
        { status: 400 }
      )
    }

    // Idempotent: don't double-queue the same author/work.
    const { data: existing } = await admin
      .from('corpus_ingestion_queue')
      .select('id')
      .eq('author', author)
      .eq('work', work)
      .in('status', ['pending', 'processing', 'done'])
      .maybeSingle()

    if (!existing) {
      const { error: insErr } = await admin.from('corpus_ingestion_queue').insert({
        author,
        work,
        source_url: rec.url ?? null,
        language: 'en',
        source_type: 'public_domain',
        status: 'pending',
        priority: rec.priority ?? 50,
        notes: 'Queued from Coverage Gap Agent report',
      })
      if (insErr) throw new Error(insErr.message)
    }

    // Mark the recommendation approved + queued in the report JSONB.
    const updated = recs.map(r =>
      r.author === author && r.work === work ? { ...r, approved: true, queued: true } : r
    )
    const { error: updErr } = await admin
      .from('corpus_gap_reports')
      .update({ recommended_additions: updated })
      .eq('report_week', reportWeek)
    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({ success: true, alreadyQueued: !!existing })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to queue addition' },
      { status: 500 }
    )
  }
}
