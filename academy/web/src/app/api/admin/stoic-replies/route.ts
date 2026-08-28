import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Rate discipline, enforced server-side (the UI shows it, this route blocks it):
// - at most 3 approved replies per platform per day
// - never reply twice to the same author within 30 days
const DAILY_CAP_PER_PLATFORM = 3
const AUTHOR_COOLDOWN_DAYS = 30

const REJECT_REASONS = ['not_relevant', 'bad_draft', 'wrong_tone', 'too_late', 'unsafe'] as const

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === process.env.ADMIN_EMAIL
}

type DraftRow = {
  id: string
  status: string
  posted_at: string | null
  candidate: {
    platform: string
    author_handle: string
  } | null
}

// GET — the review queue (pending + edited drafts, oldest first, candidate
// joined in), today's per-platform approval counts, and pipeline stats.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const admin = createAdminClient()
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const [queueRes, approvedTodayRes, countsRes] = await Promise.all([
      admin
        .from('reply_drafts')
        .select(`
          id, draft_text, final_text, doctrine, passage_used, passages, model, status, created_at,
          candidate:reply_candidates(
            id, platform, author_handle, permalink, body, parent_context, comment_count,
            posted_at, stoic_fit, openness, already_answered, doctrine, triage_reasoning, matched_query
          )
        `)
        .in('status', ['pending', 'edited'])
        .order('created_at', { ascending: true }),
      admin
        .from('reply_drafts')
        .select('id, status, posted_at, candidate:reply_candidates(platform, author_handle)')
        .in('status', ['approved'])
        .gte('posted_at', todayStart.toISOString()),
      admin
        .from('reply_candidates')
        .select('status'),
    ])

    if (queueRes.error) throw new Error(queueRes.error.message)
    if (approvedTodayRes.error) throw new Error(approvedTodayRes.error.message)

    const approvedToday: Record<string, number> = {}
    for (const row of (approvedTodayRes.data ?? []) as unknown as DraftRow[]) {
      const platform = row.candidate?.platform ?? 'unknown'
      approvedToday[platform] = (approvedToday[platform] ?? 0) + 1
    }

    const pipeline: Record<string, number> = {}
    for (const row of countsRes.data ?? []) {
      pipeline[row.status] = (pipeline[row.status] ?? 0) + 1
    }

    return NextResponse.json({
      queue: queueRes.data ?? [],
      approvedToday,
      dailyCap: DAILY_CAP_PER_PLATFORM,
      pipeline,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

// POST { id, action, final_text?, reject_reason? }
//   approve — enforces both rate rules, stamps posted_at (posting is the
//             manual paste that follows immediately)
//   edit    — saves final_text, keeps the draft in the queue as 'edited'
//   reject  — requires a reason from the fixed list (the training signal)
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id, action, final_text, reject_reason } = await req.json()
    if (!id || !['approve', 'edit', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'id and a valid action are required' }, { status: 400 })
    }
    const admin = createAdminClient()

    const { data: draft, error: draftError } = await admin
      .from('reply_drafts')
      .select('id, status, draft_text, final_text, candidate:reply_candidates(id, platform, author_handle)')
      .eq('id', id)
      .maybeSingle()
    if (draftError) throw new Error(draftError.message)
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (!['pending', 'edited'].includes(draft.status)) {
      return NextResponse.json({ error: `Draft already ${draft.status}` }, { status: 409 })
    }
    const candidate = draft.candidate as unknown as { id: string; platform: string; author_handle: string } | null
    if (!candidate) return NextResponse.json({ error: 'Draft has no candidate' }, { status: 500 })

    if (action === 'edit') {
      const text = typeof final_text === 'string' ? final_text.trim() : ''
      if (!text) return NextResponse.json({ error: 'final_text is required to edit' }, { status: 400 })
      const { error } = await admin
        .from('reply_drafts')
        .update({ final_text: text, status: 'edited', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true })
    }

    if (action === 'reject') {
      if (!REJECT_REASONS.includes(reject_reason)) {
        return NextResponse.json({ error: `reject_reason must be one of: ${REJECT_REASONS.join(', ')}` }, { status: 400 })
      }
      const { error } = await admin
        .from('reply_drafts')
        .update({ status: 'rejected', reject_reason, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true })
    }

    // action === 'approve'
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const cooldownStart = new Date(Date.now() - AUTHOR_COOLDOWN_DAYS * 86400000).toISOString()

    const [todayRes, authorRes] = await Promise.all([
      admin
        .from('reply_drafts')
        .select('id, candidate:reply_candidates!inner(platform)', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('posted_at', todayStart.toISOString())
        .eq('candidate.platform', candidate.platform),
      admin
        .from('reply_drafts')
        .select('id, candidate:reply_candidates!inner(author_handle)', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('posted_at', cooldownStart)
        .eq('candidate.author_handle', candidate.author_handle),
    ])
    if (todayRes.error) throw new Error(todayRes.error.message)
    if (authorRes.error) throw new Error(authorRes.error.message)

    if ((todayRes.count ?? 0) >= DAILY_CAP_PER_PLATFORM) {
      return NextResponse.json(
        { error: `Daily ceiling reached: ${DAILY_CAP_PER_PLATFORM} approved replies on ${candidate.platform} today. An account that replies to twenty strangers a day with philosophy is a bot regardless of who typed it.` },
        { status: 429 }
      )
    }
    if ((authorRes.count ?? 0) > 0) {
      return NextResponse.json(
        { error: `Already replied to ${candidate.author_handle} within the last ${AUTHOR_COOLDOWN_DAYS} days.` },
        { status: 429 }
      )
    }

    const text = (typeof final_text === 'string' && final_text.trim()) || draft.final_text || draft.draft_text
    const { error } = await admin
      .from('reply_drafts')
      .update({
        status: 'approved',
        final_text: text,
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, final_text: text })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
