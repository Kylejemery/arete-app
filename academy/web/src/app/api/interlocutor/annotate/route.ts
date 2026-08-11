import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import {
  INTERLOCUTOR_SYSTEM,
  ANNOTATION_APPENDIX,
  RUBRIC_DIMENSIONS,
  SEVERITY_LEVELS,
  DEFAULT_STAGE,
  isStage,
  buildStageAppendix,
  buildProfileBlock,
  type WritingProfileRow,
  type AnnotationOut,
} from '@/lib/interlocutor'
import { locate } from '@/lib/annotations'

// POST /api/interlocutor/annotate — the marked-up pass. The Interlocutor reads a
// draft and returns a summary plus annotations anchored to verbatim quotes; this
// route snapshots the draft as an immutable version, locates each quote's offsets
// server-side (the model is never trusted to count characters), and persists the
// annotations so the student can iterate version to version.
//
// One critique_history row is still written per pass so the nightly
// writing_profile derivation (server/interlocutor-profile.js) keeps working
// unchanged.
//
// Body: { pieceId?, title?, draftContent, stage? }
// Returns: { pieceId, draftId, version, summary, annotations, generalNotes }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 300

const MIN_DRAFT = 40
const MAX_DRAFT = 60000
const MAX_ANNOTATIONS = 60

const ANNOTATION_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    annotations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string' },
          dimension: { type: 'string', enum: [...RUBRIC_DIMENSIONS] },
          severity: { type: 'string', enum: [...SEVERITY_LEVELS] },
          comment: { type: 'string' },
          suggestion: { type: ['string', 'null'] },
        },
        required: ['quote', 'dimension', 'severity', 'comment', 'suggestion'],
        additionalProperties: false,
      },
    },
    dimensions_flagged: {
      type: 'array',
      items: { type: 'string', enum: [...RUBRIC_DIMENSIONS] },
    },
  },
  required: ['summary', 'annotations', 'dimensions_flagged'],
  additionalProperties: false,
} as const

// The stored annotation, offsets resolved. start/end are null when the quote
// could not be placed in the draft: it becomes a general note rather than an
// inline highlight, so nothing the model said is silently dropped.
interface StoredAnnotation {
  id: string
  start_offset: number | null
  end_offset: number | null
  quote: string
  dimension: string
  severity: string
  comment: string
  suggestion: string | null
  status: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    pieceId?: string
    title?: string
    draftContent?: string
    stage?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const draftContent = typeof body.draftContent === 'string' ? body.draftContent : ''
  const trimmed = draftContent.trim()
  if (trimmed.length < MIN_DRAFT) {
    return NextResponse.json(
      { error: 'Write at least a few sentences. There is nothing to mark up in less.' },
      { status: 400 }
    )
  }
  if (draftContent.length > MAX_DRAFT) {
    return NextResponse.json(
      { error: 'That draft is too long for a single pass. Submit it in parts.' },
      { status: 400 }
    )
  }

  const title =
    typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : null

  // The guided-flow stage, validated. Drives which rubric dimensions the coach
  // weights and whether it offers rewrites at all.
  const stage = isStage(body.stage) ? body.stage : DEFAULT_STAGE

  // ── Resolve the piece: reuse an owned one, or start a new one ────────────────
  let pieceId: string
  if (typeof body.pieceId === 'string' && body.pieceId) {
    const { data: piece, error } = await supabase
      .from('writing_pieces')
      .select('id')
      .eq('id', body.pieceId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error || !piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }
    pieceId = (piece as { id: string }).id
    // Keep the title, stage, and updated_at current.
    await supabase
      .from('writing_pieces')
      .update({ title, stage, updated_at: new Date().toISOString() })
      .eq('id', pieceId)
      .eq('user_id', user.id)
  } else {
    const { data: created, error } = await supabase
      .from('writing_pieces')
      .insert({ user_id: user.id, title, stage })
      .select('id')
      .single()
    if (error || !created) {
      console.error('[interlocutor/annotate] piece insert failed:', error?.message)
      return NextResponse.json({ error: 'Could not start the piece' }, { status: 500 })
    }
    pieceId = (created as { id: string }).id
  }

