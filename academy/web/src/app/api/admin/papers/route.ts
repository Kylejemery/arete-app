import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// GET /api/admin/papers — every paper submission, newest first, split into
// the review queue (queued/summarizing/pending_review/failed) and the ledger
// (ingested/rejected). Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('paper_submissions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)

    const active = (data || []).filter(p => !['ingested', 'rejected'].includes(p.status))
    const settled = (data || []).filter(p => ['ingested', 'rejected'].includes(p.status))
    return NextResponse.json({ active, settled })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load papers' },
      { status: 500 }
    )
  }
}

// POST /api/admin/papers — queue a scholarly paper for the Paper Agent.
// Body: { author, work, year?, venue?, sourceUrl? , storagePath? } — exactly
// one of sourceUrl (a direct PDF link) or storagePath (a PDF already uploaded
// to the private 'papers' bucket via /api/admin/papers/upload-url). The agent
// summarizes; ONLY the reviewed summary is ever ingested. Queuing also nudges
// the Railway agent to run now (best-effort — the run button covers misses).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { author, work, year, venue, sourceUrl, storagePath } = await req.json()
    if (!author?.trim() || !work?.trim()) {
      return NextResponse.json({ error: 'author and work are required' }, { status: 400 })
    }
    const hasUrl = typeof sourceUrl === 'string' && sourceUrl.trim().length > 0
    const hasPath = typeof storagePath === 'string' && storagePath.trim().length > 0
    if (hasUrl === hasPath) {
      return NextResponse.json(
        { error: 'Provide exactly one of sourceUrl or storagePath' },
        { status: 400 }
      )
    }

    let url: string | null = null
    if (hasUrl) {
      let parsed: URL
      try {
        parsed = new URL(sourceUrl.trim())
      } catch {
        return NextResponse.json({ error: 'sourceUrl is not a valid URL' }, { status: 400 })
      }
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return NextResponse.json({ error: 'sourceUrl must be http(s)' }, { status: 400 })
      }
      url = parsed.toString()
    }

    const admin = createAdminClient()

    // Don't double-queue the same paper.
    const { data: existing } = await admin
      .from('paper_submissions')
      .select('id, status')
      .eq('author', author.trim())
      .eq('work', work.trim())
      .not('status', 'in', '("rejected","failed")')
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: `"${author.trim()} / ${work.trim()}" is already submitted (${existing.status}).` },
        { status: 409 }
      )
    }

    const { data: row, error } = await admin
      .from('paper_submissions')
      .insert({
        author: author.trim(),
        work: work.trim(),
        year: year?.trim() || null,
        venue: venue?.trim() || null,
        source_url: url,
        storage_path: hasPath ? storagePath.trim() : null,
        status: 'queued',
      })
      .select()
      .single()
    if (error) throw new Error(error.message)

    // Nudge the Railway agent to summarize now. Best-effort: a failure here
    // leaves the row queued for the next explicit run.
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      fetch(`${BACKEND_URL}/api/admin/papers/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => { /* run button covers it */ })
    }

    return NextResponse.json({ success: true, paper: row })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to queue paper' },
      { status: 500 }
    )
  }
}
