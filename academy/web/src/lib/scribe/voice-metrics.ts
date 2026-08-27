// Deterministic "voice meter" — cheap, no LLM. Surfaces the two mechanical
// signals AI screeners actually key on (uniform sentence rhythm = low
// burstiness; predictable, padded diction) plus a cliché/tell wordlist, so
// Kyle can see how machine-shaped a draft reads before he retypes it. These
// are heuristics, not a verdict; the retype is what fixes them.

export interface TellHit {
  phrase: string
  count: number
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
  toBeRate: number // is/are/was/were/be/been/being/am
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
  const adverbs = words.filter(w => /[a-z]{3,}ly[.,;:!?)"']*$/i.test(w)).length
  const lower = ` ${clean.toLowerCase()} `
  const toBe = (lower.match(/\b(is|are|was|were|be|been|being|am)\b/g) || []).length

  // Em/en dashes always count. A hyphen only counts when it floats between
  // spaces mid-line, which is the dash usage; requiring a non-space character
  // and no newline before it keeps markdown bullets and rule lines out.
  const dashChars = (clean.match(/[—–]/g) || []).length
  const spacedHyphens = (clean.match(/[^\s][ \t]+-{1,2}[ \t]+/g) || []).length
  const dashes = dashChars + spacedHyphens
  const dashRate = wordCount ? Math.round((dashes / wordCount) * 10000) / 10 : 0
  const dashLabel: VoiceMetrics['dashLabel'] =
    dashes === 0 ? 'clean' : dashRate <= 2 ? 'some' : 'heavy'

  const tellHits: TellHit[] = []
  for (const t of TELLS) {
    const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const count = (lower.match(re) || []).length
    if (count > 0) tellHits.push({ phrase: t, count })
  }
  tellHits.sort((a, b) => b.count - a.count)
  const tellTotal = tellHits.reduce((a, h) => a + h.count, 0)

  return {
    words: wordCount,
    sentences: sentenceCount,
    meanSentenceLen: Math.round(meanSentenceLen * 10) / 10,
    burstiness: Math.round(burstiness * 10) / 10,
    burstinessLabel,
    adverbRate: per100(adverbs),
    toBeRate: per100(toBe),
    dashes,
    dashRate,
    dashLabel,
    tellHits,
    tellTotal,
  }
}
