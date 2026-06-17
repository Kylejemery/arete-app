import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/corpus-ingest/coverage — current rag_corpus coverage: total chunk
// count + per-author chunk counts (desc). Admin-gated, service-role read.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    // Pull just the author column for every chunk and tally in JS — the corpus
    // is a few thousand rows, so one slim column is cheap and avoids an RPC.
    const { data, error } = await admin
      .from('rag_corpus')
      .select('author')
      .limit(100000)
    if (error) throw new Error(error.message)

    const counts = new Map<string, number>()
    for (const row of data ?? []) {
      const a = row.author || 'Unknown'
      counts.set(a, (counts.get(a) ?? 0) + 1)
    }

    const authors = [...counts.entries()]
      .map(([author, chunks]) => ({ author, chunks }))
      .sort((a, b) => b.chunks - a.chunks)

    return NextResponse.json({
      totalChunks: data?.length ?? 0,
      authors,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Coverage query failed' },
      { status: 500 }
    )
  }
}
