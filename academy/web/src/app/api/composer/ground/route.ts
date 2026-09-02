import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { embedChunk } from '@/lib/corpus/ingest'
import {
  FIDELITY_SYSTEM,
  QUOTABLE_TYPES,
  type FidelityAssessment,
  type GroundedPassage,
} from '@/lib/composer'

// POST /api/composer/ground — set one sentence against the corpus.
//
// The retype callout asks for this when the writer wants to know what the
// tradition actually says where their sentence stands. Retrieval is the same
// cited search Scribe uses (embedding over rag_corpus via
// match_rag_corpus_cited), returned with provenance and with whether each
// passage may be quoted verbatim or only paraphrased. With `assess` set, a
// second, short model pass judges fidelity: does the sentence represent these
// sources faithfully, or was the corpus silent.
//
// Body: { passage, context?, assess? }
// Returns: { passages: GroundedPassage[], assessment?: FidelityAssessment | null }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

const MAX_PASSAGE = 2000
const MAX_CONTEXT = 2400
const SEARCH_K = 6
const SIMILARITY_FLOOR = 0.25

type RagHit = {
  id: string
  chunk_text: string
  author: string
  work: string
  section_label: string | null
  translator: string | null
  text_type: string
  similarity: number
}

const FIDELITY_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['supported', 'partly', 'contradicted', 'unsupported'] },
    note: { type: 'string' },
  },
  required: ['verdict', 'note'],
  additionalProperties: false,
} as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { passage?: string; context?: string; assess?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const passage = typeof body.passage === 'string' ? body.passage.trim().slice(0, MAX_PASSAGE) : ''
  if (!passage) {
    return NextResponse.json({ error: 'There is no passage to ground.' }, { status: 400 })
  }
  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT) : ''
  const assess = body.assess === true

  if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Corpus search is not configured in this environment.' },
      { status: 503 }
    )
  }

  // ── Retrieve ───────────────────────────────────────────────────────────────
  let passages: GroundedPassage[] = []
  try {
    const embedding = await embedChunk(passage)
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('match_rag_corpus_cited', {
      query_embedding: embedding,
      match_count: SEARCH_K,
    })
    if (error) throw new Error(error.message)
    passages = ((data ?? []) as RagHit[])
      .filter(h => h.similarity >= SIMILARITY_FLOOR)
      .map(h => ({
        id: h.id,
        author: h.author,
        work: h.work,
        section_label: h.section_label,
        translator: h.translator,
        text_type: h.text_type,
        mode: QUOTABLE_TYPES.has(h.text_type) ? 'quote' : 'paraphrase',
        text: h.chunk_text,
        similarity: h.similarity,
      }))
  } catch (e) {
    console.error('[composer/ground] retrieval failed:', e)
    return NextResponse.json({ error: 'The corpus could not be searched.' }, { status: 502 })
  }

  if (!assess || passages.length === 0) {
    return NextResponse.json({ passages, assessment: null })
  }

  // ── Assess fidelity ────────────────────────────────────────────────────────
  const sources = passages
    .map((p, i) => {
      const loc = [p.work, p.section_label].filter(Boolean).join(' ')
      const trans = p.translator ? `, trans. ${p.translator}` : ''
      return `[${i + 1}] ${p.author}, ${loc}${trans} (${p.mode})\n${p.text}`
    })
    .join('\n\n---\n\n')

  const userContent = [
    `THE SENTENCE:\n<sentence>\n${passage}\n</sentence>`,
    context ? `ITS SURROUNDINGS IN THE DRAFT:\n${context}` : null,
    `THE PASSAGES RETRIEVED FROM THE CORPUS:\n\n${sources}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  let assessment: FidelityAssessment | null = null
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1500,
      thinking: { type: 'adaptive' },
      system: FIDELITY_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: FIDELITY_SCHEMA } },
    })
    const text = response.content.find(b => b.type === 'text')
    if (response.stop_reason !== 'refusal' && text && text.type === 'text') {
      const parsed = JSON.parse(text.text) as FidelityAssessment
      assessment = { verdict: parsed.verdict, note: (parsed.note ?? '').trim() }
    }
  } catch (e) {
    // The passages are the deliverable; the verdict is a bonus.
    console.warn('[composer/ground] assessment failed:', e)
  }

  return NextResponse.json({ passages, assessment })
}
