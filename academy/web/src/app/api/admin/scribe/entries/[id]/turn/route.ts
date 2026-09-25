import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminUserId } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { runScribeTurn, extractSnapshotIntent, extractDraft, MAX_TOKENS, TurnSource } from '@/lib/scribe/chat'
import { reviewDraft } from '@/lib/scribe/review'
import { describeFailures, resolveTurnDraft, stripEdits } from '@/lib/scribe/edits'
import {
  commandPrompt,
  estimateTokens,
  parseCommand,
  parseFindings,
  rewriteStopPoint,
  type ThreadMessage,
} from '@/lib/scribe/book-draft'
import {
  afterChapterDraftChanged,
  bookTurnContext,
  historyForTurn,
  storeGapFindings,
} from '@/lib/scribe/book-store'

export const dynamic = 'force-dynamic'
// Same budget as the pipeline's Opus draft stage — a turn can be a full-draft
// revision plus several corpus searches.
export const maxDuration = 300

// A rewrite turn emits a find and a replace for every paragraph it touches,
// so its output is roughly twice the text it rewrites.
const REWRITE_MAX_TOKENS = 24000
// PostgREST returns at most 1,000 rows per request; a long conversation is
// read in pages so the newest turns are never silently dropped.
const THREAD_PAGE = 1000

async function fetchThread(admin: ReturnType<typeof createAdminClient>, entryId: string): Promise<ThreadMessage[]> {
  const out: ThreadMessage[] = []
  for (let from = 0; ; from += THREAD_PAGE) {
    const { data, error } = await admin
      .from('scribe_messages')
      .select('id, role, content, draft_text')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true })
      .range(from, from + THREAD_PAGE - 1)
    if (error) throw new Error(error.message)
    const page = (data ?? []) as ThreadMessage[]
    out.push(...page)
    if (page.length < THREAD_PAGE) break
  }
  return out
}

