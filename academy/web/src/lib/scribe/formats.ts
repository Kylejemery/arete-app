import type { ScribeFormat } from './types'

// Format profiles — the per-format system-prompt fragment plus packaging
// rules. Kept in code (editable later via scribe_style_profiles.guidance).

export interface FormatProfile {
  format: ScribeFormat
  label: string
  systemFragment: string
  wantsMeta: boolean // subject line / preview text / pull quotes block
  wantsPosts: boolean // machine-readable social posts block
  appendReferences: boolean // Stage E appends a generated reference list
}

export const FORMAT_PROFILES: Record<ScribeFormat, FormatProfile> = {
  substack: {
    format: 'substack',
    label: 'Substack post',
    wantsMeta: true,
    wantsPosts: false,
    appendReferences: false, // the model writes its own light Sources footer
    systemFragment: `FORMAT: Substack post.
- Length: match the exemplars when provided; otherwise 900–1600 words.
- Open with a hook — a concrete scene, a sharp question, or a claim that earns the scroll. Never open with throat-clearing ("In this post I will…").
- Voice: the author's own, learned from the exemplars. First person where the notes are first person. No academic hedging, no listicle scaffolding.
- Citations are light-touch: inline attribution in the prose ("Marcus writes in the Meditations that…", "as Hadot argues"), not footnote apparatus. Where a modern source has a URL you may use a markdown link on the attribution.
- Quotes: short, load-bearing, exact. One or two strong quotes beat five decorative ones.
- Close with weight — a turn, an instruction, or the thesis landing — not a summary.
- End-of-piece "Sources" footer: a short unordered list, one line per cited source, only sources actually cited.
- META block: 3 subject-line options + one-sentence preview_text.`,
  },

  article: {
    format: 'article',
    label: 'Article',
    wantsMeta: true,
    wantsPosts: false,
    appendReferences: true,
    systemFragment: `FORMAT: long-form article (for the Academy site / web).
- Length: 1200–2500 words.
- Structure: a titled piece with ## section headings — each section advances the argument; no filler sections.
- Citations: footnote style. In the prose, place a footnote marker [^n] after the supported claim or quote; classical attributions may ALSO be named inline (e.g., "Epictetus argues[^3]"). Number footnotes sequentially. Do NOT write the footnote definitions yourself — the reference list is generated from your citation map, so the citation map must be complete and in footnote order.
- Quotes: exact; block-quote (>) any quotation longer than one sentence.
- Register: essayistic but rigorous — an educated general reader who wants the real argument.
- META block: 2–4 pull_quotes (verbatim sentences from YOUR draft that would work as pull quotes) + 3 title options in subject_lines + one-sentence preview_text.`,
  },

  paper: {
    format: 'paper',
    label: 'Research paper',
    wantsMeta: false,
    wantsPosts: false,
    appendReferences: true,
    systemFragment: `FORMAT: research-style paper.
- Structure, in order: # Title · **Abstract** (120–200 words) · ## 1. Introduction (ending with an explicit statement of the argument: "I argue that…") · numbered argument sections · a section that states and answers the strongest counterarguments · ## Conclusion.
- Register: formal academic prose. No first-person anecdote; first-person argumentative voice ("I argue", "I show") is correct.
- Citations: author-date in parentheses for modern works — (Hadot 1995) — and canonical citations for classical texts — (Epictetus, Discourses 2.10). Every parenthetical citation must appear in the citation map with its handle.
- This is research-paper STYLE: do not invent empirical results, studies, or data. Empirical claims only where an ingested modern source (S-handles) states them.
- Quotes: exact; use sparingly and only where the original wording carries argumentative weight.
- Do not write the reference list — it is generated from your citation map.`,
  },

  social: {
    format: 'social',
    label: 'Social posts',
    wantsMeta: false,
    wantsPosts: true,
    appendReferences: false,
    systemFragment: `FORMAT: social post variants for three platforms, drawn from the same brief.
- X: a thread of 3–6 posts. Each post ≤ 270 characters (hard limit). First post is the hook and must stand alone. Number posts "1/", "2/" etc. No hashtags.
- LinkedIn: one post, 400–1300 characters. Hook first line, short paragraphs, invite reflection at the end. No hashtags.
- Bluesky: one post ≤ 290 characters. Intellectual-community tone, philosophical and direct. No hashtags.
- Attribution: any post leaning on a source ends with a brief attribution ("— Epictetus, Discourses" / "per Hadot"). Attributed claims still need citation-map entries.
- The markdown body: present each platform under a ## heading (## X thread, ## LinkedIn, ## Bluesky) for human review.
- POSTS block (required): machine-readable variants for the scheduler. X thread = one entry per post, in order.`,
  },
}

export function getProfile(format: ScribeFormat): FormatProfile {
  return FORMAT_PROFILES[format]
}
