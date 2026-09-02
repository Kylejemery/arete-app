// Unit checks for the sentence splitter behind the composer's retype callout.
// Run: npx tsx src/scripts/sentences-smoke.ts

import { sentenceAt, sentenceAfter, sentenceBefore, sentenceIndex, sentenceRanges } from '../lib/sentences'

let pass = 0
let fail = 0
function check(name: string, ok: unknown, detail?: unknown) {
  if (ok) pass++
  else {
    fail++
    console.log(`FAIL ${name}`, detail ?? '')
  }
}

const texts = (t: string) => sentenceRanges(t).map(r => t.slice(r.start, r.end))

// 1. Plain prose.
check('splits on terminators', JSON.stringify(texts('One here. Two here! Three? Four.')) === JSON.stringify(['One here.', 'Two here!', 'Three?', 'Four.']), texts('One here. Two here! Three? Four.'))

// 2. Abbreviations the tradition uses.
const t2 = 'Seneca says so in Ep. 12 and again in Ep. 41. Epictetus answers in Disc. 1.24. Marcus, Med. 5.1, agrees.'
check('keeps Ep. / Disc. / Med. joined', texts(t2).length === 3, texts(t2))

// 3. e.g. and i.e. with lowercase continuation.
const t3 = 'Some vices, e.g. anger, are judgments. That is the claim.'
check('e.g. does not split', texts(t3).length === 2, texts(t3))

// 4. Initials.
const t4 = 'J. S. Mill disagreed. So did A. A. Long.'
check('initials do not split', texts(t4).length === 2, texts(t4))

// 5. Decimals.
const t5 = 'It scored 3.5 on the scale. Then it fell.'
check('decimal is not a boundary', texts(t5).length === 2, texts(t5))

// 6. Closing quotes and parentheses after the terminator.
const t6 = 'He said "no." Then he left (quietly.) And that was all.'
check('closers stay with their sentence', JSON.stringify(texts(t6)) === JSON.stringify(['He said "no."', 'Then he left (quietly.)', 'And that was all.']), texts(t6))

// 7. Markdown prefixes are not part of the sentence.
const t7 = '## The claim\n\n> Quoted line one. Quoted line two.\n* bullet one. Still bullet one\n1. numbered.'
const r7 = sentenceRanges(t7)
check('heading text excludes the hashes', t7.slice(r7[0].start, r7[0].end) === 'The claim', t7.slice(r7[0].start, r7[0].end))
check('quote prefix excluded', t7.slice(r7[1].start, r7[1].end) === 'Quoted line one.', t7.slice(r7[1].start, r7[1].end))
check('bullet prefix excluded', t7.slice(r7[3].start, r7[3].end) === 'bullet one.', t7.slice(r7[3].start, r7[3].end))
check('numbered prefix excluded', t7.slice(r7[5].start, r7[5].end) === 'numbered.', t7.slice(r7[5].start, r7[5].end))

// 8. Line breaks always end a sentence, even without punctuation.
const t8 = 'No period here\nbut a new line. And more'
check('newline ends a sentence', JSON.stringify(texts(t8)) === JSON.stringify(['No period here', 'but a new line.', 'And more']), texts(t8))

// 9. Ellipsis run.
const t9 = 'Wait for it... Here it is.'
check('ellipsis then capital splits', texts(t9).length === 2, texts(t9))

// 10. sentenceAt: inside, on the boundary space, at the head of a paragraph.
const t10 = 'First one. Second one.\nThird one.'
const inFirst = sentenceAt(t10, 3)
check('caret inside first', inFirst && t10.slice(inFirst.start, inFirst.end) === 'First one.', inFirst)
const onSpace = sentenceAt(t10, 10)
check('caret at end of first (the period) belongs to first', onSpace && t10.slice(onSpace.start, onSpace.end) === 'First one.', onSpace)
const gap = sentenceAt(t10, 11)
check('caret in the gap before second belongs to second (contained)', gap && t10.slice(gap.start, gap.end) === 'Second one.', gap)
const head = sentenceAt(t10, 23)
check('caret at head of paragraph goes to third', head && t10.slice(head.start, head.end) === 'Third one.', head)
check('empty text has no sentence', sentenceAt('', 0) === null)

// 11. after / before / index.
const second = sentenceAfter(t10, 10)
check('sentenceAfter finds the next', second && t10.slice(second.start, second.end) === 'Second one.', second)
const first = sentenceBefore(t10, 11)
check('sentenceBefore finds the previous', first && t10.slice(first.start, first.end) === 'First one.', first)
check('sentenceAfter at end is null', sentenceAfter(t10, t10.length) === null)
const idx = sentenceIndex(t10, second as { start: number; end: number })
check('index is 2 of 3', idx.index === 2 && idx.total === 3, idx)

// 12. Emphasis markers at the head of a sentence stay with it.
const t12 = '*Emphatic* start here. **Bold** next.'
check('emphasis kept', JSON.stringify(texts(t12)) === JSON.stringify(['*Emphatic* start here.', '**Bold** next.']), texts(t12))

// 13. Trailing whitespace trimmed, ranges tight.
const t13 = 'Tight.   Loose.  '
const r13 = sentenceRanges(t13)
check('ranges trimmed', t13.slice(r13[1].start, r13[1].end) === 'Loose.', r13)

// 14. Numeric abbreviations split when no number follows; "etc." splits before a capital.
const t14 = 'He said no. Then he cited Ep. 12. Anger, fear, etc. The list ends.'
check('no. splits without a number, Ep. 12 joins, etc. splits before capital', JSON.stringify(texts(t14)) === JSON.stringify(['He said no.', 'Then he cited Ep. 12.', 'Anger, fear, etc.', 'The list ends.']), texts(t14))
const t15 = 'See Ench. §5 and Ep. I.2 for the rest. Done.'
check('section sign and roman numeral count as numbers', texts(t15).length === 2, texts(t15))

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
