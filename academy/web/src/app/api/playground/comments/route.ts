import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * The playground discussion board.
 *
 * GET  /api/playground/comments?thread=<key>
 *   → { comments: Comment[] }  (oldest first; corpus replies carry parent_id)
 *
 * POST /api/playground/comments
 *   body: { thread, context, stance?, name?, body }
 *   → persists the visitor comment, asks the corpus to answer it, persists the
 *     corpus reply, and returns { comment, reply }.
 *
 * The corpus voice is the same public Oracle that powers the Library — the
 * whole tradition answering at once (author = null). We call the Railway
 * backend directly from the server so the reply can be persisted in one hop and
 * the shared daily rate limit is enforced upstream exactly as elsewhere.
 */

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app';

type Stance = 'agree' | 'disagree' | 'unsure';

// The Oracle caps `question` at 500 chars (it drives both RAG retrieval and the
// final user turn), so the stance tag must stay compact.
const STANCE_TAG: Record<Stance, string> = {
  agree: '[The reader agrees with the position.] ',
  disagree: '[The reader disagrees with the position.] ',
  unsure: '[The reader is unsure about the position.] ',
};
const QUESTION_MAX = 500;

function isStance(v: unknown): v is Stance {
  return v === 'agree' || v === 'disagree' || v === 'unsure';
}

export async function GET(request: NextRequest) {
  const thread = request.nextUrl.searchParams.get('thread');
  if (!thread) {
    return NextResponse.json({ error: 'Missing thread' }, { status: 400 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('playground_comments')
      .select('id, thread_key, author_role, author_name, stance, body, parent_id, sources, created_at')
      .eq('thread_key', thread)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ comments: data ?? [] });
  } catch (err) {
    console.error('[api/playground/comments GET]', err);
    return NextResponse.json({ error: 'Could not load the discussion.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let payload: {
    thread?: unknown;
    context?: unknown;
    stance?: unknown;
    name?: unknown;
    body?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const thread = typeof payload.thread === 'string' ? payload.thread.trim() : '';
  const context = typeof payload.context === 'string' ? payload.context.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const stance = isStance(payload.stance) ? payload.stance : null;
  const rawName = typeof payload.name === 'string' ? payload.name.trim() : '';
  const name = rawName ? rawName.slice(0, 80) : null;

  if (!thread) return NextResponse.json({ error: 'Missing thread.' }, { status: 400 });
  if (!body) return NextResponse.json({ error: 'Write a comment first.' }, { status: 400 });
  if (body.length > 4000) {
    return NextResponse.json({ error: 'Comment is too long (4000 characters max).' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Persist the visitor's comment.
  const { data: comment, error: insertErr } = await supabase
    .from('playground_comments')
    .insert({
      thread_key: thread,
      author_role: 'visitor',
      author_name: name,
      stance,
      body,
    })
    .select('id, thread_key, author_role, author_name, stance, body, parent_id, sources, created_at')
    .single();

  if (insertErr || !comment) {
    console.error('[api/playground/comments POST insert]', insertErr);
    return NextResponse.json({ error: 'Could not save your comment.' }, { status: 500 });
  }

  // 2. Ask the corpus to answer it. The essay/situation context and the
  //    instructions ride in `history` (unbounded); `question` stays short — the
  //    reader's stance + comment — because the Oracle caps it at 500 chars and
  //    retrieves the corpus from it.
  const { question, history } = buildCorpusPrompt({ context, stance, body });
  let reply = null;
  let remaining: number | null = null;

  try {
    const upstream = await fetch(`${BACKEND_URL}/oracle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, author: null, history }),
    });
    if (upstream.ok) {
      const data = await upstream.json();
      const answer = typeof data.answer === 'string' ? data.answer.trim() : '';
      if (typeof data.remaining === 'number') remaining = data.remaining;
      if (answer) {
        const { data: replyRow, error: replyErr } = await supabase
          .from('playground_comments')
          .insert({
            thread_key: thread,
            author_role: 'corpus',
            author_name: null,
            stance: null,
            body: answer,
            parent_id: comment.id,
            sources: data.sources ?? null,
          })
          .select('id, thread_key, author_role, author_name, stance, body, parent_id, sources, created_at')
          .single();
        if (replyErr) {
          console.error('[api/playground/comments POST reply insert]', replyErr);
        } else {
          reply = replyRow;
        }
      }
    } else {
      console.error('[api/playground/comments POST oracle]', upstream.status, await upstream.text());
    }
  } catch (err) {
    console.error('[api/playground/comments POST oracle fetch]', err);
  }

  // The comment is saved even if the corpus was silent; the reply may be null.
  return NextResponse.json({ comment, reply, remaining });
}

type HistoryTurn = { role: 'user' | 'assistant'; content: string };

/**
 * Splits the corpus prompt across the Oracle's two inputs:
 *   - `history`: the essay/situation context and the instruction to engage,
 *     as a primed user→assistant exchange (not length-limited upstream).
 *   - `question`: the reader's stance + comment, capped at 500 chars — this is
 *     both the RAG retrieval query and the final user turn.
 */
function buildCorpusPrompt(args: {
  context: string;
  stance: Stance | null;
  body: string;
}): { question: string; history: HistoryTurn[] } {
  const { context, stance, body } = args;

  const instruction =
    "Respond to the reader's next message from within the Stoic tradition and the " +
    'wider corpus. Engage their actual claim: grant what is right in it and press ' +
    'where it goes wrong, citing specific passages where they bear. Address the ' +
    'reader directly, in the voice of the house, and take a position — do not merely ' +
    'summarize.';

  const framing = context
    ? `The reader is responding to this:\n\n${context}\n\n${instruction}`
    : instruction;

  const history: HistoryTurn[] = [
    { role: 'user', content: framing },
    { role: 'assistant', content: 'Understood — I have that context in view. What does the reader say?' },
  ];

  const tag = stance ? STANCE_TAG[stance] : '';
  let question = `${tag}${body}`.trim();
  if (question.length > QUESTION_MAX) {
    question = question.slice(0, QUESTION_MAX - 1).trimEnd() + '…';
  }

  return { question, history };
}
