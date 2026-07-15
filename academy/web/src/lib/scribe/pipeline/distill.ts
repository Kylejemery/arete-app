import { runStage, extractJson, type StageUsage } from '../anthropic'
import type { ScribeBrief, ScribeNote } from '../types'

// Stage A — Distill. All project notes in, a structured editable brief out:
// central thesis, key claims, audience, and what the notes DON'T yet support.
// The user confirms or edits the brief before drafting (skippable).

const SYSTEM = `You are the distillation stage of Scribe, a writing agent for a Stoic philosophy author. You receive the author's raw notes — scattered thoughts, fragments, full paragraphs — and produce a working brief.

Rules:
- The thesis must be the author's, found in the notes — never invent a position the notes don't take.
- key_claims: the distinct substantive claims the piece will need to make or defend, each stated in one sentence. 3–8 claims.
- gaps: claims or moves the notes gesture at but do not yet support with argument or evidence — candid, specific.
- audience: infer from the notes' register; default to "serious readers past beginner Stoicism".

Return ONLY a JSON object: { "thesis": string, "key_claims": string[], "audience": string, "gaps": string[] }`

export async function distill(
  notes: ScribeNote[]
): Promise<{ brief: ScribeBrief; usage: StageUsage }> {
  const notesBlock = notes
    .map((n, i) => `--- note ${i + 1} ---\n${n.content}`)
    .join('\n\n')

  const { text, usage } = await runStage(
    'distill',
    SYSTEM,
    `Here are the project notes, in the author's order:\n\n${notesBlock}`
  )

  const brief = extractJson<ScribeBrief>(text)
  if (!brief.thesis || !Array.isArray(brief.key_claims)) {
    throw new Error('Distill stage returned an incomplete brief')
  }
  return {
    brief: {
      thesis: brief.thesis,
      key_claims: brief.key_claims,
      audience: brief.audience || 'serious readers past beginner Stoicism',
      gaps: Array.isArray(brief.gaps) ? brief.gaps : [],
    },
    usage,
  }
}
