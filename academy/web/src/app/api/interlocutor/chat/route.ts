import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import {
  INTERLOCUTOR_SYSTEM,
  CONVERSATION_APPENDIX,
  buildProfileBlock,
  type WritingProfileRow,
} from '@/lib/interlocutor'

// POST /api/interlocutor/chat — talk with the Interlocutor about a piece.
//
// Anchored to a draft, always. The agent's domain is craft on a specific
// argument, and an unanchored chat box turns it into a general assistant, which
// is the one thing the spec is built to prevent. The draft rides in the first
// message whether or not a critique has been run.
//
// Turns persist to critique_messages when the conversation follows a critique.
// Without one there is no row to hang them on, so the exchange is ephemeral;
// that is the cost of letting the student ask a question before submitting.
//
// Body: { excerpt, critique?, critiqueId?, pieceTitle?, messages: [{role, content}] }
// Returns: { reply, recorded }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 300

const MAX_EXCERPT = 60000
const MAX_TURNS = 40
const MAX_TURN_CHARS = 8000

type Turn = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    excerpt?: string
    critique?: string
    critiqueId?: string
    pieceTitle?: string
    messages?: Turn[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : ''
  if (!excerpt) {
    return NextResponse.json(
      { error: 'There is no draft to talk about. Write something first.' },
      { status: 400 }
    )
  }
  if (excerpt.length > MAX_EXCERPT) {
    return NextResponse.json({ error: 'That draft is too long to discuss in one thread.' }, { status: 400 })
  }

  const turns = Array.isArray(body.messages) ? body.messages.slice(-MAX_TURNS) : []
  if (turns.length === 0 || turns[turns.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'The last message must be from the student.' }, { status: 400 })
  }
  for (const m of turns) {
    if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim() || m.content.length > MAX_TURN_CHARS) {
      return NextResponse.json({ error: 'Malformed message' }, { status: 400 })
    }
  }

  const critique = typeof body.critique === 'string' ? body.critique.trim() : ''
  const critiqueId = typeof body.critiqueId === 'string' ? body.critiqueId : null
  const pieceTitle =
    typeof body.pieceTitle === 'string' && body.pieceTitle.trim()
      ? body.pieceTitle.trim().slice(0, 200)
      : null

  let profile: WritingProfileRow | null = null
  try {
    const { data } = await supabase
      .from('writing_profile')
      .select('recurring_failures, cleared_standards, strengths, current_edge, pieces_reviewed, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    profile = (data as WritingProfileRow | null) ?? null
  } catch (e) {
    console.warn('[interlocutor/chat] profile read failed:', e)
  }

  const system = [
    INTERLOCUTOR_SYSTEM + CONVERSATION_APPENDIX,
    buildProfileBlock(profile),
  ].join('\n\n')

  // Seed the thread with the draft, and with the critique as the agent's own
  // opening turn when there is one. Roles must alternate, so with no critique
  // the draft is folded into the student's first message rather than sent as a
  // message of its own.
  const draftBlock = [
    pieceTitle ? `PIECE: ${pieceTitle}` : null,
    `THE DRAFT UNDER DISCUSSION:\n\n<submission>\n${excerpt}\n</submission>`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const messages: Turn[] = critique
    ? [{ role: 'user', content: draftBlock }, { role: 'assistant', content: critique }, ...turns]
    : [
        { role: 'user', content: `${draftBlock}\n\n${turns[0].content}` },
        ...turns.slice(1),
      ]

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      system,
      messages,
    })

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'The Interlocutor declined to answer.' }, { status: 502 })
    }

    const text = response.content.find(b => b.type === 'text')
    const reply = text && text.type === 'text' ? text.text.trim() : ''
    if (!reply) {
      return NextResponse.json({ error: 'No reply produced' }, { status: 502 })
    }

    // Persist both sides of this exchange. Append-only, under the student's own
    // session so RLS applies. A failure costs the record, not the reply.
    let recorded = false
    if (critiqueId) {
      const { error: insErr } = await supabase.from('critique_messages').insert([
        { critique_id: critiqueId, user_id: user.id, role: 'user', content: turns[turns.length - 1].content },
        { critique_id: critiqueId, user_id: user.id, role: 'assistant', content: reply },
      ])
      if (insErr) console.error('[interlocutor/chat] message insert failed:', insErr.message)
      else recorded = true
    }

    return NextResponse.json({ reply, recorded })
  } catch (e) {
    console.error('[interlocutor/chat]', e)
    return NextResponse.json({ error: 'The Interlocutor is unavailable' }, { status: 502 })
  }
}
