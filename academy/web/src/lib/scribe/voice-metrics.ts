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

// 'echo' is a phrase of three or more words repeated across the draft: the
// controlling metaphor mechanically reapplied ("their own picture" in every
// section), which detectors read as one scaffold holding unlike material.
export type MetricKind = 'dash' | 'adverb' | 'tobe' | 'tell' | 'echo'

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
  // Phrases of 3+ words that recur ECHO_MIN times or more. Each count is the
  // number of occurrences; echoTotal is every painted occurrence.
  echoes: TellHit[]
  echoTotal: number
  // Paragraph shape. Detectors and readers both notice when every paragraph
  // is the same length and build (topic, elaboration, quote, takeaway).
  // Coefficient of variation of words per paragraph; low means metronomic.
  paragraphs: number
  paragraphVariation: number
  paragraphLabel: 'flat' | 'ok' | 'good'
}

const ECHO_MIN = 3
const ECHO_MIN_WORDS = 3
const ECHO_MAX_WORDS = 6

// Words that cannot by themselves make a phrase an echo ("in the same way"
// is grammar, not a metaphor).
const ECHO_STOP = new Set(
  'the a an and or but if then than that this those these there here is are was were be been being am do does did not no it its into onto of for from with without about over under to in on at by as so such very really just also too can could would should may might must will shall have has had having what which who whom whose when where why how all any some more most much many few less least own other another same each every both either neither only ever never always often i me my mine we us our you your he him his she her they them their one ones thing things way get got make made say said says think thought know knew see saw go went come came take took give gave keep kept put let want wanted need needed use used still even again back up down out off yet because while until since after before through during between among against'.split(
    /\s+/
  )
)

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
  'foundational',
]

