// The cold outside read. Fires exactly once, at the `final` handoff stage —
// not another voice in the ongoing conversation, the thing that ENDS it. A
// single pass over the finished draft is finite by construction, where the
// in-thread editor's pushback never is (it can always find one more tension).
//
// Deliberately a DIFFERENT model family from the Opus that wrote the draft.
// Scribe's stated enemy is "generic AI-Stoicism," and Opus's own smoothness is
// the flavor of it most invisible to Opus — a self-review shares the aesthetic
// it's supposed to catch. A GPT reading the draft cold, with none of the
// conversation's history or rationalizations, has an independent nose for
// "this reads like an AI wrote it, not a person who lived it."
//
// Uses the same env access as embedChunk (process.env.OPENAI_API_KEY, direct
// fetch), so it runs wherever corpus search already runs — no new dependency,
// no SDK. The reviewer must never break finalization: any failure degrades to
// an empty findings set with `error` populated, and the handoff proceeds.

const DEFAULT_REVIEW_MODEL = 'gpt-4o'

// The three categories are not arbitrary — each is a failure mode Scribe's own
// system prompt names (VOICE GUARD; "the weakest claim"; "the philosophy never
// narrates over his story"), handed to an outsider who can't launder them.
const REVIEWER_BRIEF = `You are a sharp, honest reader. You have never met the author and you did not see how this essay was written — you only have the finished draft. The author is a Stoic practitioner developing a personal essay from his own journal; his lived experience is meant to be the spine, and the philosophy is meant to enrich that story, never narrate over it.

Read the draft once, as a stranger would. Then report ONLY what you are genuinely sure of, as JSON with exactly these keys:

{
  "not_kyle": [ { "line": "<the exact phrase or sentence>", "why": "<why it reads like generic AI prose rather than a specific person who lived this>" } ],
  "unearned": [ { "line": "<the claim>", "why": "<why it is asserted as universal or settled when the essay hasn't earned it>" } ],
  "narrated_over": [ { "line": "<the passage>", "why": "<where the philosophy talks over the author's own story instead of enriching it>" } ],
  "tells": [ { "line": "<the exact phrase or sentence>", "why": "<the mechanical AI-writing tell: uniform sentence rhythm, rule-of-three / parallelism overuse, signposting (firstly/in conclusion), hedging, thesaurus diction (delve, tapestry, underscore), or cliché phrasing>" } ]
}

Rules:
- Quote the author's actual text in each "line" so it can be found in the draft.
- Only flag what you are sure of. Empty arrays are the correct, honest answer when a category has nothing. Do not pad.
- You are not rewriting and not praising. No prose outside the JSON. No preamble.`

export interface ReviewFinding {
  line: string
  why: string
}

export interface ReviewFindings {
  model: string
  not_kyle: ReviewFinding[]
  unearned: ReviewFinding[]
  narrated_over: ReviewFinding[]
  tells: ReviewFinding[]
  // Set only when the pass could not complete; arrays are empty in that case.
  error?: string
}

function empty(model: string, error: string): ReviewFindings {
  return { model, not_kyle: [], unearned: [], narrated_over: [], tells: [], error }
}

function asFindings(raw: unknown): ReviewFinding[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map(f => ({ line: String(f.line ?? '').trim(), why: String(f.why ?? '').trim() }))
    .filter(f => f.line || f.why)
}

// One cold pass over the final draft. Never throws — a broken reviewer must not
// block the handoff; it degrades to an empty set with `error` populated.
export async function reviewDraft(draft: string): Promise<ReviewFindings> {
  const model = process.env.SCRIBE_REVIEW_MODEL || DEFAULT_REVIEW_MODEL
  const key = process.env.OPENAI_API_KEY
  if (!key) return empty(model, 'OPENAI_API_KEY not configured — outside read skipped.')
  if (!draft.trim()) return empty(model, 'No draft text to review.')

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: REVIEWER_BRIEF },
          { role: 'user', content: `Here is the finished draft:\n\n${draft}` },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return empty(model, `Reviewer API ${res.status}: ${body.slice(0, 200)}`)
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') return empty(model, 'Reviewer returned no content.')

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content)
    } catch {
      return empty(model, 'Reviewer returned unparseable JSON.')
    }
    return {
      model,
      not_kyle: asFindings(parsed.not_kyle),
      unearned: asFindings(parsed.unearned),
      narrated_over: asFindings(parsed.narrated_over),
      tells: asFindings(parsed.tells),
    }
  } catch (e) {
    return empty(model, e instanceof Error ? e.message : 'Reviewer call failed.')
  }
}

// True when the pass produced at least one usable finding.
export function hasFindings(r: ReviewFindings | null | undefined): boolean {
  return !!r && (r.not_kyle.length > 0 || r.unearned.length > 0 || r.narrated_over.length > 0 || r.tells.length > 0)
}
