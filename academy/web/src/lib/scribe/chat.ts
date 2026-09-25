import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase-admin'
import { embedChunk } from '@/lib/corpus/ingest'
import { logRetrieval, newRequestId } from '@/lib/retrieval-log'
import { MACHINE_TELLS_BLOCK } from '@/lib/machine-tells'
import { BOOK_APPENDIX } from './book-prompts'
import { fitExemplars } from './book'
import {
  cabinetCaveat,
  cabinetDate,
  cabinetSearchQuery,
  cabinetThreadLabel,
  formatCabinetHits,
  searchCabinetHistory,
  type CabinetWho,
} from '@/lib/cabinet-history'

// Scribe chat mode — a conversational editorial collaborator, distinct from
// the pipeline (distill/draft/verify). One Opus call per turn with a corpus
// search tool the model drives itself, so retrieval follows the conversation's
// current need rather than a one-time seed. Opus is the right tier here for
// the same reason as the pipeline draft stage: this is the core creative and
// argument-formation work, and Kyle authors essays rarely enough that the
// cost is justified.

// Opus 5.5 (2026-09-25, was Opus 4.6). Thinking is always on for this model
// and counts against max_tokens, so the ceiling is higher than the old 8,000;
// a rewrite turn raises it further (the turn route). Effort is set explicitly
// because this model defaults to medium.
const CHAT_MODEL = 'claude-opus-5-5'
const CHAT_EFFORT = 'high' as const
export const MAX_TOKENS = 16000
// Search iterations per turn. Enough for a support + counterposition pass and
// a follow-up; a runaway loop stops here.
const MAX_TOOL_ROUNDS = 6
const SEARCH_K = 6
const SIMILARITY_FLOOR = 0.25

// Verbatim-quotable discriminator (settled 2026-07-18): public-domain chunks
// are quotable; Mode-2 scholarship was summarized on ingestion — the original
// text was never stored, so there is nothing to quote.
// Verbatim layers may be quoted; summaries, syntheses, and apparatus are
// paraphrased. Value set: rag_corpus_text_type_check.
export const QUOTABLE_TYPES = new Set(['primary', 'scholarship', 'modern_primary'])

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

