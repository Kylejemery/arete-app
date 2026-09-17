import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { checkQuotes, type CandidateChunk, type QuoteFinding } from '@/lib/scribe/quote-check'

export const dynamic = 'force-dynamic'

// POST /api/admin/scribe/entries/[id]/quotes — verify the draft's quotations.
//
// The pipeline has always machine-checked quotes against their source chunk;
// chat mode had only the prompt telling Scribe not to fabricate. This is the
// check. It gathers every chunk this session actually retrieved (from each
// turn's sources_used), fetches their text, and matches each quoted passage
// in the draft against them.
//
// Sources it can verify against: the Stoic corpus, the writer's log, and the
// entry's own journal fragment. A Cabinet line or a source from outside the
// corpus comes back 'unverified', which reports that nothing retrieved
// contains those words — not that the quote is false.
//
// Body: { draft_text }
// Returns: { findings: QuoteFinding[], checked: number, sources: number }

const MAX_DRAFT = 120_000

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const { draft_text } = await req.json().catch(() => ({}))
  if (typeof draft_text !== 'string' || !draft_text.trim()) {
    return NextResponse.json({ findings: [], checked: 0, sources: 0 })
  }
  const draft = draft_text.slice(0, MAX_DRAFT)

  const admin = createAdminClient()

  const [entryRes, messagesRes] = await Promise.all([
    admin.from('scribe_entries').select('raw_text').eq('id', id).maybeSingle(),
    admin.from('scribe_messages').select('sources_used').eq('entry_id', id),
  ])
  if (messagesRes.error) {
    return NextResponse.json({ error: messagesRes.error.message }, { status: 500 })
  }

  // Every chunk this session retrieved, by layer. Corpus ids and log ids are
  // uuids in their own tables; Cabinet ids are synthetic and carry no row.
  type StoredSource = { chunk_id?: string; text_type?: string }
  const corpusIds = new Set<string>()
  const logIds = new Set<string>()
  for (const row of (messagesRes.data ?? []) as { sources_used: StoredSource[] | null }[]) {
    for (const s of row.sources_used ?? []) {
      if (!s?.chunk_id) continue
      if (s.text_type === 'journal') logIds.add(s.chunk_id)
      else if (s.text_type === 'cabinet' || s.chunk_id.startsWith('cabinet:')) continue
      else corpusIds.add(s.chunk_id)
    }
  }

  // Verbatim-quotable layers, the same discriminator chat mode labels
  // retrieval with: public-domain text may be quoted, Mode-2 summaries of
  // modern scholarship may not (the original was never stored).
  const QUOTABLE_TYPES = new Set(['primary', 'scholarship', 'modern_primary'])

  const chunks: CandidateChunk[] = []

  if (corpusIds.size) {
    const { data, error } = await admin
      .from('rag_corpus')
      .select('id, chunk_text, author, work, section_label, text_type')
      .in('id', [...corpusIds])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const c of (data ?? []) as {
      id: string
      chunk_text: string
      author: string
      work: string
      section_label: string | null
      text_type: string
    }[]) {
      chunks.push({
        chunk_id: c.id,
        content: c.chunk_text,
        author: c.author,
        work: c.work,
        section_label: c.section_label,
        quotable: QUOTABLE_TYPES.has(c.text_type),
      })
    }
  }

  if (logIds.size) {
    const { data } = await admin
      .from('scribe_log_items')
      .select('id, content, title, entry_date')
      .in('id', [...logIds])
    for (const l of (data ?? []) as { id: string; content: string; title: string | null; entry_date: string }[]) {
      chunks.push({
        chunk_id: l.id,
        content: l.content,
        author: 'You',
        work: `Log${l.title ? `: ${l.title}` : ''}`,
        section_label: l.entry_date,
        quotable: true, // the writer's own words
      })
    }
  }

  const raw = (entryRes.data as { raw_text?: string } | null)?.raw_text
  if (raw?.trim()) {
    chunks.push({
      chunk_id: 'entry:raw',
      content: raw,
      author: 'You',
      work: 'This entry’s journal fragment',
      section_label: null,
      quotable: true,
    })
  }

  const findings: QuoteFinding[] = checkQuotes(draft, chunks)
  return NextResponse.json({ findings, checked: findings.length, sources: chunks.length })
}