// POST /api/admin/scribe/entries/[id]/turn — run one Scribe turn.
// Body: { message?: string }. With a message, it is persisted as Kyle's turn
// first; without one, Scribe answers the thread as it stands (the opening
// turn after entry creation, or a retry after a failed stream). A message
// that is a chat command (/rewrite, /gaps) is expanded to its prompt before
// it is stored; /factcheck and /summarize are not turns and are refused here
// (the client sends them to their own routes).
//
// Streams NDJSON events: {t:'text',v} | {t:'searching',v} | {t:'sources',v}
// | {t:'draft',v} | {t:'findings',v} | {t:'book',v} | {t:'budget',v}
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
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  const entryRow = entry as {
    gaps_mode?: boolean
    thread_summary?: string | null
    thread_summary_through?: string | null
  }

  // Book context, when this entry is a chapter. Null for a standalone essay
  // and when the book migration has not been applied yet.
  const book = await bookTurnContext(admin, id).catch(e => {
    console.warn('[scribe/turn] book context failed:', e instanceof Error ? e.message : e)
    return null
  })

  // A chat command expands to its prompt here, so the stored turn is what the
  // model was actually asked, headed by a marker the conversation renders
  // as the command typed.
  let command = typeof message === 'string' ? parseCommand(message) : null
  let content: string | null = typeof message === 'string' && message.trim() ? message.trim() : null
  if (command) {
    if (command.name === 'factcheck' || command.name === 'summarize') {
      return NextResponse.json(
        { error: `/${command.name} is not a conversation turn; the page runs it directly.` },
        { status: 400 }
      )
    }
    let lastStop: string | null = null
    if (command.name === 'rewrite' && command.arg?.toLowerCase() === 'next') {
      const { data: lastScribe } = await admin
        .from('scribe_messages')
        .select('content')
        .eq('entry_id', id)
        .eq('role', 'scribe')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lastStop = lastScribe ? rewriteStopPoint(stripEdits(lastScribe.content as string)) : null
    }
    content = commandPrompt(command, { inBook: !!book, lastStop })
    if (!content) command = null
  }

  if (content) {
    const { error } = await admin.from('scribe_messages').insert({ entry_id: id, role: 'user', content })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let thread: ThreadMessage[]
  try {
    thread = await fetchThread(admin, id)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load the thread' }, { status: 500 })
  }
  if (!thread.length || thread[thread.length - 1].role !== 'user') {
    return NextResponse.json(
      { error: 'Thread must end with a user message before Scribe can take a turn.' },
      { status: 400 }
    )
  }

  // The draft as it stands: the latest turn (Scribe's or Kyle's hand revision)
  // that produced one. Newer rows store it in draft_text; older rows carry it
  // inside the message.
  let workingDraft: string | null = null
  for (let i = thread.length - 1; i >= 0 && workingDraft === null; i--) {
    const m = thread[i]
    workingDraft = m.draft_text ?? extractDraft(m.content)
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (t: string, v: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify({ t, v }) + '\n'))
      try {
        // Kyle's voice = the active style profile (newest-updated), the same
        // store the pipeline draft stage reads. Null if he hasn't added one.
        const { data: style } = await admin
          .from('scribe_style_profiles')
          .select('exemplar_refs, guidance')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const voice = style
          ? { exemplars: style.exemplar_refs ?? [], guidance: style.guidance ?? null }
          : null

        // Kyle's Cabinet history (the mobile app's counselor threads) is
        // searchable from the turn, keyed to his own user id.
        const cabinetUserId = await adminUserId()

        // What the model is sent: the opening pinned, the older turns folded
        // into the entry's running summary once they outgrow the budget, the
        // recent turns verbatim with draft bodies stripped. The working draft
        // rides on the last message at call time.
        const { history, folded, summaryTokens } = await historyForTurn(
          admin,
          id,
          {
            thread_summary: entryRow.thread_summary ?? null,
            thread_summary_through: entryRow.thread_summary_through ?? null,
          },
          thread
        )
        emit('budget', {
          history: history.reduce((n, m) => n + estimateTokens(m.content), 0),
          summary: summaryTokens,
          working_draft: workingDraft ? estimateTokens(workingDraft) : 0,
          brief: book ? estimateTokens(book.context.brief) : 0,
          folded,
          turns_sent: history.length,
          turns_total: thread.length,
        })

        const { text: raw, sources } = await runScribeTurn(
          history,
          {
            onText: v => emit('text', v),
            onSearching: v => emit('searching', v),
            onSources: (v: TurnSource[]) => emit('sources', v),
          },
          voice,
          cabinetUserId,
          workingDraft,
          entryRow.gaps_mode === true,
          {
            book: book?.context ?? null,
            maxTokens: command?.name === 'rewrite' ? REWRITE_MAX_TOKENS : MAX_TOKENS,
          }
        )

        // What the draft is now: the turn's complete <draft>, or its edits
        // applied to the draft it started from. Edits that failed to land are
        // reported in the stored turn, where Kyle reads it and Scribe sees it
        // next turn. A gap analysis never changes the draft, whatever it says.
        const resolved = command?.name === 'gaps'
          ? { mode: 'none' as const, draft: null, applied: 0, failed: [] }
          : resolveTurnDraft(raw, workingDraft)
        const changed = resolved.mode === 'full' || (resolved.mode === 'edits' && resolved.applied > 0)
        const newDraft = changed ? resolved.draft : null
        const text = raw + describeFailures(resolved.failed)
        emit('draft', {
          text: newDraft,
          mode: resolved.mode,
          applied: resolved.applied,
          failed: resolved.failed.length,
        })

        const { data: saved, error: saveError } = await admin
          .from('scribe_messages')
          .insert({
            entry_id: id,
            role: 'scribe',
            content: text,
            sources_used: sources.length ? sources : null,
            draft_text: newDraft,
          })
          .select('id')
          .single()
        if (saveError) throw new Error(`persisting scribe turn: ${saveError.message}`)

        await admin.from('scribe_entries').update({ updated_at: new Date().toISOString() }).eq('id', id)

        // A gap analysis turn ends with a findings block: store it so the
        // Findings tab can paint each passage and track what was fixed.
        if (command?.name === 'gaps') {
          try {
            const findings = await storeGapFindings(
              admin,
              { entryId: id, bookId: book?.book.id ?? null, chapterId: book?.chapter.id ?? null, messageId: saved.id },
              parseFindings(raw),
              book?.chapters ?? []
            )
            emit('findings', findings)
          } catch (e) {
            console.warn('[scribe/turn] findings not stored:', e instanceof Error ? e.message : e)
          }
        }

        // Conversational save intent — snapshot as a side effect of the turn.
        let snapshot: { id: string; stage: string } | null = null
        const intent = extractSnapshotIntent(raw, newDraft ?? workingDraft)
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

        // The book's index and summaries follow a changed chapter. After
        // 'done' so the conversation is already usable; a failure here is
        // logged, never surfaced as a failed turn.
        if (book && newDraft) {
          try {
            const r = await afterChapterDraftChanged(admin, book.chapter, workingDraft, newDraft)
            emit('book', r)
          } catch (e) {
            console.warn('[scribe/turn] book update failed:', e instanceof Error ? e.message : e)
          }
        }
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
