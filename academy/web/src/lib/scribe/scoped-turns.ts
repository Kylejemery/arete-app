// Directives built from a passage Kyle highlighted in the draft, instead of
// from a description he has to type. The wording matters: Scribe rewrites the
// whole draft every turn, so a scoped instruction has to say plainly that
// everything outside the quoted passage is to come back verbatim. Otherwise
// the change review fills with churn and there is nothing to review.

export type ScopedAction = 'revise' | 'cut' | 'ground' | 'voice' | 'explain'

export const SCOPED_LABELS: Record<ScopedAction, string> = {
  revise: 'Revise this',
  cut: 'Cut this',
  ground: 'Ground in corpus',
  voice: 'In my voice',
  explain: 'Why is this here?',
}

// Long selections get trimmed from the middle: the head and tail are what
// Scribe needs to locate the passage, and a whole section pasted back into the
// prompt just burns context.
const MAX_SELECTION = 1500

function trimSelection(sel: string): string {
  const s = sel.trim()
  if (s.length <= MAX_SELECTION) return s
  const half = Math.floor(MAX_SELECTION / 2)
  return `${s.slice(0, half)}\n\n[…]\n\n${s.slice(-half)}`
}

const INSTRUCTION: Record<ScopedAction, string> = {
  revise:
    'Revise that passage. Everything else in the draft comes back exactly as it stands.',
  cut:
    'Cut that passage entirely and mend the seam so the paragraphs on either side still read. Change nothing else.',
  ground:
    'Search the corpus for what actually supports that passage, and place what you find at that exact point with full provenance. If the corpus does not support it, say so plainly and leave the passage as it is rather than reaching for a near miss. Change nothing else in the draft.',
  voice:
    'That passage reads like you, not like me. Rewrite it in my voice, using my own language from the fragment and from my log where you can find it, and cut whatever is there only because it sounded good. Change nothing else in the draft.',
  explain:
    'Do not change the draft at all. Return it exactly as it stands, and in your commentary tell me what that passage is doing in the essay, why you wrote it that way, and what would be lost if I cut it.',
}

export function scopedPrompt(action: ScopedAction, selection: string, note?: string): string {
  const extra = note?.trim() ? `\n\nWhat I want changed: ${note.trim()}` : ''
  return (
    `Work on one passage only. Here it is, copied verbatim from the working draft:\n\n` +
    `"""\n${trimSelection(selection)}\n"""\n\n` +
    `${INSTRUCTION[action]}${extra}`
  )
}

// A scoped turn quotes a whole passage back at Scribe, which is right for the
// model and wrong for the transcript: the thread would fill with duplicated
// draft text. The chat renders this condensed form instead. Returns null for
// an ordinary typed message, which is shown verbatim.
export function describeScopedTurn(content: string): string | null {
  const scoped = content.match(/^Work on one passage only\.[\s\S]*?"""\n([\s\S]*?)\n"""\n\n([\s\S]*)$/)
  const finding = content.match(/^The outside reader flagged this passage[\s\S]*?"""\n([\s\S]*?)\n"""\n\n([\s\S]*)$/)
  const m = scoped ?? finding
  if (!m) return null
  const passage = m[1].replace(/\s+/g, ' ').trim()
  const short = passage.length > 110 ? `${passage.slice(0, 110)}…` : passage
  const instruction = m[2].split('\n').filter(Boolean)[0]?.trim() ?? ''
  const lead = finding ? 'On the reader’s flag' : 'On this passage'
  return `${lead}: “${short}”\n\n${instruction}`
}

// The fix-it action on an outside-read finding: same scoping, but the passage
// comes from the reviewer's quote and the reason comes with it.
export function findingPrompt(line: string, why: string): string {
  return (
    `The outside reader flagged this passage in the draft:\n\n` +
    `"""\n${trimSelection(line)}\n"""\n\n` +
    `Their reason: ${why || 'no reason given'}\n\n` +
    `Fix that passage. If you think the reader is wrong, say so in the commentary and leave it. ` +
    `Either way, everything else in the draft comes back exactly as it stands.`
  )
}
