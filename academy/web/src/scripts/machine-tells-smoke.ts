// Offline checks for the pattern tells in the voice meter and for the Cabinet
// query builder. No network, no tokens.
// Run: npx tsx src/scripts/machine-tells-smoke.ts

import { metricSpans, computeVoiceMetrics } from '../lib/scribe/voice-metrics'
import { cabinetSearchQuery, isAppPrompt, formatCabinetHit, type CabinetHit } from '../lib/cabinet-history'
import { MACHINE_TELLS_BLOCK, MACHINE_TELLS_SUMMARY } from '../lib/machine-tells'

let pass = 0
let fail = 0
function check(name: string, ok: unknown, detail?: unknown) {
  if (ok) pass++
  else {
    fail++
    console.log(`FAIL ${name}`, detail ?? '')
  }
}

const labels = (t: string) => metricSpans(t, 'tell').map(s => s.label)
const has = (t: string, label: string) => labels(t).includes(label)

// ── The tells Kyle named ─────────────────────────────────────────────────────

check(
  'negation-first: does not produce / It produces',
  has('This does not produce sympathy. It produces something colder and more useful.', 'negation-first frame')
)
check(
  'negation-first: is not poetry / It is',
  has('This is not poetry about karma. It is a practical claim.', 'negation-first frame')
)
check("negation-first: it's not about / it's about", has("It's not about the money. It's about the hours.", 'negation-first frame'))
check(
  'negation-first: a plain denial with no correction is left alone',
  !has('This is not what he wanted. He went home anyway.', 'negation-first frame')
)
check('not just X but Y', has('Discipline is not just a habit, but a way of seeing.', 'not just X but Y'))

check(
  'announced importance: the difference matters more than almost anything',
  has('and the difference matters more than almost anything else in this essay: he kept going.', 'announced importance')
)
check("announced importance: here's the thing", has("Here's the thing. He never fixed the gutter.", 'announced importance'))
check('announced importance: this is the crux', has('This is the crux of it.', 'announced importance'))
check('announced importance: that changes everything', has('And that changes everything.', 'announced importance'))
check(
  'announced importance: plain prose that simply matters is left alone',
  !has('The gutter mattered to him more than the roof did.', 'announced importance')
)

check('hyperbole: nothing less than', has('It was nothing less than a reckoning.', 'hyperbole'))
check('hyperbole: the single most', has('This is the single most important habit he has.', 'hyperbole'))
check('hyperbole: loudest tell in the language', has('The dash is the loudest tell in the language.', 'hyperbole'))

check('self-answered question', has('What does that mean? It means the work was his.', 'self-answered question'))
check('open question is left alone', !has('What did he want? Nobody at the table asked.', 'self-answered question'))

check('punchline: one-word sentence', has('He left the gutter for another year. Simple.', 'punchline'))
check('punchline: colon reveal', has('The answer: discipline.', 'punchline'))
check('punchline: ordinary colon is left alone', !has('He brought three things: rope, a ladder, and a bucket.', 'punchline'))

// The phrase list still works alongside the patterns.
check('phrase tell still counted', has('It is important to note that he left.', 'it is important to note'))

// Counts in the meter agree with the spans.
const sample = "This is not poetry about karma. It is a practical claim. Here's the thing: nothing less than the truth."
const m = computeVoiceMetrics(sample)
check('tellTotal equals span count', m.tellTotal === metricSpans(sample, 'tell').length, m)
check('tellHits carries pattern labels', m.tellHits.some(h => h.phrase === 'negation-first frame'), m.tellHits)

// ── Structural fingerprints ─────────────────────────────────────────────────

check('meta-narration: this essay moves from', has('This essay moves from the small to the large.', 'meta-narration'))
check('meta-narration: in what follows', has('In what follows I take three cases.', 'meta-narration'))
check('meta-narration: the argument is consistent', has('The argument is consistent, as is the demand it places on us.', 'meta-narration'))
check('meta-narration: a plain sentence about an essay is left alone', !has('He wrote the essay on a train.', 'meta-narration'))

check('stock qualifier: genuinely', has('He was genuinely surprised.', 'stock qualifier'))
check('stock qualifier: in some sense', has('In some sense the thief is right.', 'stock qualifier'))
check('stock qualifier: at least', has('At least he tried.', 'stock qualifier'))

