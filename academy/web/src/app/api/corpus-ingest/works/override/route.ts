import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PUT /api/corpus-ingest/works/override — upsert a Reading Room override for one
// work (retitle, move shelf, set era, hide). Empty strings clear a field (stored
// null = fall back to the server defaults). If every field is empty/default, the
// override row is deleted so the work reverts cleanly. Admin-gated, service role.
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { author, work, title, tradition, era, hidden } = await req.json()
    if (!author?.trim() || !work?.trim()) {
      return NextResponse.json({ error: 'author and work are required' }, { status: 400 })
    }
    if (tradition && !['stoic', 'wider', 'synthesis'].includes(tradition)) {
      return NextResponse.json({ error: 'invalid tradition' }, { status: 400 })
    }

    const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
    const row = {
      author: author.trim(),
      work: work.trim(),
      title: clean(title),
      tradition: clean(tradition),
      era: clean(era),
      hidden: hidden === true,
      updated_at: new Date().toISOString(),
    }

    const admin = createAdminClient()
    // Nothing to override → remove any existing row so the work uses defaults.
    if (!row.title && !row.tradition && !row.era && !row.hidden) {
      const { error } = await admin.from('library_overrides').delete()
        .eq('author', row.author).eq('work', row.work)
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, cleared: true })
    }

    const { error } = await admin.from('library_overrides').upsert(row, { onConflict: 'author,work' })
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to save override' }, { status: 500 })
  }
}