  // ── Profile injection (a missing profile is not an error) ────────────────────
  let profile: WritingProfileRow | null = null
  try {
    const { data } = await supabase
      .from('writing_profile')
      .select('recurring_failures, cleared_standards, strengths, current_edge, pieces_reviewed, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    profile = (data as WritingProfileRow | null) ?? null
  } catch (e) {
    console.warn('[interlocutor/annotate] profile read failed:', e)
  }

  const system = [
    INTERLOCUTOR_SYSTEM + ANNOTATION_APPENDIX + buildStageAppendix(stage),
    buildProfileBlock(profile),
  ].join('\n\n')

  const userContent = [
    title ? `PIECE: ${title}` : null,
    'THE DRAFT. Mark this up:',
    `\n<draft>\n${draftContent}\n</draft>`,
  ]
    .filter(Boolean)
    .join('\n\n')

  // ── The model ────────────────────────────────────────────────────────────────
  let parsed: { summary: string; annotations: AnnotationOut[]; dimensions_flagged: string[] }
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: userContent }],
      output_config: { format: { type: 'json_schema', schema: ANNOTATION_SCHEMA } },
    })

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'The Interlocutor declined this draft.' }, { status: 502 })
    }
    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'No markup produced' }, { status: 502 })
    }
    parsed = JSON.parse(text.text)
  } catch (e) {
    console.error('[interlocutor/annotate]', e)
    return NextResponse.json({ error: 'The Interlocutor is unavailable' }, { status: 502 })
  }

  const summary = (parsed.summary ?? '').trim()
  const rawAnnotations = (Array.isArray(parsed.annotations) ? parsed.annotations : []).slice(
    0,
    MAX_ANNOTATIONS
  )

  // ── Snapshot the version ─────────────────────────────────────────────────────
  const { data: last } = await supabase
    .from('piece_drafts')
    .select('version')
    .eq('piece_id', pieceId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const version = ((last as { version: number } | null)?.version ?? 0) + 1
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0

  const { data: draft, error: draftErr } = await supabase
    .from('piece_drafts')
    .insert({
      piece_id: pieceId,
      user_id: user.id,
      version,
      content: draftContent,
      word_count: wordCount,
    })
    .select('id')
    .single()
  if (draftErr || !draft) {
    console.error('[interlocutor/annotate] draft insert failed:', draftErr?.message)
    return NextResponse.json({ error: 'Could not save the draft version' }, { status: 500 })
  }
  const draftId = (draft as { id: string }).id

  // ── Locate offsets and persist annotations ───────────────────────────────────
  // Locate against the exact submitted content (not the trimmed copy) so offsets
  // index the stored version. A found quote advances the search cursor so repeated
  // phrases anchor left-to-right rather than all onto the first occurrence.
  let cursor = 0
  const rows = rawAnnotations.map(a => {
    const span = locate(draftContent, a.quote ?? '', cursor)
    if (span) cursor = span.start + 1
    return {
      draft_id: draftId,
      user_id: user.id,
      start_offset: span ? span.start : null,
      end_offset: span ? span.end : null,
      quote: a.quote ?? '',
      dimension: a.dimension,
      severity: a.severity,
      comment: a.comment ?? '',
      suggestion: a.suggestion ?? null,
    }
  })

  let stored: StoredAnnotation[] = []
  if (rows.length) {
    const { data: inserted, error: annErr } = await supabase
      .from('draft_annotations')
      .insert(rows)
      .select('id, start_offset, end_offset, quote, dimension, severity, comment, suggestion, status')
    if (annErr) {
      console.error('[interlocutor/annotate] annotation insert failed:', annErr.message)
    } else {
      stored = (inserted as StoredAnnotation[]) ?? []
    }
  }

  // ── Feed the profile: one critique_history row per pass ───────────────────────
  const dimensions = [
    ...new Set(
      [
        ...(Array.isArray(parsed.dimensions_flagged) ? parsed.dimensions_flagged : []),
        ...rawAnnotations.map(a => a.dimension),
      ]
        .filter((d): d is string => typeof d === 'string')
        .filter(d => (RUBRIC_DIMENSIONS as readonly string[]).includes(d))
    ),
  ]

  const historyText = [
    summary,
    '',
    ...rawAnnotations.map(a => {
      const head = `- [${a.severity}/${a.dimension}] "${(a.quote ?? '').slice(0, 120)}"`
      const sugg = a.suggestion ? ` (suggested rewrite offered)` : ''
      return `${head}: ${a.comment}${sugg}`
    }),
  ].join('\n')

  const { error: histErr } = await supabase.from('critique_history').insert({
    user_id: user.id,
    excerpt: draftContent,
    dimensions_flagged: dimensions,
    critique: historyText,
    piece_title: title,
  })
  const recorded = !histErr
  if (histErr) {
    console.error('[interlocutor/annotate] history insert failed:', histErr.message)
  }

  // Located annotations carry offsets; unlocated ones ride back as general notes.
  const annotations = stored.filter(a => a.start_offset !== null && a.end_offset !== null)
  const generalNotes = stored.filter(a => a.start_offset === null || a.end_offset === null)

  return NextResponse.json({
    pieceId,
    draftId,
    version,
    summary,
    annotations,
    generalNotes,
    recorded,
  })
}
