import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// The nightly Corpus Agent fetches source_url and REJECTS HTML — it needs plain
// text. Gutenberg's /ebooks/N page is HTML; the plain-text form is
// /cache/epub/N/pgN.txt. Normalize so a pasted landing-page URL still works.
function normalizeSourceUrl(raw: string): string {
  const m = raw.match(/gutenberg\.org\/ebooks\/(\d+)/i)
  if (m) return `https://www.gutenberg.org/cache/epub/${m[1]}/pg${m[1]}.txt`
  return raw.trim()
}

// POST { author, work, sourceUrl, priority? } — queue an arbitrary public-domain
// plain-text URL into corpus_ingestion_queue for the nightly Corpus Agent.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { author, work, sourceUrl, priority } = await req.json()
    if (!author?.trim() || !work?.trim() || !sourceUrl?.trim()) {
      return NextResponse.json({ error: 'author, work and sourceUrl are required' }, { status: 400 })
    }

    let url: URL
    try {
      url = new URL(normalizeSourceUrl(sourceUrl))
    } catch {
      return NextResponse.json({ error: 'sourceUrl is not a valid URL' }, { status: 400 })
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return NextResponse.json({ error: 'sourceUrl must be http(s)' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Don't double-queue the same work.
    const { data: existing } = await admin
      .from('corpus_ingestion_queue')
      .select('id, status')
      .eq('author', author.trim())
      .eq('work', work.trim())
      .in('status', ['pending', 'processing', 'done'])
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: `"${author.trim()} / ${work.trim()}" is already in the queue (${existing.status}).` },
        { status: 409 }
      )
    }

    const { error } = await admin.from('corpus_ingestion_queue').insert({
      author: author.trim(),
      work: work.trim(),
      source_url: url.toString(),
      language: 'en',
      source_type: 'public_domain',
      status: 'pending',
      priority: Number.isFinite(priority) ? priority : 50,
      notes: 'Queued by URL from Gap Agent tab',
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, queuedUrl: url.toString() })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to queue URL' },
      { status: 500 }
    )
  }
}
