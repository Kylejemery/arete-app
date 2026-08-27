// Deterministic "voice meter" — cheap, no LLM. Surfaces the two mechanical
// signals AI screeners actually key on (uniform sentence rhythm = low
// burstiness; predictable, padded diction) plus a cliché/tell wordlist, so
// Kyle can see how machine-shaped a draft reads before he retypes it. These
// are heuristics, not a verdict; the retype is what fixes them.
//
// Every lexical metric is computed from spans rather than counted separately,
// so the number in the meter and the passages the meter highlights are always
// the same set. `metricSpans` is what the draft pane paints.

export interface TellHit {
  phrase: string
  count: number
}

export type MetricKind = 'dash' | 'adverb' | 'tobe' | 'tell'

export interface Span {
  start: number
  end: number
  label?: string
}

export interface VoiceMetrics {
  words: number
  sentences: number
  meanSentenceLen: number
  // Std deviation of sentence length in words. Human essays vary a lot (often
  // >8); uniform machine prose sits low. Higher is more human.
  burstiness: number
  burstinessLabel: 'flat' | 'ok' | 'good'
  // Per-100-words rates.
  adverbRate: number // words ending in -ly
  adverbCount: number
  toBeRate: number // is/are/was/were/be/been/being/am
  toBeCount: number
  // Dashes standing between clauses or fencing off an aside: the em dash, the
  // en dash used as one, and the spaced hyphen. Kyle bans these outright in
  // the essays, so zero is the target and any count is worth seeing. Hyphens
  // inside compound words and markdown bullets are not counted.
  dashes: number
  dashRate: number // per 1000 words
  dashLabel: 'clean' | 'some' | 'heavy'
  tellHits: TellHit[]
  tellTotal: number
}

// High-signal AI/blog tells. Matched case-insensitively as whole phrases.
const TELLS: string[] = [
  'at the end of the day',
  'in a world where',
  "in today's world",
  'it is important to note',
  "it's important to note",
  'it is worth noting',
  'needless to say',
  'first and foremost',
  'when it comes to',
  'moreover',
  'furthermore',
  'in conclusion',
  'ultimately,',
  'in essence',
  'delve',
  'tapestry',
  'testament to',
  'navigate the complexities',
  'navigating the complexities',
  'underscore',
  'the ever-evolving',
  'ever-changing',
  'landscape of',
  'realm of',
  'pivotal',
  'crucial role',
  'seamless',
  'robust',
  'holistic',
  'leverage',
  'myriad',
  'plethora',
  'a beacon of',
  'stands as a',
  'plays a vital role',
  'rich tapestry',
]

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Sorted, non-overlapping spans for one metric. The draft pane wraps exactly
// these ranges, so anything counted here is something Kyle can go look at.
export function metricSpans(text: string, kind: MetricKind): Span[] {
  const src = text || ''
  const spans: Span[] = []

  if (kind === 'dash') {
    for (const m of src.matchAll(/[—–]/g)) {
      spans.push({ start: m.index!, end: m.index! + m[0].length, label: 'dash' })
    }
    // A hyphen only counts when it floats between spaces mid-line, which is
    // the dash usage. Requiring a non-space before it and no newline in the
    // gap keeps markdown bullets and rule lines out.
    for (const m of src.matchAll(/(\S)([ \t]+)(-{1,2})(?=[ \t]+\S)/g)) {
      const start = m.index! + m[1].length + m[2].length
      spans.push({ start, end: start + m[3].length, label: 'dash' })
    }
  } else if (kind === 'adverb') {
    for (const m of src.matchAll(/\b[A-Za-z]{3,}ly\b/g)) {
      spans.push({ start: m.index!, end: m.index! + m[0].length, label: m[0].toLowerCase() })
    }
  } else if (kind === 'tobe') {
    for (const m of src.matchAll(/\b(?:is|are|was|were|be|been|being|am)\b/gi)) {
      spans.push({ start: m.index!, end: m.index! + m[0].length, label: m[0].toLowerCase() })
    }
  } else {
    for (const phrase of TELLS) {
      for (const m of src.matchAll(new RegExp(escapeRe(phrase), 'gi'))) {
        spans.push({ start: m.index!, end: m.index! + m[0].length, label: phrase })
      }
    }
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end)
  const out: Span[] = []
  for (const s of spans) {
    const last = out[out.length - 1]
    if (last && s.start < last.end) continue // drop the nested duplicate
    out.push(s)
  }
  return out
}

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length
  return Math.sqrt(variance)
}

export function computeVoiceMetrics(text: string): VoiceMetrics {
  const clean = (text || '').trim()
  const words = clean ? clean.split(/\s+/).filter(Boolean) : []
  const wordCount = words.length

  // Sentence split on terminal punctuation; keep only non-empty runs.
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
  const sentenceLens = sentences.map(s => s.split(/\s+/).filter(Boolean).length).filter(n => n > 0)
  const sentenceCount = sentenceLens.length
  const meanSentenceLen = sentenceCount ? wordCount / sentenceCount : 0
  const burstiness = stdev(sentenceLens)
  const burstinessLabel: VoiceMetrics['burstinessLabel'] =
    burstiness >= 8 ? 'good' : burstiness >= 5 ? 'ok' : 'flat'

  const per100 = (n: number) => (wordCount ? Math.round((n / wordCount) * 1000) / 10 : 0)

  const adverbSpans = metricSpans(clean, 'adverb')
  const toBeSpans = metricSpans(clean, 'tobe')
  const dashSpans = metricSpans(clean, 'dash')
  const tellSpans = metricSpans(clean, 'tell')

  const dashes = dashSpans.length
  const dashRate = wordCount ? Math.round((dashes / wordCount) * 10000) / 10 : 0
  const dashLabel: VoiceMetrics['dashLabel'] =
    dashes === 0 ? 'clean' : dashRate <= 2 ? 'some' : 'heavy'

  const byPhrase = new Map<string, number>()
  for (const s of tellSpans) {
    const key = s.label ?? ''
    byPhrase.set(key, (byPhrase.get(key) ?? 0) + 1)
  }
  const tellHits: TellHit[] = [...byPhrase.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count)

  return {
    words: wordCount,
    sentences: sentenceCount,
    meanSentenceLen: Math.round(meanSentenceLen * 10) / 10,
    burstiness: Math.round(burstiness * 10) / 10,
    burstinessLabel,
    adverbRate: per100(adverbSpans.length),
    adverbCount: adverbSpans.length,
    toBeRate: per100(toBeSpans.length),
    toBeCount: toBeSpans.length,
    dashes,
    dashRate,
    dashLabel,
    tellHits,
    tellTotal: tellSpans.length,
  }
}
