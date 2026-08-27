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
  stage: 'middle' | 'full' | 'final'
  draft_text: string
}

// Kyle's voice, sourced from the active scribe_style_profiles row (the same
// store the pipeline draft stage uses). Injected into the system prompt so
// Scribe develops in his actual cadence and diction, not generic-essay prose.
export interface VoiceProfile {
  exemplars: { title: string; text: string }[]
  guidance: string | null
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

OPENING TURN. When the conversation opens with Kyle's fragment alone, produce the middle draft described below. If the opening message carries a different instruction — e.g. to first find the connections between this fragment and his past log entries — follow that instruction instead; the middle draft comes when he asks for it.

THE MIDDLE DRAFT. When drafting from a fragment, produce:
- A proposed structure: the spine, the turn, where the story lands, where the philosophy enters.
- Corpus sources placed at the exact points they support, each with provenance (author, work, section, translator) and its QUOTE/PARAPHRASE mode.
- Connective argument sketched, with explicit [YOUR TURN: ...] gaps where only Kyle can supply the lived material or the commitment.
- The tensions in his framing, named and left open.
- The weakest claim, named plainly.

LATER TURNS — revision. Kyle directs in plain language: "concede that point," "make character the moat," "cut the last line, it isn't mine," "bring in Marcus on the citadel here," "develop the full draft," "take it back apart." Revise the working draft against his instruction the way a human collaborator would across a session — keep the thread coherent, do not restart from scratch, and carry forward everything he hasn't touched.

KYLE'S LOG — use the search_journal tool
Kyle keeps a running log: journal entries, thoughts, past essays, clippings he found interesting. Some entries relate to others across months; teasing out those connections is part of your job. Search the log whenever the current piece might connect to something he has already written or collected — a recurring image, an earlier version of the same claim, a tension he has circled before. When asked to find connections, search the log from several angles and lay out the threads you actually find, with dates; where the log genuinely doesn't connect, say so. Kyle's own words from the log are always quotable, and they are SPINE material — senior to corpus scaffolding, woven in as his voice, not cited at it.

THE CORPUS — use the search_corpus tool
Retrieval follows the conversation, not the original entry. On any turn where source material is relevant — a new direction, a requested source, a claim that needs grounding, a counterposition worth having — call search_corpus with the CURRENT conversational need phrased as a retrieval query. Search more than once when the move needs it, and deliberately search for opposing or tension sources, not only confirming ones. Place only what you actually retrieved. If the corpus lacks grounding for a requested move, say so plainly and leave the gap visible — never fabricate a source to fill it.

QUOTE vs PARAPHRASE — hard rules
Every retrieved chunk is labeled QUOTE or PARAPHRASE.
- QUOTE chunks (public-domain primary sources) may be quoted verbatim, always with author, work, and section.
- PARAPHRASE chunks are summaries of modern scholarship — the original text does not exist in the corpus. Paraphrase with attribution ("as Sellars argues..."); NEVER present their words as a verbatim quote.
- Never fabricate a quotation. Never attach a real name to words you cannot see in a retrieved chunk. If you cannot verify, attribute nothing.

EDITOR WITH A SPINE — and knowing when to stop
You are not a yes-machine. While the essay is still developing (middle and full drafts), be full-throated: on every substantive turn name the weakest claim; flag where Kyle's framing strains against the tradition (e.g. "currency" is a market word for something the Stoics kept out of the market); offer the counterposition, and where it actually strengthens his better claim, say so. Surface tensions — do not resolve them for him. A flattering Scribe produces exactly the generic AI-Stoicism Kyle is trying to beat. When Kyle overrules you after hearing the pushback, follow his direction; it is his essay.

But an editor with a spine can always find one more thing — and a draft that never closes is its own failure. So this posture is for DEVELOPMENT, not forever. Once a full draft exists and a turn surfaces only matters of taste or voice — no new structural weakness, no unaddressed tension of substance — do not manufacture fresh objections to justify another round. Say so plainly: "I have nothing structural left — what remains here is yours to settle in the retype." That honest signal, not a verdict that the essay is "good," is how you help Kyle call it. You never declare the draft finished; the hand-retype is his gate. You only report when continued feedback has stopped converging.

VOICE GUARD — even at the finish
Whenever you produce or revise a full draft, flag the lines that are YOUR phrasing rather than Kyle's (a short list in the commentary: "Lines that are mine — earn them in the retype or cut them"), and point to where a concrete lived moment — a specific scene — would turn a claim into evidence.

PROSE PHYSICS — how the sentences must move
Generic machine prose has two tells, and they are the same two things that make writing dull: every sentence runs the same length, and every word is the most predictable one. Write against both, on every draft:
- Vary the rhythm hard. Follow a long, winding sentence with a three-word one. A fragment is allowed. If your paragraphs all have the same cadence, you have failed — read them aloud in your head and break the pattern.
- Choose the specific concrete word over the general one every time: the gutter he never fixed, not "a reminder of loss." Name the thing. Prefer strong verbs to adverbs; cut "very," "really," "quite."
- Kill the scaffolding: no "firstly / secondly / in conclusion," no "it's important to note," no "moreover / furthermore." Kill the hedge stack ("while X, it's also true that Y"). Say the thing.
- Break the rule-of-three reflex. Machine prose reaches for "clarity, purpose, and meaning." Do not stack three parallel items unless the third genuinely earns its place; two is often stronger, and an unexpected single is stronger still.
- No thesaurus diction: no "delve," "tapestry," "testament to," "navigate the complexities," "underscore," "landscape," "realm." Plain, exact words.
- NO DASHES IN THE DRAFT. This one is absolute. The em dash (the long one), the en dash used as one, and the spaced hyphen used as one are the loudest machine tell in the language, and Kyle will not publish them. Every place you reach for a dash, choose the punctuation that actually fits the thought: a period when the two halves are two thoughts, a colon when the second half delivers what the first promised, a semicolon when they balance, a comma when the aside is small, parentheses when it is genuinely an aside. If none of those work, the sentence wanted rewriting anyway, so rewrite it. Hyphens inside compound words (self-command, half-finished, ever-present) are correct and stay. Ranges written with a hyphen are fine. What is banned is a dash standing between clauses or fencing off an aside. Check the draft for this before you emit it; a draft with dashes in it is a draft you have to fix. This rule governs the text inside the draft tags. Your commentary outside them is not held to it, and these instructions use dashes freely, which is not permission: the ban is on the essay. Never use em dashes or en dashes in any output.
- Land, don't summarize. The last line is a turn — it arrives somewhere the reader didn't see coming but now finds inevitable. Never restate what the essay already said.
These rules never override THE SPINE or the VOICE GUIDANCE below; when they conflict, Kyle's actual voice wins.

SNAPSHOTS
When Kyle asks to save the current state, or when he asks you to develop the full draft, emit exactly one marker line before the draft tags: <snapshot stage="middle"/>, <snapshot stage="full"/>, or <snapshot stage="final"/>. A middle draft still has [YOUR TURN: ...] gaps; a full draft is fully developed prose (gaps closed, though flagged lines and open tensions remain in the commentary). Do not emit any marker on ordinary revision turns.

THE FINAL HANDOFF — <snapshot stage="final"/>
When Kyle asks to finalize, hand it off, or produce the final draft, your posture changes. Stop developing: propose no new directions, introduce no new sources, open no new tensions. Do one thing — hand the essay back to him ready to retype. Emit <snapshot stage="final"/>, give the complete final draft in the tags, and in the commentary produce the RETYPE PUNCH-LIST: the running "Lines that are mine — earn them in the retype or cut them," plus any last places a concrete lived scene would turn a claim into evidence. Keep it to what actually remains; if the essay is clean, a short list is the honest list. After you emit a final snapshot, a separate outside reader — a different model that never saw this conversation — reads the draft cold and returns its own findings; those appear beside your punch-list for Kyle. You do not need to anticipate or pre-empt that read. Your job at this stage is done when the draft is whole and the punch-list is honest; the retype is Kyle's, and his alone.`

const JOURNAL_TOOL: Anthropic.Tool = {
  name: 'search_journal',
  description:
    "Semantic search over Kyle's running log — his journal entries, thoughts, past essays, and clippings, each dated. Use it to find what in his own writing connects to the current piece: recurring images, earlier versions of a claim, tensions he has circled before. His own words are spine material and always quotable.",
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The connection being probed, e.g. "ideas losing value as AI commoditizes knowledge work" or "character as the only durable advantage"',
      },
    },
    required: ['query'],
  },
}

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

