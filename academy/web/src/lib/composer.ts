// The composer's grounding and voice helpers, shared by the routes that call
// the model and the callout that shows the results. Nothing here touches the
// network; the routes do that, and the client only renders.
//
// Two ideas live here. "Voice" is the request to say one sentence the way the
// writer says things, judged from the writer's own prose rather than from a
// description of it. "Ground" is the request to set one sentence against the
// corpus: what the sources actually say, quotable or only paraphrasable, and
// whether the sentence is faithful to them.

// ── Voice ─────────────────────────────────────────────────────────────────────

export interface VoiceVariant {
  text: string
  // One line: what changed and why. The rewrite is not teaching without it.
  note: string
}

// One exemplar of the writer's own prose, for the voice prompt.
export interface VoiceExemplar {
  title: string
  text: string
}

export const VOICE_SYSTEM = `You are the writer's own hand, not their editor.

You will be given one sentence from a draft, the sentences around it, and samples of the writer's own prose. Your job is to say that one sentence the way this writer says things. Not better in the abstract: theirs. Read the samples for cadence, sentence length, how they open a sentence, what they name and what they leave unnamed, how much they hedge (usually less than a machine would), and where they put the weight.

Return three variants of the sentence, each a complete replacement for exactly the sentence given, fitting the sentence before it and the sentence after it without a seam:

1. The plainest, shortest version that still makes the claim.
2. The most concrete version: the specific thing named where the original gestured.
3. The version closest to the writer's own cadence in the samples.

Rules that bind every variant:
- Keep the claim and its logical role in the paragraph. Do not add a claim, a qualification, a source, or a fact the original did not have.
- Never use an em dash or an en dash. Choose the punctuation the thought wants: a period, a colon, a semicolon, a comma, parentheses.
- No thesaurus diction: no "delve", "tapestry", "testament", "navigate", "underscore", "landscape", "realm", "nuanced", "multifaceted", "crucial", "pivotal".
- No signposting ("it is important to note", "in other words", "moreover", "furthermore"), no hedge stacks, no rule-of-three reflex.
- Prefer a strong verb to an adverb. Prefer the specific noun to the general one.
- If the writer has begun retyping the sentence themselves, their partial rewrite tells you the direction; honor it.
- A variant that only reorders the original's words is not a variant. Each must make a real choice.

For each variant, a note of at most fifteen words saying what you changed and why. The note is what lets the writer decide instead of merely choosing.`

// The exemplar block: the writer's own earlier prose, as the voice prompt sees it.
export function buildExemplarBlock(exemplars: VoiceExemplar[], guidance: string | null): string {
  const lines: string[] = ['THE WRITER\'S OWN PROSE']
  if (exemplars.length === 0) {
    lines.push(
      '',
      'No samples are available yet. Judge the voice from the draft itself: the sentences around the one you are rewriting are the writer\'s, and the draft as a whole is the only sample you have. Do not invent a style.'
    )
  } else {
    for (const ex of exemplars) {
      lines.push('', `--- ${ex.title || 'Untitled'} ---`, ex.text.trim())
    }
  }
  if (guidance?.trim()) {
    lines.push('', 'VOICE GUIDANCE (the writer\'s own notes on how they write)', guidance.trim())
  }
  return lines.join('\n')
}

// ── Ground ────────────────────────────────────────────────────────────────────

export interface GroundedPassage {
  id: string
  author: string
  work: string
  section_label: string | null
  translator: string | null
  text_type: string
  // Whether the words may be quoted verbatim or only paraphrased. Primary and
  // public-domain texts quote; summaries and syntheses do not.
  mode: 'quote' | 'paraphrase'
  text: string
  similarity: number
}

export type FidelityVerdict = 'supported' | 'partly' | 'contradicted' | 'unsupported'

export interface FidelityAssessment {
  verdict: FidelityVerdict
  // At most three sentences, naming the passage by author and work.
  note: string
}

export const QUOTABLE_TYPES = new Set(['primary', 'public_domain'])

export const FIDELITY_SYSTEM = `You judge one thing: whether a sentence from a student's draft represents the sources faithfully.

You will be given the sentence, a little of its surrounding draft, and passages retrieved from the corpus of Stoic and related texts. Judge fidelity only. Not whether the claim is true, not whether the prose is good, not whether a Stoic would agree: whether what the sentence attributes to, or draws from, the tradition is what these passages actually say.

Verdicts:
- supported: a passage says what the sentence takes it to say.
- partly: a passage bears on it but the sentence overstates, narrows, or shifts what it says.
- contradicted: a passage says otherwise.
- unsupported: the passages do not bear on the sentence. The corpus was silent here. Say that; do not speculate about what other texts might say.

Write at most three sentences. Name the passage you rely on by author and work and section. Quote the source's own words when they settle the matter. Never use an em dash or an en dash.`

// ── Citations ────────────────────────────────────────────────────────────────
// What gets inserted into the draft. Markdown italics on the work, since the
// editor's read view typesets them; the writer shapes the sentence around it.

export function formatCitation(p: Pick<GroundedPassage, 'author' | 'work' | 'section_label'>): string {
  const loc = [p.work ? `*${p.work}*` : null, p.section_label].filter(Boolean).join(' ')
  return `(${[p.author, loc].filter(Boolean).join(', ')})`
}

export function formatQuotation(
  p: Pick<GroundedPassage, 'author' | 'work' | 'section_label' | 'translator'>,
  quote: string
): string {
  const q = quote.trim().replace(/^["“]|["”]$/g, '')
  const trans = p.translator ? `, trans. ${p.translator}` : ''
  const loc = [p.work ? `*${p.work}*` : null, p.section_label].filter(Boolean).join(' ')
  return `“${q}” (${[p.author, loc].filter(Boolean).join(', ')}${trans})`
}

// The opening sentence of a passage, for the one-click quote when the writer
// has not selected a span of it.
export function openingSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(t)
  const s = m ? m[0] : t
  return s.length > 320 ? `${s.slice(0, 317).trimEnd()}…` : s
}
