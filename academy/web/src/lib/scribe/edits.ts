// In-place edits to the Scribe working draft. A turn used to re-emit the whole
// essay every time; now it can send edit blocks, each a passage copied from the
// current working draft and the text that replaces it, and the server applies
// them mechanically. Pure module: no React, no DOM, safe to test and to run in
// the turn route.
//
// Matching is exact first, then tolerant of the things a model retypes
// differently from the source (runs of whitespace, curly versus straight
// quotes, dashes), mapped back to the draft's own characters so the replaced
// span is always real draft text. A find that still fails is reported, never
// guessed.

export interface DraftEdit {
  find: string
  replace: string
}

export interface EditFailure {
  find: string
  reason: 'empty find' | 'not found'
}

export interface AppliedEdits {
  draft: string
  applied: number
  failed: EditFailure[]
}

export type ResolvedDraft =
  | { mode: 'full'; draft: string; applied: 0; failed: [] }
  | ({ mode: 'edits' } & AppliedEdits)
  | { mode: 'none'; draft: null; applied: 0; failed: [] }

const EDIT_RE = /<edit>\s*<find>([\s\S]*?)<\/find>\s*<replace>([\s\S]*?)<\/replace>\s*<\/edit>/g

// Strip only the newlines the tag layout adds; inner spacing is the passage's.
function unwrap(s: string): string {
  return s.replace(/^\r?\n+/, '').replace(/\r?\n+$/, '')
}

export function parseEdits(text: string): DraftEdit[] {
  const out: DraftEdit[] = []
  for (const m of text.matchAll(EDIT_RE)) {
    out.push({ find: unwrap(m[1]), replace: unwrap(m[2]) })
  }
  return out
}

// How many edit blocks have been opened so far, for a streaming indicator.
export function countEditBlocks(text: string): number {
  return (text.match(/<edit>/g) ?? []).length
}

// Strip edit blocks (and an unfinished trailing one, mid-stream) from a turn's
// text so the conversation shows commentary only.
export function stripEdits(text: string): string {
  return text.replace(EDIT_RE, '').replace(/<edit>[\s\S]*$/, '')
}

// Fold whitespace, quotes, and dashes; `idx` maps each folded character back
// to its offset in the original.
function fold(text: string): { out: string; idx: number[] } {
  let out = ''
  const idx: number[] = []
  let lastWasSpace = false
  for (let i = 0; i < text.length; i++) {
    let c = text[i]
    if (/\s/.test(c)) {
      if (lastWasSpace) continue
      c = ' '
      lastWasSpace = true
    } else {
      lastWasSpace = false
      if (c === '‘' || c === '’') c = "'"
      else if (c === '“' || c === '”') c = '"'
      else if (c === '—' || c === '–') c = '-'
    }
    out += c
    idx.push(i)
  }
  return { out, idx }
}

// The span of `needle` in `text`: exact, else folded. First occurrence wins,
// which is why the prompt asks for finds long enough to be unique.
export function locateEdit(text: string, needle: string): { start: number; end: number } | null {
  if (!needle) return null
  const exact = text.indexOf(needle)
  if (exact >= 0) return { start: exact, end: exact + needle.length }
  const hay = fold(text)
  const n = fold(needle).out.trim()
  if (!n) return null
  const at = hay.out.indexOf(n)
  if (at < 0) return null
  return { start: hay.idx[at], end: hay.idx[at + n.length - 1] + 1 }
}

export function applyEdits(draft: string, edits: DraftEdit[]): AppliedEdits {
  let text = draft
  let applied = 0
  const failed: EditFailure[] = []
  for (const e of edits) {
    if (!e.find.trim()) {
      failed.push({ find: e.find, reason: 'empty find' })
      continue
    }
    const span = locateEdit(text, e.find)
    if (!span) {
      failed.push({ find: e.find, reason: 'not found' })
      continue
    }
    if (e.replace.trim()) {
      text = text.slice(0, span.start) + e.replace + text.slice(span.end)
    } else {
      // A cut: close the gap it leaves so paragraphs do not drift apart and
      // sentences do not end up with two spaces between them.
      let before = text.slice(0, span.start)
      let after = text.slice(span.end)
      if (/[ \t]$/.test(before) && /^\s/.test(after)) {
        if (after.startsWith('\n')) before = before.replace(/[ \t]+$/, '')
        else after = after.replace(/^[ \t]+/, '')
      }
      text = (before + after).replace(/\n{3,}/g, '\n\n')
    }
    applied++
  }
  return { draft: text, applied, failed }
}

export function extractFullDraft(text: string): string | null {
  const m = text.match(/<draft>([\s\S]*?)<\/draft>/)
  return m ? m[1].trim() : null
}

// The working draft after a turn: a complete <draft> wins; otherwise the edit
// blocks are applied to the draft the turn started from; otherwise nothing
// changed. `working` is null before the first draft exists, in which case
// edits have nothing to land on and are all reported as failed.
export function resolveTurnDraft(text: string, working: string | null): ResolvedDraft {
  const full = extractFullDraft(text)
  if (full !== null) return { mode: 'full', draft: full, applied: 0, failed: [] }
  const edits = parseEdits(text)
  if (!edits.length) return { mode: 'none', draft: null, applied: 0, failed: [] }
  if (working === null) {
    return {
      mode: 'edits',
      draft: '',
      applied: 0,
      failed: edits.map(e => ({ find: e.find, reason: 'not found' as const })),
    }
  }
  return { mode: 'edits', ...applyEdits(working, edits) }
}

// The note appended to a stored turn when edits failed to land, so Kyle sees
// it in the conversation and Scribe sees it in history next turn.
export function describeFailures(failed: EditFailure[]): string {
  if (!failed.length) return ''
  const lines = failed.map(f => {
    const short = f.find.replace(/\s+/g, ' ').trim()
    const shown = short.length > 120 ? `${short.slice(0, 120)}…` : short
    return `  • ${f.reason === 'empty find' ? 'an edit with no passage to find' : `"${shown}"`}`
  })
  return (
    `\n\n[${failed.length === 1 ? 'One edit' : `${failed.length} edits`} could not be placed because the passage to find did not match the working draft; the draft is unchanged there:\n${lines.join('\n')}]`
  )
}
