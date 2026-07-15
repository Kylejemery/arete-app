import type { ScribeFormat } from './types'

// Format profiles — the per-format system-prompt fragment plus packaging
// rules. Kept in code (editable later via scribe_style_profiles.guidance).
// v1 ships Substack; the other three land in build step 5.

export interface FormatProfile {
  format: ScribeFormat
  label: string
  systemFragment: string
  wantsMeta: boolean // subject line / preview text block
}

export const FORMAT_PROFILES: Partial<Record<ScribeFormat, FormatProfile>> = {
  substack: {
    format: 'substack',
    label: 'Substack post',
    wantsMeta: true,
    systemFragment: `FORMAT: Substack post.
- Length: match the exemplars when provided; otherwise 900–1600 words.
- Open with a hook — a concrete scene, a sharp question, or a claim that earns the scroll. Never open with throat-clearing ("In this post I will…").
- Voice: the author's own, learned from the exemplars. First person where the notes are first person. No academic hedging, no listicle scaffolding.
- Citations are light-touch: inline attribution in the prose ("Marcus writes in the Meditations that…", "as Hadot argues"), not footnote apparatus. Where a modern source has a URL you may use a markdown link on the attribution.
- Quotes: short, load-bearing, exact. One or two strong quotes beat five decorative ones.
- Close with weight — a turn, an instruction, or the thesis landing — not a summary.
- End-of-piece "Sources" footer: a short unordered list, one line per cited source, only sources actually cited.`,
  },
}

export function getProfile(format: ScribeFormat): FormatProfile {
  const p = FORMAT_PROFILES[format]
  if (!p) {
    throw new Error(
      `Format "${format}" is not available yet — v1 ships Substack first; article, paper, and social arrive in build step 5.`
    )
  }
  return p
}