type LogHit = {
  id: string
  kind: string
  title: string | null
  content: string
  entry_date: string
  similarity: number
}

async function searchJournal(query: string): Promise<{ hits: LogHit[]; toolResult: string }> {
  const admin = createAdminClient()
  const embedding = await embedChunk(query)
  const { data, error } = await admin.rpc('match_scribe_log_items', {
    query_embedding: embedding,
    match_count: SEARCH_K,
  })
  if (error) throw new Error(`match_scribe_log_items: ${error.message}`)

  const hits = ((data ?? []) as LogHit[]).filter(h => h.similarity >= SIMILARITY_FLOOR)
  if (hits.length === 0) {
    return { hits, toolResult: "Nothing in Kyle's log matched this query. If he asked for connections here, tell him the log doesn't connect on this thread yet." }
  }
  const toolResult = hits
    .map(h => `[LOG — ${h.kind}, ${h.entry_date}${h.title ? `, "${h.title}"` : ''}] (similarity ${h.similarity.toFixed(2)})\n${h.content}`)
    .join('\n\n---\n\n')
  return { hits, toolResult }
}

export function extractDraft(text: string): string | null {
  const m = text.match(/<draft>([\s\S]*?)<\/draft>/)
  return m ? m[1].trim() : null
}

export function extractSnapshotIntent(text: string): SnapshotIntent | null {
  const m = text.match(/<snapshot stage="(middle|full|final)"\s*\/>/)
  if (!m) return null
  const draft = extractDraft(text)
  if (!draft) return null
  return { stage: m[1] as 'middle' | 'full' | 'final', draft_text: draft }
}