export type RagHit = {
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

EVERY TURN — how the draft changes
The working draft lives in its own pane. Whenever one exists, the CURRENT WORKING DRAFT is handed to you at the end of Kyle's latest message inside <working_draft>...</working_draft> tags; that text, exactly as given, is what you are editing. There are two ways to change it.

1. A complete draft inside <draft>...</draft> tags: the whole essay state, not a diff. Use this for the opening middle draft, when developing the full draft, when finalizing, and when a turn restructures most of the essay.

2. Edits in place, for everything else. Each edit is one block:
<edit>
<find>a passage copied verbatim, character for character, from the CURRENT WORKING DRAFT: a sentence or two, or a whole paragraph, enough to be unique in the essay</find>
<replace>the new text for exactly that passage; leave it empty to cut the passage</replace>
</edit>
Emit as many edit blocks as the turn needs, in draft order, never overlapping. To add new material, find the sentence it follows and replace it with that sentence plus the new material. The interface applies each find mechanically: a find that does not match the working draft is dropped and reported to Kyle, so copy the passage, never retype it from memory, and never put commentary inside a find or a replace. Prefer edits. They are faster, Kyle sees exactly what moved in his changes view, and nothing else in the essay can drift. If a turn genuinely needs to touch most of the paragraphs, emit a complete <draft> instead of a long run of edits. A turn that changes nothing emits neither.

Everything else (structure notes, tensions, pushback, flagged lines, questions back to Kyle) goes OUTSIDE the tags, before or after them. Never put commentary inside <draft>, <find>, or <replace>.

OPENING TURN. When the conversation opens with Kyle's fragment alone, produce the middle draft described below. If the opening message carries a different instruction — e.g. to first find the connections between this fragment and his past log entries — follow that instruction instead; the middle draft comes when he asks for it.

THE MIDDLE DRAFT. When drafting from a fragment, produce:
- A proposed structure: the spine, the turn, where the story lands, where the philosophy enters.
- Corpus sources placed at the exact points they support, each with provenance (author, work, section, translator) and its QUOTE/PARAPHRASE mode.
- Connective argument sketched, with explicit [YOUR TURN: ...] gaps where only Kyle can supply the lived material or the commitment.
- The tensions in his framing, named and left open.
- The weakest claim, named plainly.

LATER TURNS — revision. Kyle directs in plain language: "concede that point," "make character the moat," "cut the last line, it isn't mine," "bring in Marcus on the citadel here," "develop the full draft," "take it back apart." Revise the working draft against his instruction the way a human collaborator would across a session — keep the thread coherent, do not restart from scratch, and touch only what the instruction reaches, with edit blocks. Everything he hasn't touched stays exactly as it stands, by construction.

KYLE'S LOG — use the search_journal tool
Kyle keeps a running log: journal entries, thoughts, past essays, clippings he found interesting. Some entries relate to others across months; teasing out those connections is part of your job. Search the log whenever the current piece might connect to something he has already written or collected — a recurring image, an earlier version of the same claim, a tension he has circled before. When asked to find connections, search the log from several angles and lay out the threads you actually find, with dates; where the log genuinely doesn't connect, say so. Kyle's own words from the log are always quotable, and they are SPINE material — senior to corpus scaffolding, woven in as his voice, not cited at it.

KYLE'S CABINET — use the search_cabinet tool
Kyle also talks, most days, with his Cabinet: the counselors in the Arete app (Marcus, Epictetus, Roosevelt, Goggins, Montaigne and others), in a running thread that goes back months. That is where much of his thinking happens first, in his own words, before it reaches the journal. Search the Cabinet when the current piece might connect to something he has said there: the same claim in rougher form, the scene behind an abstraction, a commitment he made, a fear he named. Search it from several angles when asked for connections, and lay out what you actually find, with dates. His own lines are SPINE material, quotable and senior to the corpus, woven in as his voice. The counselors' replies are generated by the app in a historical figure's voice: they are context for what he was working through, never sources. Never quote a counselor's reply, never cite it, and never attribute its words to the historical person it is voiced as; if the Cabinet's Marcus said something worth having, find the real Marcus in the corpus.

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
Whenever you produce or revise a full draft, flag the lines that are YOUR phrasing rather than Kyle's (a short list in the commentary: "Lines that are mine — earn them in the retype or cut them"), and point to where a concrete lived moment — a specific scene — would turn a claim into evidence. The scene is not an insert: a single first-person paragraph dropped into sourced prose is the loudest structural tell there is, because it is the one paragraph that sounds like him. His register is the register of the whole essay, and every section is written in it.

PROSE PHYSICS — how the sentences must move
Generic machine prose is recognisable inside a paragraph, and its tells are the same things that make writing dull. Write against every one of them, on every draft. Two bind hardest here. First, no dashes in the draft: this is absolute, Kyle will not publish them, and a draft with a dash in it is a draft you have to fix before you emit it. Second, show it, do not say it: never write a line whose only job is to tell the reader that the next idea matters ("and the difference matters more than almost anything else in this essay:"). Write the idea so its weight is felt, and cut the announcement. And land, don't summarize: the last line is a turn, somewhere the reader didn't see coming but now finds inevitable, never a restatement of what the essay already said.

${MACHINE_TELLS_BLOCK}

These rules govern the text inside the draft tags and your commentary alike; the dash ban covers every word you emit, even though these instructions themselves use dashes. They never override THE SPINE or the VOICE GUIDANCE below; when they conflict, Kyle's actual voice wins.

SCOPED REVISIONS
Sometimes Kyle quotes one passage back to you and tells you to work on that alone. When he does, emit one edit block for that passage (a second only if mending the seam requires touching the sentence on either side, and say so) and never a complete draft. The interface shows him a coloured diff of every turn and lets him keep or revert each change one at a time, so a scoped instruction that comes back as a whole-essay rewrite is unreviewable, and he will have to throw the turn away. If you genuinely believe the passage cannot be fixed without moving something else, say that in the commentary and make the scoped change anyway; let him decide about the rest.

SNAPSHOTS
When Kyle asks to save the current state, or when he asks you to develop the full draft, emit exactly one marker line before any draft or edit blocks: <snapshot stage="middle"/>, <snapshot stage="full"/>, or <snapshot stage="final"/>. The snapshot captures the working draft as it stands after this turn's draft or edits are applied, so saving the current state needs no draft text at all, only the marker. A middle draft still has [YOUR TURN: ...] gaps; a full draft is fully developed prose (gaps closed, though flagged lines and open tensions remain in the commentary) and is emitted as a complete <draft>. Do not emit any marker on ordinary revision turns.

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

const CABINET_TOOL: Anthropic.Tool = {
  name: 'search_cabinet',
  description:
    "Full-text search over Kyle's Cabinet chat history: months of dated conversation with his counselors in the Arete app, each hit returned with the line before and after it. Use it to find where he has already worked through the current idea in his own words, the lived scene behind a claim, or a commitment he made. Phrase the query as a few concrete words (the search matches any of them and ranks by overlap), not a sentence. His own lines are spine material and quotable; counselor replies are context only, never sources.",
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'A few concrete words for the thread being probed, e.g. "gutter house repair avoidance" or "ideas currency AI character"',
      },
      who: {
        type: 'string',
        enum: ['me', 'all'],
        description: "Whose lines to return: 'me' for Kyle's own words only (default), 'all' to include the counselors' replies for context",
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

// Book mode only: the other chapters, by meaning and by number.
const SEARCH_BOOK_TOOL: Anthropic.Tool = {
  name: 'search_book',
  description:
    "Semantic search over the whole book Kyle is writing: every chapter's working draft, in 400 word passages, each returned with its chapter number and title. Use it before saying what another chapter argues, when a claim here might be made or contradicted elsewhere, and when Kyle asks how this chapter sits with the rest. Scope 'other_chapters' (default) leaves out the chapter in front of you; 'all' includes it.",
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The claim, image or question to look for across the book, e.g. "character as the only durable advantage" or "the gutter he never fixed"',
      },
      scope: {
        type: 'string',
        enum: ['other_chapters', 'all'],
        description: "Which chapters to search: 'other_chapters' (default) or 'all'",
      },
    },
    required: ['query'],
  },
}

