import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { runScribeTurn, extractSnapshotIntent, TurnSource } from '@/lib/scribe/chat'
import { reviewDraft } from '@/lib/scribe/review'

export const dynamic = 'force-dynamic'
// Same budget as the pipeline's Opus draft stage — a turn can be a full-draft
// revision plus several corpus searches.
export const maxDuration = 300

// POST /api/admin/scribe/entries/[id]/turn — run one Scribe turn.
// Body: { message?: string }. With a message, it is persisted as Kyle's turn
// first; without one, Scribe answers the thread as it stands (the opening
// turn after entry creation, or a retry after a failed stream).
//
// Streams NDJSON events: {t:'text',v} | {t:'searching',v} | {t:'sources',v}
// | {t:'done',v:{messageId,snapshot}} | {t:'error',v}. The scribe message
// (with this turn's sources_used) is persisted before 'done' fires, and a
// conversational save intent (<snapshot stage="..."/>) snapshots to
// scribe_entry_drafts server-side.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const { message } = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data: entry, error: entryError } = await admin
    .from('scribe_entries')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  if (typeof message === 'string' && message.trim()) {
    const { error } = await admin
      .from('scribe_messages')
      .insert({ entry_id: id, role: 'user', content: message.trim() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: thread, error: threadError } = await admin
    .from('scribe_messages')
    .select('role, content')
    .eq('entry_id', id)
    .order('created_at', { ascending: true })
  if (threadError) return NextResponse.json({ error: threadError.message }, { status: 500 })
  if (!thread?.length || thread[thread.length - 1].role !== 'user') {
    return NextResponse.json(
      { error: 'Thread must end with a user message before Scribe can take a turn.' },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (t: string, v: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify({ t, v }) + '\n'))
      try {
        const { text, sources } = await runScribeTurn(
          thread as { role: 'user' | 'scribe'; content: string }[],
          {
            onText: v => emit('text', v),
            onSearching: v => emit('searching', v),
            onSources: (v: TurnSource[]) => emit('sources', v),
          }
        )

        const { data: saved, error: saveError } = await admin
          .from('scribe_messages')
          .insert({
            entry_id: id,
            role: 'scribe',
            content: text,
            sources_used: sources.length ? sources : null,
          })
          .select('id')
          .single()
        if (saveError) throw new Error(`persisting scribe turn: ${saveError.message}`)

        await admin.from('scribe_entries').update({ updated_at: new Date().toISOString() }).eq('id', id)

        // Conversational save intent — snapshot as a side effect of the turn.
        let snapshot: { id: string; stage: string } | null = null
        const intent = extractSnapshotIntent(text)
        if (intent) {
          // The final handoff triggers one cold outside read — a different model,
          // blind to this conversation, scoring the finished draft. It runs
          // before the insert so the findings persist on the snapshot row, and
          // it never throws (a broken reviewer must not block finalization).
          const review = intent.stage === 'final' ? await reviewDraft(intent.draft_text) : null
          const { data: draft, error: draftError } = await admin
            .from('scribe_entry_drafts')
            .insert({
              entry_id: id,
              stage: intent.stage,
              draft_text: intent.draft_text,
              sources_used: sources.length ? sources : null,
              review,
            })
            .select('id, stage')
            .single()
          if (draftError) throw new Error(`snapshotting draft: ${draftError.message}`)
          snapshot = draft
          if (review) emit('review', review)
        }

        emit('done', { messageId: saved.id, snapshot })
      } catch (e) {
        emit('error', e instanceof Error ? e.message : 'Scribe turn failed')
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