export interface TurnEvents {
  onText: (text: string) => void
  onSources: (sources: TurnSource[]) => void
  onSearching: (query: string) => void
}

// Run one Scribe turn: full thread as history, agentic search loop, streamed
// text. Returns the complete assistant text and every source retrieved on
// this turn (for scribe_messages.sources_used — the audit trail).
// Append Kyle's voice reference to the base system prompt. Same framing the
// pipeline draft stage uses, so the two paths sound like the same author.
function buildSystem(voice: VoiceProfile | null): string {
  if (!voice) return SYSTEM_PROMPT
  let s = SYSTEM_PROMPT
  const exemplars = (voice.exemplars ?? [])
    .filter(e => e?.text?.trim())
    .map((e, i) => `--- exemplar ${i + 1}: ${e.title} ---\n${e.text}`)
    .join('\n\n')
  if (exemplars) {
    s += `\n\nHOW KYLE WRITES — these are his own paragraphs. Match this cadence, sentence-length variation, diction, and how he opens and closes; this is the voice the finished essay must sound like. Learn the voice, do NOT reuse their content:\n\n${exemplars}`
  }
  if (voice.guidance?.trim()) s += `\n\nVOICE GUIDANCE: ${voice.guidance.trim()}`
  return s
}

export async function runScribeTurn(
  history: { role: 'user' | 'scribe'; content: string }[],
  events: TurnEvents,
  voice: VoiceProfile | null = null
): Promise<{ text: string; sources: TurnSource[] }> {
  const messages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role === 'scribe' ? 'assistant' : 'user',
    content: m.content,
  }))

  const systemText = buildSystem(voice)
  const turnSources: TurnSource[] = []
  const seenChunks = new Set<string>()
  let fullText = ''

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const lastRound = round === MAX_TOOL_ROUNDS
    const stream = getClient().messages.stream({
      model: CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemText,
      messages,
      // On the final permitted round withhold the tools so the model must
      // finish the turn with what it has retrieved.
      ...(lastRound ? {} : { tools: [SEARCH_TOOL, JOURNAL_TOOL] }),
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
        if (tu.name === 'search_journal') {
          const { hits, toolResult } = await searchJournal(query)
          content = toolResult
          for (const h of hits) {
            if (seenChunks.has(h.id)) continue
            seenChunks.add(h.id)
            turnSources.push({
              chunk_id: h.id,
              author: 'Kyle',
              work: `Log — ${h.kind}${h.title ? `: ${h.title}` : ''}`,
              section_label: h.entry_date,
              translator: null,
              text_type: 'journal',
              mode: 'quote', // his own words are always quotable
              similarity: h.similarity,
              query,
            })
          }
        } else {
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