const READ_CHAPTER_TOOL: Anthropic.Tool = {
  name: 'read_chapter',
  description:
    "Read one chapter of the book by its position number in the outline. 'summary' (default) returns its summary and argument card; 'text' returns its working draft, capped at 3,000 words. Ask for the summary first; ask for the text only when the exact wording matters.",
  input_schema: {
    type: 'object',
    properties: {
      position: { type: 'integer', description: 'The chapter number as shown in the OUTLINE' },
      what: { type: 'string', enum: ['summary', 'text'], description: "'summary' (default) or 'text'" },
    },
    required: ['position'],
  },
}

// What a book mode turn brings to runScribeTurn: the brief block for the
// system prompt, and the two tools' handlers, bound to the book by the
// server half (book-store.ts).
export interface BookTurnContext {
  brief: string
  searchBook: (query: string, scope: 'other_chapters' | 'all') => Promise<string>
  readChapter: (position: number, what: 'summary' | 'text') => Promise<string>
}

export interface TurnOptions {
  book?: BookTurnContext | null
  maxTokens?: number
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

export async function searchCorpus(query: string, k = SEARCH_K): Promise<{ hits: RagHit[]; toolResult: string }> {
  const admin = createAdminClient()
  const embedding = await embedChunk(query)
  const { data, error } = await admin.rpc('match_rag_corpus_cited', {
    query_embedding: embedding,
    match_count: k,
  })
  if (error) throw new Error(`match_rag_corpus_cited: ${error.message}`)

  // Every Scribe corpus search is logged (retrieval_log), floor included, so
  // the paper summaries admitted for the research surfaces can be shown to
  // earn their place — or not.
  logRetrieval({
    requestId: newRequestId(),
    agent: 'scribe:chat',
    queryText: query,
    chunks: (data ?? []) as RagHit[],
  })

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

export function extractSnapshotStage(text: string): SnapshotIntent['stage'] | null {
  const m = text.match(/<snapshot stage="(middle|full|final)"\s*\/>/)
  return m ? (m[1] as SnapshotIntent['stage']) : null
}

// A snapshot captures the draft the turn resolved to: its complete <draft>,
// or, for an edits-only or marker-only turn, the working draft after the turn
// (passed as `resolved`). Nothing to capture means no snapshot.
export function extractSnapshotIntent(text: string, resolved?: string | null): SnapshotIntent | null {
  const stage = extractSnapshotStage(text)
  if (!stage) return null
  const draft = extractDraft(text) ?? resolved ?? null
  if (!draft) return null
  return { stage, draft_text: draft }
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
// An optional posture, off by default and set per entry. Scribe keeps doing
// everything it does except write the finished sentences: the architecture,
// the sources, the tensions, the questions, and then a gap where each
// paragraph goes. It exists because prose that arrives from a model is prose
// Kyle did not write, and this is the mode where the essay ends up in his own
// hand rather than in his own hand's retype of someone else's.
export const GAPS_APPENDIX = `

GAPS MODE IS ON FOR THIS ENTRY. Kyle is writing the prose himself; you are building everything around it.

You may write: the structure, the order of the argument, what each paragraph has to accomplish, the corpus passages with full provenance, the connections to his log and his Cabinet, the tensions, the weakest claim, the questions only he can answer.

You may NOT write: the finished sentences of the essay. Not one paragraph of developed prose, not an example of how a paragraph might go, not a "rough version to react to," not the opening line, not the closing line. Not even when he asks for it inside this mode. If he wants prose, he turns gaps mode off; say so in one line and carry on.

So the draft, in this mode, is a working document rather than an essay. Each paragraph is a gap of this shape:

[YOUR TURN: what this paragraph has to do, in one sentence. The specific thing to name. The claim it has to land.]

and under the gap, indented as a blockquote, goes the material for it: the retrieved passage with its provenance and its QUOTE or PARAPHRASE mode, the line from his log or his Cabinet that belongs here, the tension to hold open. Headings, section order, and structural notes are yours to write as normal prose; they are scaffolding, not the essay.

His own words are the exception that proves the rule: a sentence copied verbatim from his fragment, his log, or his Cabinet may stand in the draft as his, marked as a quotation of himself, because he wrote it.

Everything else in these instructions still governs: the spine, the corpus rules, the machine tells, the pushback. You are still the editor with a spine. You are simply not the writer.`

function buildSystem(voice: VoiceProfile | null, gapsMode = false, bookMode = false): string {
  if (!voice && !gapsMode && !bookMode) return SYSTEM_PROMPT
  let s = SYSTEM_PROMPT
  if (gapsMode) s += GAPS_APPENDIX
  if (bookMode) s += BOOK_APPENDIX
  if (!voice) return s
  // Exemplars are capped at the voice budget, newest first, so a style
  // profile with long posts cannot crowd out the draft.
  const exemplars = fitExemplars(voice.exemplars ?? [])
    .map((e, i) => `--- exemplar ${i + 1}: ${e.title} ---\n${e.text}`)
    .join('\n\n')
  if (exemplars) {
    s += `\n\nHOW KYLE WRITES — these are his own paragraphs. Match this cadence, sentence-length variation, diction, and how he opens and closes; this is the voice the finished essay must sound like. Learn the voice, do NOT reuse their content:\n\n${exemplars}`
  }
  if (voice.guidance?.trim()) s += `\n\nVOICE GUIDANCE: ${voice.guidance.trim()}`
  return s
}

// The working draft rides at the end of Kyle's latest message, so the text
// Scribe copies its <find> passages from is exactly the text the server will
// apply them to. It is added at call time only, never persisted, so history
// carries each turn's edits rather than a copy of the essay per turn.
export function withWorkingDraft(content: string, workingDraft: string | null): string {
  if (!workingDraft || content.includes('<working_draft>')) return content
  return `${content}\n\n<working_draft>\n${workingDraft}\n</working_draft>`
}

// `cabinetUserId` is whose Cabinet history the search_cabinet tool reads
// (Kyle's, from the admin session). Null withholds the tool. `workingDraft`
// is the draft as it stands before this turn, or null before one exists.
export async function runScribeTurn(
  history: { role: 'user' | 'scribe'; content: string }[],
  events: TurnEvents,
  voice: VoiceProfile | null = null,
  cabinetUserId: string | null = null,
  workingDraft: string | null = null,
  gapsMode = false,
  opts: TurnOptions = {}
): Promise<{ text: string; sources: TurnSource[] }> {
  const messages: Anthropic.MessageParam[] = history.map((m, i) => ({
    role: m.role === 'scribe' ? 'assistant' : 'user',
    content:
      i === history.length - 1 && m.role === 'user' ? withWorkingDraft(m.content, workingDraft) : m.content,
  }))

  const book = opts.book ?? null
  // The system prompt is stable across a session and the book brief across
  // turns until a summary changes, so each is its own cache breakpoint. The
  // history and the working draft follow and are what varies.
  const system: Anthropic.TextBlockParam[] = [
    { type: 'text', text: buildSystem(voice, gapsMode, !!book), cache_control: { type: 'ephemeral' } },
  ]
  if (book) system.push({ type: 'text', text: book.brief, cache_control: { type: 'ephemeral' } })
  const tools: Anthropic.Tool[] = [SEARCH_TOOL, JOURNAL_TOOL]
  if (cabinetUserId) tools.push(CABINET_TOOL)
  if (book) tools.push(SEARCH_BOOK_TOOL, READ_CHAPTER_TOOL)
  const maxTokens = opts.maxTokens ?? MAX_TOKENS
  const turnSources: TurnSource[] = []
  const seenChunks = new Set<string>()
  let fullText = ''

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const lastRound = round === MAX_TOOL_ROUNDS
    const stream = getClient().messages.stream({
      model: CHAT_MODEL,
      max_tokens: maxTokens,
      output_config: { effort: CHAT_EFFORT },
      system,
      messages,
      // On the final permitted round withhold the tools so the model must
      // finish the turn with what it has retrieved.
      ...(lastRound ? {} : { tools }),
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
      events.onSearching(
        tu.name === 'read_chapter' ? `chapter ${String((tu.input as { position?: unknown }).position ?? '?')}` : query
      )
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
        } else if (tu.name === 'search_cabinet') {
          if (!cabinetUserId) {
            content = 'Cabinet history is not available in this session. Continue without it.'
          } else {
            const who: CabinetWho = (tu.input as { who?: string }).who === 'all' ? 'all' : 'me'
            const hits = await searchCabinetHistory(createAdminClient(), cabinetUserId, {
              query: cabinetSearchQuery(query),
              limit: 8,
              who,
            })
            content = hits.length
              ? `${cabinetCaveat('Kyle')}\n\n${formatCabinetHits(hits, 'Kyle')}`
              : "Nothing in Kyle's Cabinet history matched this query. If he asked for connections here, tell him the Cabinet doesn't connect on this thread yet."
            for (const h of hits) {
              const id = `cabinet:${h.thread}:${h.sent_at}:${h.role}`
              if (seenChunks.has(id)) continue
              seenChunks.add(id)
              turnSources.push({
                chunk_id: id,
                author: h.role === 'user' ? 'Kyle' : h.speaker,
                work: `Cabinet — ${cabinetThreadLabel(h.thread)}`,
                section_label: cabinetDate(h),
                translator: null,
                text_type: 'cabinet',
                // His words are quotable; a counselor's are context only.
                mode: h.role === 'user' ? 'quote' : 'paraphrase',
                similarity: h.rank,
                query,
              })
            }
          }
        } else if (tu.name === 'search_book') {
          const scope = (tu.input as { scope?: string }).scope === 'all' ? 'all' : 'other_chapters'
          content = book
            ? await book.searchBook(query, scope)
            : 'This conversation is not part of a book, so there is nothing else to search.'
        } else if (tu.name === 'read_chapter') {
          const input = tu.input as { position?: unknown; what?: string }
          const position = Number(input.position)
          content = book && Number.isFinite(position)
            ? await book.readChapter(position, input.what === 'text' ? 'text' : 'summary')
            : 'This conversation is not part of a book, so there is no chapter to read.'
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
