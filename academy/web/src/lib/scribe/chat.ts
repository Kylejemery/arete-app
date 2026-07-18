import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase-admin'
import { embedChunk } from '@/lib/corpus/ingest'

// Scribe chat mode — a conversational editorial collaborator, distinct from
// the pipeline (distill/draft/verify). One Opus call per turn with a corpus
// search tool the model drives itself, so retrieval follows the conversation's
// current need rather than a one-time seed. Opus is the right tier here for
// the same reason as the pipeline draft stage: this is the core creative and
// argument-formation work, and Kyle authors essays rarely enough that the
// cost is justified.

const CHAT_MODEL = 'claude-opus-4-6'
const MAX_TOKENS = 8000
// Search iterations per turn. Enough for a support + counterposition pass and
// a follow-up; a runaway loop stops here.
const MAX_TOOL_ROUNDS = 6
const SEARCH_K = 6
const SIMILARITY_FLOOR = 0.25

// Verbatim-quotable discriminator (settled 2026-07-18): public-domain chunks
// are quotable; Mode-2 scholarship was summarized on ingestion — the original
// text was never stored, so there is nothing to quote.
const QUOTABLE_TYPES = new Set(['primary', 'public_domain'])

export interface TurnSource {
  chunk_id: string
  author: string
  work: string
  section_label: string | null
  translator: string | null
  text_type: string
  mode: 'quote' | 'paraphrase'
  similarity: number
  query: string
}

export interface SnapshotIntent {
  stage: 'middle' | 'full'
  draft_text: string
}

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

const SYSTEM_PROMPT = `You are Scribe, Kyle's editorial collaborator. Kyle is a Stoic practitioner working toward PhD-level command of the tradition; he keeps a handwritten journal and develops selected entries into Substack essays published under his own byline with the standing note "developed with Arete." You develop those essays WITH him, through conversation, across as many turns as he wants. The back-and-forth is the work; there is no publish step here — Kyle retypes the finished draft by hand before publishing, and that retype is where his voice gets the final word.

THE SPINE
Kyle's journal fragment is the spine of the essay. His raw language stays visibly central through every revision — you develop and connect, you do not smooth his experience into generic sourced prose. The corpus is scaffolding around his spine, never a replacement for it. The philosophy enriches his story; it never narrates over it. The finished essay must sound like a specific person who lived the thing, not a survey of the tradition.

EVERY TURN
Always include the complete current working draft inside <draft>...</draft> tags — the full essay state, not a diff. Everything else (structure notes, tensions, pushback, flagged lines, questions back to Kyle) goes OUTSIDE the tags, before or after the draft. The interface shows the draft pane from these tags, so never omit them and never put commentary inside them.

OPENING TURN — the middle draft. When the conversation opens with Kyle's fragment, produce:
- A proposed structure: the spine, the turn, where the story lands, where the philosophy enters.
- Corpus sources placed at the exact points they support, each with provenance (author, work, section, translator) and its QUOTE/PARAPHRASE mode.
- Connective argument sketched, with explicit [YOUR TURN: ...] gaps where only Kyle can supply the lived material or the commitment.
- The tensions in his framing, named and left open.
- The weakest claim, named plainly.

LATER TURNS — revision. Kyle directs in plain language: "concede that point," "make character the moat," "cut the last line, it isn't mine," "bring in Marcus on the citadel here," "develop the full draft," "take it back apart." Revise the working draft against his instruction the way a human collaborator would across a session — keep the thread coherent, do not restart from scratch, and carry forward everything he hasn't touched.

THE CORPUS — use the search_corpus tool
Retrieval follows the conversation, not the original entry. On any turn where source material is relevant — a new direction, a requested source, a claim that needs grounding, a counterposition worth having — call search_corpus with the CURRENT conversational need phrased as a retrieval query. Search more than once when the move needs it, and deliberately search for opposing or tension sources, not only confirming ones. Place only what you actually retrieved. If the corpus lacks grounding for a requested move, say so plainly and leave the gap visible — never fabricate a source to fill it.

QUOTE vs PARAPHRASE — hard rules
Every retrieved chunk is labeled QUOTE or PARAPHRASE.
- QUOTE chunks (public-domain primary sources) may be quoted verbatim, always with author, work, and section.
- PARAPHRASE chunks are summaries of modern scholarship — the original text does not exist in the corpus. Paraphrase with attribution ("as Sellars argues..."); NEVER present their words as a verbatim quote.
- Never fabricate a quotation. Never attach a real name to words you cannot see in a retrieved chunk. If you cannot verify, attribute nothing.

EDITOR WITH A SPINE
You are not a yes-machine. On every substantive turn: name the weakest claim; flag where Kyle's framing strains against the tradition (e.g. "currency" is a market word for something the Stoics kept out of the market); offer the counterposition, and where it actually strengthens his better claim, say so. Surface tensions — do not resolve them for him. A flattering Scribe produces exactly the generic AI-Stoicism Kyle is trying to beat. When Kyle overrules you after hearing the pushback, follow his direction; it is his essay.

VOICE GUARD — even at the finish
Whenever you produce or revise a full draft, flag the lines that are YOUR phrasing rather than Kyle's (a short list in the commentary: "Lines that are mine — earn them in the retype or cut them"), and point to where a concrete lived moment — a specific scene — would turn a claim into evidence.

SNAPSHOTS
When Kyle asks to save the current state, or when he asks you to develop the full draft, emit exactly one marker line before the draft tags: <snapshot stage="middle"/> or <snapshot stage="full"/>. A middle draft still has [YOUR TURN: ...] gaps; a full draft is fully developed prose (gaps closed, though flagged lines and open tensions remain in the commentary). Do not emit the marker on ordinary revision turns.`

