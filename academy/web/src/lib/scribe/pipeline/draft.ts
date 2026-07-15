import { runStage, extractJson, type StageUsage } from '../anthropic'
import { getProfile } from '../formats'
import type { ClaimBundle, BundleChunk } from './retrieve'
import type {
  ScribeBrief,
  ScribeCitation,
  ScribeFormat,
  ScribeNote,
  ScribeStyleProfile,
} from '../types'

// Stage C — Draft. One call, given: the brief, the notes verbatim, the
// retrieval bundles, style exemplars, and the citation rules. The model cites
// chunk HANDLES (R1/S3…) from the bundles — never ids — and returns a
// machine-readable citation map after a sentinel line. Handles are resolved
// to real chunk ids here; an unknown handle is dropped and recorded, so a
// fabricated citation cannot survive into the stored draft.

const CITATIONS_SENTINEL = '===CITATIONS==='
const META_SENTINEL = '===META==='

const BASE_SYSTEM = `You are Scribe, the writing agent of Arete — you turn the author's rough notes into publication-ready drafts grounded in real sources.

THE ONE UNFORGIVABLE FAILURE: a citation that does not trace to a provided source chunk. You cite ONLY the chunks provided in the retrieval bundles, by their handle (R1, R2… for the Stoic corpus; S1, S2… for modern sources). If you are tempted to cite anything not in the bundles — don't. A claim the bundles don't support is written in the author's own voice, plainly, with no citation and no invented attribution.

QUOTES: any text you present as a quotation must be copied EXACTLY from a bundle chunk — verbatim, character for character (you may shorten with ellipses, but never alter words). Every quote is machine-checked against its chunk; a mismatch fails the draft.

THE AUTHOR'S MATERIAL: the notes are the best material you have. Reuse the author's own phrasing wherever it is strong — your job is completion and grounding, not replacement.

CANONICAL STYLE: name classical authors and works in scholarly form in the prose (Epictetus' Discourses, Marcus Aurelius' Meditations, Seneca's Letters). If you state a canonical passage number, put it in the citation map's "locator" field — passage numbers are rendered but flagged as unverified, so include them only when you are confident.

OUTPUT PROTOCOL — follow exactly:
1. The complete draft in markdown.
2. A line containing only: ${CITATIONS_SENTINEL}
3. A JSON array of every citation in the draft:
   [{ "marker": "<the exact attribution text or quote opening as it appears in the draft, enough to locate it>",
      "handle": "R1" | "S2" | …,
      "locator": "<canonical passage like 'Meditations 4.3' or page like 'p. 12', or null>",
      "quote": true|false,  — true when the draft quotes this chunk verbatim
      "quote_text": "<when quote is true: the COMPLETE quoted text exactly as it appears in the draft, without the surrounding quotation marks; omit otherwise>" }]
4. If a META block is requested: a line containing only ${META_SENTINEL} followed by
   { "subject_lines": [3 options], "preview_text": "<one sentence>" }`

function bundleBlock(bundles: ClaimBundle[]): string {
  const parts: string[] = []
  for (const b of bundles) {
    if (!b.supported) {
      parts.push(`CLAIM: ${b.claim}\n  UNSUPPORTED — no adequate source found. Write this in the author's own voice, no citation.`)
      continue
    }
    const chunkLines = b.chunks.map(c => {
      const src =
        c.chunk_table === 'rag_corpus'
          ? `${c.author}, ${c.work}${c.section_label ? ` (${c.section_label})` : ''}${c.translator ? ` [tr. ${c.translator}]` : ''}`
          : `[${c.citation_key}] ${c.source_title}${c.page_hint ? `, p. ${c.page_hint}` : ''}`
      return `  [${c.handle}] ${src}\n  ${c.content}`
    })
    parts.push(`CLAIM: ${b.claim}\n${chunkLines.join('\n\n')}`)
  }
  return parts.join('\n\n────────\n\n')
}

export interface DraftResult {
  content: string
  citations: ScribeCitation[]
  droppedHandles: string[]
  meta: { subject_lines?: string[]; preview_text?: string } | null
  usage: StageUsage
}

export async function draft(
  format: ScribeFormat,
  brief: ScribeBrief,
  notes: ScribeNote[],
  bundles: ClaimBundle[],
  style: ScribeStyleProfile | null
): Promise<DraftResult> {
  const profile = getProfile(format)

  let system = `${BASE_SYSTEM}\n\n${profile.systemFragment}`
  if (style) {
    const exemplars = (style.exemplar_refs ?? [])
      .map((e, i) => `--- exemplar ${i + 1}: ${e.title} ---\n${e.text}`)
      .join('\n\n')
    if (exemplars) {
      system += `\n\nSTYLE EXEMPLARS — learn the author's voice from these (rhythm, diction, paragraph length, how they open and close). Do not copy their content:\n\n${exemplars}`
    }
    if (style.guidance) system += `\n\nSTYLE GUIDANCE: ${style.guidance}`
  }

  const notesBlock = notes.map((n, i) => `--- note ${i + 1} ---\n${n.content}`).join('\n\n')

  const user = `THE BRIEF (author-approved):
Thesis: ${brief.thesis}
Audience: ${brief.audience}
Key claims:
${brief.key_claims.map((c, i) => `${i + 1}. ${c}`).join('\n')}
Known gaps (write these in the author's voice, no citations): ${brief.gaps.join('; ') || 'none'}

THE AUTHOR'S NOTES (verbatim — reuse strong phrasing):
${notesBlock}

RETRIEVAL BUNDLES (the ONLY citable material):
${bundleBlock(bundles)}

${profile.wantsMeta ? 'Include the META block.' : 'Do not include a META block.'}

Write the draft now.`

  const { text, usage } = await runStage('draft', system, user)

  // Split the protocol sections.
  const citIdx = text.indexOf(CITATIONS_SENTINEL)
  const metaIdx = text.indexOf(META_SENTINEL)
  const content = (citIdx === -1 ? text : text.slice(0, citIdx)).trim()

  let rawCitations: { marker: string; handle: string; locator: string | null; quote: boolean; quote_text?: string }[] = []
  if (citIdx !== -1) {
    const citText = text.slice(citIdx + CITATIONS_SENTINEL.length, metaIdx === -1 ? undefined : metaIdx)
    try {
      rawCitations = extractJson(citText)
    } catch {
      rawCitations = []
    }
  }

  let meta: DraftResult['meta'] = null
  if (metaIdx !== -1) {
    try {
      meta = extractJson(text.slice(metaIdx + META_SENTINEL.length))
    } catch {
      meta = null
    }
  }

  // Resolve handles → real chunk ids. Unknown handles are dropped and
  // reported — the invariant "no citation without a chunk" is enforced here.
  const handleMap = new Map<string, BundleChunk>()
  for (const b of bundles) for (const c of b.chunks) handleMap.set(c.handle, c)

  const citations: ScribeCitation[] = []
  const droppedHandles: string[] = []
  for (const rc of rawCitations) {
    const chunk = handleMap.get(rc.handle)
    if (!chunk) {
      droppedHandles.push(rc.handle)
      continue
    }
    citations.push({
      marker: rc.marker,
      chunk_table: chunk.chunk_table,
      chunk_id: chunk.chunk_id,
      locator: rc.locator ?? null,
      quote: !!rc.quote,
      ...(rc.quote_text ? { quote_text: rc.quote_text } : {}),
    })
  }

  return { content, citations, droppedHandles, meta, usage }
}