// Tells that are shapes rather than phrases, so they need a pattern. These are
// the ones Kyle named from reading drafts: the negation-first frame ("This is
// not X. It is Y."), the line that announces an idea's importance instead of
// showing it, the over-the-top comparison, and the manufactured punchline.
// Each label is what the meter reports; a hit paints the whole matched span.
export const PATTERN_TELLS: { label: string; re: RegExp }[] = [
  {
    // "This does not produce sympathy. It produces something colder."
    // "It's not about the money. It's about the time."
    label: 'negation-first frame',
    re: /\b(?:this|that|it)\s*(?:(?:is|was|does|did)\s+not|(?:isn|wasn|doesn|didn)['’]t|['’]s\s+not)\s+[^.!?\n]{2,90}[.!?]\s+(?:It|This|That)(?:['’]s|\s+(?:is|was|does|did|produces|means|becomes|turns))\b/gi,
  },
  {
    // "not just a habit, but a practice"
    label: 'not just X but Y',
    re: /\bnot\s+(?:just|merely|simply|only)\s+[^.,;:\n]{1,60},?\s+but\b/gi,
  },
  {
    label: 'announced importance',
    re: /\b(?:the|this|that)\s+difference\s+matters\b|\bmatters\s+more\s+than\b|\bmore\s+than\s+(?:almost\s+)?anything\s+else\b|\bhere(?:['’]s|\s+is)\s+the\s+thing\b|\bthis\s+is\s+the\s+(?:crux|key|point|heart|part)\b|\b(?:that|this|which)\s+changes\s+everything\b|\bmake\s+no\s+mistake\b|\blet\s+that\s+sink\s+in\b|\bthe\s+(?:real|key|important|crucial)\s+(?:point|thing|question|insight)\s+(?:is|here)\b|\bwhat\s+matters\s+(?:most\s+)?(?:is|here)\b|\bthis\s+(?:matters|is\s+important)\s+because\b|\bthe\s+(?:distinction|difference)\s+is\s+(?:important|crucial|everything)\b|\bthis\s+is\s+(?:important|crucial|essential|the\s+whole\s+point)\b/gi,
  },
  {
    label: 'hyperbole',
    re: /\bnothing\s+less\s+than\b|\bnothing\s+short\s+of\b|\bthe\s+single\s+most\b|\bthe\s+(?:loudest|greatest|most\s+\w+)\s+\w+\s+in\s+the\s+(?:language|world|history\s+of)\b|\ba\s+quiet\s+revolution\b|\ba\s+kind\s+of\s+alchemy\b|\bmore\s+than\s+any\s+other\b|\bin\s+the\s+history\s+of\b|\bnothing\s+could\s+be\s+(?:further|more)\b/gi,
  },
  {
    // "What does that mean? It means..." / "Why? Because..."
    label: 'self-answered question',
    re: /\?\s+(?:It|The\s+answer|Because|That|This)\s+(?:means|is|depends|was|matters|comes)?\b/g,
  },
  {
    // "The answer: discipline." / "Simple." / "Full stop."
    label: 'punchline',
    re: /(?:^|[.!?]\s+)(?:Simple|Period|Full\s+stop|Exactly|Precisely|Always|Never|Nothing|Everything|Neither|Both)\.(?=\s|$)|:\s+[A-Za-z]+\.(?=\s|$)/gm,
  },
  {
    // "This essay moves from the small to the large." "In what follows."
    label: 'meta-narration',
    re: /\b(?:this|the)\s+(?:essay|piece|article|post|section|chapter|argument)\s+(?:moves|argues|will|begins|turns|shows|makes|proceeds|has|is\s+about|takes)\b|\bin\s+(?:this|the\s+following)\s+(?:essay|piece|section|paragraphs?)\b|\bin\s+what\s+follows\b|\bas\s+(?:we|I)\s+(?:will|shall)\s+see\b|\bthe\s+(?:argument|structure|logic)\s+(?:is|here\s+is|runs)\s+(?:consistent|simple|straightforward|the\s+same|as\s+follows)\b/gi,
  },
  {
    // "Most people never ask this." "We all know the feeling."
    label: 'sweeping claim',
    re: /\b(?:most|many|so\s+many|all|few)\s+(?:people|of\s+us|men|women|writers|readers)\b|\bwe\s+all\s+(?:know|have|want|feel|do|carry|tell|think)\b|\bevery(?:one|body)\s+(?:knows|wants|has|feels|thinks|does|talks)\b|\bno(?:body|\s+one)\s+(?:talks|tells|wants|asks|mentions|says|admits)\b|\bthe\s+truth\s+(?:is|about)\b|\bin\s+today['’]s\s+(?:world|culture|society)\b/gi,
  },
  {
    // "X quietly runs Y": mood in place of meaning.
    label: 'stock adverb',
    re: /\b(?:quietly|subtly|effortlessly|seamlessly|profoundly|deeply|truly|fundamentally|remarkably|undeniably|beautifully|elegantly|relentlessly)\b/gi,
  },
  {
    // Filler qualifiers: reflex, not precision.
    label: 'stock qualifier',
    re: /\bgenuinely?\b|\bin\s+(?:some|a)\s+(?:sense|way)\b|\bto\s+some\s+(?:extent|degree)\b|\bat\s+least\b|\barguably\b|\bin\s+many\s+ways\b|\bon\s+some\s+level\b/gi,
  },
]

// Words trimmed from the edges of a reported echo. Narrower than ECHO_STOP:
// a possessive or "own" is part of the phrase ("their own picture"), a
// preposition or auxiliary at the edge is not ("on their own picture of").
const ECHO_TRIM = new Set(
  'the a an and or but of for to in on at by with from as into onto over under than then that this these those is are was were be been being am do does did not it so such very just also too can could would should may might must will shall have has had having what which who whom whose when where why how all any some more most much many few less least each every both either neither only ever never always often i me we us you he him she her they them one there here yet because while until since after before through during between among against up down out off back'.split(
    /\s+/
  )
)

type WordTok = { w: string; start: number; end: number }

function tokenize(src: string): WordTok[] {
  const out: WordTok[] = []
  for (const m of src.matchAll(/[A-Za-z][A-Za-z'’-]*/g)) {
    out.push({ w: m[0].toLowerCase().replace(/[’']/g, "'"), start: m.index!, end: m.index! + m[0].length })
  }
  return out
}

// Repeated phrases. Every n-gram of ECHO_MIN_WORDS..ECHO_MAX_WORDS words is
// counted; those seen ECHO_MIN times or more, with at least one word that is
// not a function word, are echoes. A shorter phrase inside a longer echo with
// the same count is dropped so "their own picture" is reported once, not as
// "their own" and "own picture" too.
export function echoSpans(text: string): Span[] {
  const toks = tokenize(text || '')
  if (toks.length < ECHO_MIN_WORDS * ECHO_MIN) return []
  const counts = new Map<string, number[]>() // key -> start token indexes
  for (let n = ECHO_MIN_WORDS; n <= ECHO_MAX_WORDS; n++) {
    for (let i = 0; i + n <= toks.length; i++) {
      const words = toks.slice(i, i + n).map(t => t.w)
      if (!words.some(w => !ECHO_STOP.has(w))) continue
      const key = words.join(' ')
      const arr = counts.get(key)
      if (arr) arr.push(i)
      else counts.set(key, [i])
    }
  }
  const kept = [...counts.entries()].filter(([, at]) => at.length >= ECHO_MIN)
  // Drop a phrase contained in a longer kept phrase with the same count.
  const survivors = kept.filter(
    ([key, at]) =>
      !kept.some(([other, oat]) => other !== key && oat.length === at.length && other.includes(key))
  )
  // Trim leading and trailing function words so the echo reported is the
  // phrase itself ("their own picture", not "on their own picture of").
  const spans: Span[] = []
  for (const [key, at] of survivors) {
    const words = key.split(' ')
    let a = 0
    let b = words.length
    while (a < b && ECHO_TRIM.has(words[a])) a++
    while (b > a && ECHO_TRIM.has(words[b - 1])) b--
    if (b - a < ECHO_MIN_WORDS) continue
    const label = words.slice(a, b).join(' ')
    for (const i of at) spans.push({ start: toks[i + a].start, end: toks[i + b - 1].end, label })
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end)
  const out: Span[] = []
  for (const s of spans) {
    const last = out[out.length - 1]
    if (last && s.start < last.end) continue
    out.push(s)
  }
  return out
}

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
  } else if (kind === 'echo') {
    return echoSpans(src)
  } else {
    for (const phrase of TELLS) {
      for (const m of src.matchAll(new RegExp(escapeRe(phrase), 'gi'))) {
        spans.push({ start: m.index!, end: m.index! + m[0].length, label: phrase })
      }
    }
    for (const { label, re } of PATTERN_TELLS) {
      re.lastIndex = 0
      for (const m of src.matchAll(re)) {
        // A leading terminator is only the anchor for the punchline pattern;
        // leave it out of the painted span.
        const lead = m[0].match(/^[.!?]\s+/)?.[0].length ?? 0
        spans.push({ start: m.index! + lead, end: m.index! + m[0].length, label })
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

  const tally = (spans: Span[]): TellHit[] => {
    const byPhrase = new Map<string, number>()
    for (const s of spans) {
      const key = s.label ?? ''
      byPhrase.set(key, (byPhrase.get(key) ?? 0) + 1)
    }
    return [...byPhrase.entries()]
      .map(([phrase, count]) => ({ phrase, count }))
      .sort((a, b) => b.count - a.count)
  }
  const tellHits = tally(tellSpans)
  const echoSpansFound = metricSpans(clean, 'echo')
  const echoes = tally(echoSpansFound)

  // Paragraph shape: words per paragraph, as a coefficient of variation so
  // the number means the same thing for a short piece and a long one. Only
  // meaningful once there are a few paragraphs to compare.
  const paraLens = clean
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => p.split(/\s+/).filter(Boolean).length)
  const paragraphs = paraLens.length
  const paraMean = paragraphs ? paraLens.reduce((a, b) => a + b, 0) / paragraphs : 0
  const paragraphVariation = paragraphs >= 4 && paraMean ? Math.round((stdev(paraLens) / paraMean) * 100) / 100 : 0
  const paragraphLabel: VoiceMetrics['paragraphLabel'] =
    paragraphs < 4 || paragraphVariation >= 0.45 ? 'good' : paragraphVariation >= 0.25 ? 'ok' : 'flat'

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
    echoes,
    echoTotal: echoSpansFound.length,
    paragraphs,
    paragraphVariation,
    paragraphLabel,
  }
}
