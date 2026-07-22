import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import {
  INTERLOCUTOR_SYSTEM,
  STRUCTURAL_APPENDIX,
  RUBRIC_DIMENSIONS,
  buildProfileBlock,
  type WritingProfileRow,
} from '@/lib/interlocutor'

// POST /api/interlocutor/critique — the Interlocutor reads a passage and
// teaches. It never writes the student's sentences; that constraint lives in
// the system prompt because no code check can enforce it.
//
// Two retrievals, per spec. This route does the first: the derived
// writing_profile is injected ahead of the submission so the agent can name
// patterns rather than correct instances. The second (fidelity check against
// the RAG corpus) is step 5 and not wired yet.
//
// Body: {
//   excerpt,                       // the passage submitted (selection or draft)
//   scope?: 'selection'|'document',
//   documentContext?,              // the surrounding piece, when a selection was sent
//   pieceTitle?,
//   mode?: 'full'|'structural',    // Opus full critique, or Sonnet structural pass
// }
// Returns: { critique, dimensions_flagged, id }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 300

const MAX_EXCERPT = 60000
const MAX_CONTEXT = 120000

// The critique is prose; dimensions_flagged rides alongside it so the profile
// derivation job has a structured signal to aggregate without re-reading every
// critique with a model.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    critique: { type: 'string' },
    dimensions_flagged: {
      type: 'array',
      items: { type: 'string', enum: [...RUBRIC_DIMENSIONS] },
    },
  },
  required: ['critique', 'dimensions_flagged'],
  additionalProperties: false,
} as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    excerpt?: string
    scope?: 'selection' | 'document'
    documentContext?: string
    pieceTitle?: string
    mode?: 'full' | 'structural'
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : ''
  if (excerpt.length < 40) {
    return NextResponse.json(
      { error: 'Send at least a few sentences. There is nothing to judge in less.' },
      { status: 400 }
    )
  }
  if (excerpt.length > MAX_EXCERPT) {
    return NextResponse.json(
      { error: 'That passage is too long for a single critique. Submit it in parts.' },
      { status: 400 }
    )
  }

  const scope = body.scope === 'selection' ? 'selection' : 'document'
  const mode = body.mode === 'structural' ? 'structural' : 'full'
  const pieceTitle =
    typeof body.pieceTitle === 'string' && body.pieceTitle.trim()
      ? body.pieceTitle.trim().slice(0, 200)
      : null
  const documentContext =
    scope === 'selection' && typeof body.documentContext === 'string'
      ? body.documentContext.slice(0, MAX_CONTEXT)
      : null

  // Profile injection. A missing profile is not an error: buildProfileBlock
  // tells the agent it has no history and must not invent one.
  let profile: WritingProfileRow | null = null
  try {
    const { data } = await supabase
      .from('writing_profile')
      .select('recurring_failures, cleared_standards, strengths, current_edge, pieces_reviewed, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    profile = (data as WritingProfileRow | null) ?? null
  } catch (e) {
    console.warn('[interlocutor/critique] profile read failed:', e)
  }

  const system = [
    INTERLOCUTOR_SYSTEM + (mode === 'structural' ? STRUCTURAL_APPENDIX : ''),
    buildProfileBlock(profile),
  ].join('\n\n')

  const userContent = [
    pieceTitle ? `PIECE: ${pieceTitle}` : null,
    documentContext
      ? `THE FULL PIECE, for context only. Do not critique it; the student submitted a selection from it.\n\n<piece>\n${documentContext}\n</piece>\n`
      : null,
    scope === 'selection'
      ? 'THE SUBMISSION (a selection). Critique this:'
      : 'THE SUBMISSION (the full draft). Critique this:',
    `\n<submission>\n${excerpt}\n</submission>`,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const response = await client.messages.create({
      model: mode === 'structural' ? 'claude-sonnet-5' : 'claude-opus-4-8',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: userContent }],
      output_config: { format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
    })

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'The Interlocutor declined this submission.' }, { status: 502 })
    }

    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'No critique produced' }, { status: 502 })
    }

    const parsed = JSON.parse(text.text) as { critique: string; dimensions_flagged: string[] }
    const critique = (parsed.critique ?? '').trim()
    if (!critique) {
      return NextResponse.json({ error: 'No critique produced' }, { status: 502 })
    }
    const dimensions = [...new Set(
      (Array.isArray(parsed.dimensions_flagged) ? parsed.dimensions_flagged : [])
        .filter((d): d is string => typeof d === 'string')
        .filter(d => (RUBRIC_DIMENSIONS as readonly string[]).includes(d))
    )]

    // Persist the record the profile is later derived from. Written under the
    // student's own session, so RLS applies. A write failure loses the pattern
    // history, so it is reported rather than swallowed, but the critique the
    // student earned is still returned.
    let id: string | null = null
    const { data: inserted, error: insErr } = await supabase
      .from('critique_history')
      .insert({
        user_id: user.id,
        excerpt,
        dimensions_flagged: dimensions,
        critique,
        piece_title: pieceTitle,
      })
      .select('id')
      .single()
    if (insErr) {
      console.error('[interlocutor/critique] history insert failed:', insErr.message)
    } else {
      id = (inserted as { id: string }).id
    }

    return NextResponse.json({
      critique,
      dimensions_flagged: dimensions,
      id,
      recorded: id !== null,
    })
  } catch (e) {
    console.error('[interlocutor/critique]', e)
    return NextResponse.json({ error: 'The Interlocutor is unavailable' }, { status: 502 })
  }
}
