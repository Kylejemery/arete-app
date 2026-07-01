import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type Suggestion = { author?: string; work?: string; why?: string }

// POST /api/admin/inquiry/:id/queue  { items?: Suggestion[] }
// "Queue for Corpus" — adds an inquiry's suggested_reading (the authors/works
// the corpus lacked) to corpus_ingestion_queue so the nightly Corpus Agent can
// pull them, then marks the inquiry queued_for_corpus. If `items` is omitted,
// every suggestion on the inquiry is queued; pass a subset to queue just those.
// Upserts on the (author, work) natural key so re-queuing never duplicates a
// work. Admin-gated.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    let body: { items?: Suggestion[] } = {}
    try { body = await req.json() } catch { /* no body — queue all */ }

    const admin = createAdminClient()

    const { data: inquiry, error: fetchErr } = await admin
      .from('open_inquiries')
      .select('id, suggested_reading, status')
      .eq('id', id)
      .single()
    if (fetchErr) throw new Error(fetchErr.message)

    const all: Suggestion[] = Array.isArray(inquiry?.suggested_reading)
      ? inquiry.suggested_reading
      : []
    const toQueue = (Array.isArray(body.items) && body.items.length > 0 ? body.items : all)
      .filter(s => s && s.author && s.work)

    if (toQueue.length === 0) {
      return NextResponse.json({ error: 'No suggested reading with both author and work to queue' }, { status: 400 })
    }

    const rows = toQueue.map(s => ({
      author: String(s.author).trim(),
      work: String(s.work).trim(),
      source_type: 'public_domain' as const,
      status: 'pending' as const,
      priority: 90, // slightly ahead of default 100 — inquiry flagged a real gap
      notes: `Suggested by Inquiry Agent: ${s.why || 'gap surfaced while pursuing an open inquiry'}`,
    }))

    // Natural-key upsert (author, work) — matches uq_corpus_queue_author_work.
    const { error: upErr } = await admin
      .from('corpus_ingestion_queue')
      .upsert(rows, { onConflict: 'author,work', ignoreDuplicates: true })
    if (upErr) throw new Error(upErr.message)

    const { data: updated, error: updErr } = await admin
      .from('open_inquiries')
      .update({ status: 'queued_for_corpus', reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({ success: true, queued: rows.length, inquiry: updated })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to queue for corpus' },
      { status: 500 }
    )
  }
}
