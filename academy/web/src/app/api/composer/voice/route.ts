import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { VOICE_SYSTEM, buildExemplarBlock, type VoiceExemplar, type VoiceVariant } from '@/lib/composer'

// POST /api/composer/voice — say one sentence the way the writer says things.
//
// The retype callout asks for this when the writer wants a starting point in
// their own register rather than the Interlocutor's. The voice is judged from
// the writer's own earlier drafts (their latest version of each recent piece),
// and, for an admin, from the Scribe style profile if one has been filled in.
// The result is three variants, each with a one-line note; the writer loads
// one into the callout, types over it, and commits. Nothing here writes to
// the draft.
//
// Body: { sentence, attempt?, before?, after?, title?, draft? }
// Returns: { variants: [{ text, note }] }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

const MAX_SENTENCE = 2000
const MAX_CONTEXT = 1500
const MAX_DRAFT = 12000
const EXEMPLAR_PIECES = 3
const EXEMPLAR_CHARS = 2400

const VARIANT_SCHEMA = {
  type: 'object',
  properties: {
    variants: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['text', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: ['variants'],
  additionalProperties: false,
} as const

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '')

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    sentence?: string
    attempt?: string
    before?: string
    after?: string
    title?: string
    draft?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sentence = clip(body.sentence, MAX_SENTENCE).trim()
  if (!sentence) {
    return NextResponse.json({ error: 'There is no sentence to rewrite.' }, { status: 400 })
  }
  const attempt = clip(body.attempt, MAX_SENTENCE).trim()
  const before = clip(body.before, MAX_CONTEXT)
  const after = clip(body.after, MAX_CONTEXT)
  const title = clip(body.title, 200).trim()
  const draft = clip(body.draft, MAX_DRAFT)

  // ── The writer's own prose ─────────────────────────────────────────────────
  // Latest draft of each of the writer's most recent pieces, newest first. RLS
  // scopes this to their own rows.
  const exemplars: VoiceExemplar[] = []
  try {
    const { data } = await supabase
      .from('piece_drafts')
      .select('piece_id, version, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(24)
    const seen = new Set<string>()
    for (const row of (data as { piece_id: string; version: number; content: string }[]) ?? []) {
      if (seen.has(row.piece_id)) continue
      seen.add(row.piece_id)
      const text = (row.content ?? '').trim()
      // Skip the piece being written: its sentences are already in the prompt.
      if (!text || (draft && draft.includes(text.slice(0, 200)))) continue
      exemplars.push({ title: `Draft v${row.version}`, text: text.slice(0, EXEMPLAR_CHARS) })
      if (exemplars.length >= EXEMPLAR_PIECES) break
    }
  } catch (e) {
    console.warn('[composer/voice] exemplar read failed:', e)
  }

  // The Scribe voice card, when the writer is the admin who keeps one. Served
  // through the admin client because the table is locked to it; any failure
  // simply means no guidance.
  let guidance: string | null = null
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if ((profile as { is_admin?: boolean } | null)?.is_admin) {
      const admin = createAdminClient()
      const { data: style } = await admin
        .from('scribe_style_profiles')
        .select('exemplar_refs, guidance')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const s = style as { exemplar_refs?: { title?: string; text?: string }[]; guidance?: string } | null
      if (s?.guidance?.trim()) guidance = s.guidance
      for (const ex of s?.exemplar_refs ?? []) {
        if (ex?.text?.trim() && exemplars.length < EXEMPLAR_PIECES + 2) {
          exemplars.unshift({ title: ex.title ?? 'Published', text: ex.text.slice(0, EXEMPLAR_CHARS) })
        }
      }
    }
  } catch {
    // No style profile reachable: the writer's drafts are enough.
  }

  const system = [VOICE_SYSTEM, buildExemplarBlock(exemplars, guidance)].join('\n\n')

  const userContent = [
    title ? `PIECE: ${title}` : null,
    before ? `WHAT COMES BEFORE IT:\n${before}` : 'WHAT COMES BEFORE IT: (nothing; this opens the draft)',
    `THE SENTENCE TO SAY IN THE WRITER'S VOICE:\n<sentence>\n${sentence}\n</sentence>`,
    after ? `WHAT COMES AFTER IT:\n${after}` : 'WHAT COMES AFTER IT: (nothing; this closes the draft)',
    attempt && attempt !== sentence
      ? `THE WRITER HAS BEGUN RETYPING IT AS:\n<attempt>\n${attempt}\n</attempt>\nHonor the direction of this attempt.`
      : null,
    draft ? `THE DRAFT, FOR CONTEXT ONLY (do not rewrite any of it):\n<draft>\n${draft}\n</draft>` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: userContent }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: VARIANT_SCHEMA } },
    })
    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'No variants were offered for this sentence.' }, { status: 502 })
    }
    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'No variants produced' }, { status: 502 })
    }
    const parsed = JSON.parse(text.text) as { variants: VoiceVariant[] }
    const variants = (parsed.variants ?? [])
      .filter(v => typeof v.text === 'string' && v.text.trim())
      .map(v => ({ text: v.text.trim(), note: (v.note ?? '').trim() }))
      .slice(0, 3)
    return NextResponse.json({ variants })
  } catch (e) {
    console.error('[composer/voice]', e)
    return NextResponse.json({ error: 'The voice pass is unavailable' }, { status: 502 })
  }
}