const echoed = [
  'The driver who flipped him off was acting on their own picture of the road.',
  'The colleague who wrote the email had their own picture, and it was wrong.',
  'The killer, too, held their own picture of what he was owed.',
  'A different sentence with nothing repeated in it at all.',
].join(' ')
const echoLabels = metricSpans(echoed, 'echo').map(s => s.label)
check('echo: a phrase repeated three times is found', echoLabels.filter(l => l === 'their own picture').length === 3, echoLabels)
check('echo: sub-phrases are not double counted', !echoLabels.includes('own picture') && !echoLabels.includes('their own'), echoLabels)
const framed = 'He acted on their own picture of it. She acted on their own picture of it. They acted on their own picture of it.'
check('echo: leading and trailing function words are trimmed', metricSpans(framed, 'echo').every(s => s.label === 'acted on their own picture'), metricSpans(framed, 'echo').map(s => s.label))
check('echo: function-word runs are ignored', metricSpans('It was in the way. It was in the way. It was in the way.', 'echo').every(s => s.label !== 'was in the'), metricSpans('It was in the way. It was in the way. It was in the way.', 'echo').map(s => s.label))
check('echo: two occurrences are not an echo', metricSpans('their own picture, and again their own picture', 'echo').length === 0)
const em = computeVoiceMetrics(echoed)
check('echoes tallied in the meter', em.echoes.length === 1 && em.echoes[0].phrase === 'their own picture' && em.echoes[0].count === 3, em.echoes)

const flat = Array(6).fill('One claim here. Then the gloss of it. A quote follows, cited. The takeaway lands.').join('\n\n')
const varied = ['One line.', 'A paragraph that runs on for a while, building the case sentence by sentence until it has said what it needs to say and stops.', 'Two lines. Then a turn.', 'Another long paragraph that tells the scene in full, the gutter and the ladder and the rain, before it lets the reader go.', 'Done.'].join('\n\n')
check('paragraph rhythm: identical paragraphs read flat', computeVoiceMetrics(flat).paragraphLabel === 'flat', computeVoiceMetrics(flat).paragraphVariation)
check('paragraph rhythm: varied paragraphs read good', computeVoiceMetrics(varied).paragraphLabel === 'good', computeVoiceMetrics(varied).paragraphVariation)
check('paragraph rhythm: too few paragraphs is not judged', computeVoiceMetrics('One.\n\nTwo.').paragraphVariation === 0)

// ── The prompt block itself keeps its own rules ──────────────────────────────
check('tells block has no dashes', !/[—–]/.test(MACHINE_TELLS_BLOCK))
check('tells block names the structural fingerprints', /STRUCTURAL FINGERPRINTS/.test(MACHINE_TELLS_BLOCK) && /controlling metaphor/.test(MACHINE_TELLS_BLOCK) && /bolted-on anecdote/i.test(MACHINE_TELLS_BLOCK))
check('tells summary has no dashes', !/[—–]/.test(MACHINE_TELLS_SUMMARY))

// ── Cabinet query builder ────────────────────────────────────────────────────
const q = cabinetSearchQuery('Ideas are going to be the currency of the future. AI may lower the barrier to all knowledge work.')
check('query drops stopwords and joins with or', q === 'ideas or going or currency or future or lower or barrier or knowledge or work', q)
check('query is empty for stopwords only', cabinetSearchQuery('it is what it is') === '')
check('query caps terms', cabinetSearchQuery('alpha beta gamma delta epsilon zeta', 3) === 'alpha or beta or gamma')
check('query strips apostrophes', cabinetSearchQuery("Marcus's citadel") === 'marcuss or citadel')

check('app prompt detected', isAppPrompt('[Morning check-in] Kyle has just completed his routine'))
check('own words are not an app prompt', !isAppPrompt('I keep circling the gutter thing [again].'))

const hit: CabinetHit = {
  thread: 'cabinet',
  sent_at: '2026-08-20T14:17:26.781+00:00',
  role: 'user',
  speaker: 'user',
  content: 'I think ideas are the only thing left once the tools flatten everything else.',
  prev_speaker: null,
  prev_content: null,
  next_speaker: 'Theodore Roosevelt',
  next_content: 'Then hold them to the test of action.',
  rank: 0.1,
}
const f = formatCabinetHit(hit, 'Kyle')
check('format: header carries thread and date', f.startsWith('[CABINET, the full Cabinet, 2026-08-20]'), f)
check('format: writer line labelled by name', f.includes('\nKyle: I think ideas'), f)
check('format: reply labelled by counselor', f.includes('Theodore Roosevelt replied: Then hold'), f)

const counselorHit: CabinetHit = { ...hit, thread: 'roosevelt', role: 'assistant', speaker: 'Roosevelt', content: 'Hold it to action.', prev_speaker: 'user', prev_content: '[Morning check-in] Kyle has done his routine', next_speaker: null, next_content: null }
const g = formatCabinetHit(counselorHit, 'Kyle')
check('format: app prompt before a counselor line is dropped', !g.includes('Morning check-in'), g)
check('format: counselor thread label', g.startsWith('[CABINET, Roosevelt, 2026-08-20]'), g)

console.log(`${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