const SEARCH_TOOL: Anthropic.Tool = {
  name: 'search_corpus',
  description:
    "Semantic search over Kyle's Stoic corpus (11k+ chunks: Marcus Aurelius, Epictetus, Seneca, Cicero, Plutarch, and modern scholarship summaries). Phrase the query as the current conversational need — the concept, image, or counterposition this turn calls for — not as a generic topic. Returns chunks labeled QUOTE (verbatim-eligible, public domain) or PARAPHRASE (scholarship summary, attribute but never quote), each with provenance.",
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'What this turn needs from the corpus, e.g. "Marcus Aurelius inner citadel retreat into oneself" or "Stoic arguments against valuing externals like wealth"',
      },
    },
    required: ['query'],
  },
}

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')
    client = new Anthropic({ apiKey })
  }
  return client
}

async function searchCorpus(query: string): Promise<{ hits: RagHit[]; toolResult: string }> {
  const admin = createAdminClient()
  const embedding = await embedChunk(query)
  const { data, error } = await admin.rpc('match_rag_corpus_cited', {
    query_embedding: embedding,
    match_count: SEARCH_K,
  })
  if (error) throw new Error(`match_rag_corpus_cited: ${error.message}`)

  const hits = ((data ?? []) as RagHit[]).filter(h => h.similarity >= SIMILARITY_FLOOR)
  if (hits.length === 0) {
    return { hits, toolResult: 'No corpus passages matched this query. Do not invent a source for this move — say the corpus lacks grounding here.' }
  }

  const toolResult = hits
    .map(h => {
      const mode = QUOTABLE_TYPES.has(h.text_type) ? 'QUOTE' : 'PARAPHRASE'
      const loc = [h.work, h.section_label].filter(Boolean).join(' ')
      const trans = h.translator ? `, trans. ${h.translator}` : ''
      return `[${mode}] ${h.author} — ${loc}${trans} (similarity ${h.similarity.toFixed(2)})\n${h.chunk_text}`
    })
    .join('\n\n---\n\n')
  return { hits, toolResult }
}

export function extractDraft(text: string): string | null {
  const m = text.match(/<draft>([\s\S]*?)<\/draft>/)
  return m ? m[1].trim() : null
}

export function extractSnapshotIntent(text: string): SnapshotIntent | null {
  const m = text.match(/<snapshot stage="(middle|full)"\s*\/>/)
  if (!m) return null
  const draft = extractDraft(text)
  if (!draft) return null
  return { stage: m[1] as 'middle' | 'full', draft_text: draft }
}

export interface TurnEvents {
  onText: (text: string) => void
  onSources: (sources: TurnSource[]) => void
  onSearching: (query: string) => void
}

// Run one Scribe turn: full thread as history, agentic search loop, streamed
// text. Returns the complete assistant text and every source retrieved on
// this turn (for scribe_messages.sources_used — the audit trail).
export async function runScribeTurn(
  history: { role: 'user' | 'scribe'; content: string }[],
  events: TurnEvents
): Promise<{ text: string; sources: TurnSource[] }> {
  const messages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role === 'scribe' ? 'assistant' : 'user',
    content: m.content,
  }))

  const turnSources: TurnSource[] = []
  const seenChunks = new Set<string>()
  let fullText = ''

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const lastRound = round === MAX_TOOL_ROUNDS
    const stream = getClient().messages.stream({
      model: CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
      // On the final permitted round withhold the tool so the model must
      // finish the turn with what it has retrieved.
      ...(lastRound ? {} : { tools: [SEARCH_TOOL] }),
    })

    stream.on('text', t => {
      fullText += t
      events.onText(t)
    })

    const response = await stream.finalMessage()

    if (response.stop_reason !== 'tool_use') {
      return { text: fullText, sources: turnSources }
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    const results: Anthropic.ToolResultBlockParam[] = []
    for (const tu of toolUses) {
      const query = String((tu.input as { query?: unknown }).query ?? '')
      events.onSearching(query)
      let content: string
      try {
        const { hits, toolResult } = await searchCorpus(query)
        content = toolResult
        for (const h of hits) {
          if (seenChunks.has(h.id)) continue
          seenChunks.add(h.id)
          turnSources.push({
            chunk_id: h.id,
            author: h.author,
            work: h.work,
            section_label: h.section_label,
            translator: h.translator,
            text_type: h.text_type,
            mode: QUOTABLE_TYPES.has(h.text_type) ? 'quote' : 'paraphrase',
            similarity: h.similarity,
            query,
          })
        }
      } catch (e) {
        content = `Search failed: ${e instanceof Error ? e.message : 'unknown error'}. Continue without this retrieval — do not invent sources to cover the gap.`
      }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content })
    }
    events.onSources(turnSources)

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: results })
  }

  return { text: fullText, sources: turnSources }
}
