// Offline checks for Scribe book mode: the chapter splitter, the chunk plan,
// the turn budget, thread windowing, the finding and verdict parsers, the
// chat commands, and shaping. A synthetic 60,000 word draft is generated in
// memory; nothing here touches the database or the network, and nothing is
// stored. Run from academy/web:
//   npx tsx src/scripts/scribe-book-smoke.ts

import {
  assembleShape,
  budgetReport,
  buildBookBrief,
  buildOutline,
  chunkDraft,
  commandPrompt,
  countWords,
  describeCommandTurn,
  estimateTokens,
  fitExemplars,
  hashText,
  numberParagraphs,
  parseClaims,
  parseCommand,
  parseFindings,
  parseJudgeResults,
  parseShape,
  planChunks,
  rewriteStopPoint,
  splitChapters,
  stripDraftBody,
  stripFindingsBlock,
  verifyJudgeResults,
  windowThread,
  RECENT_TURNS_TOKENS,
  TURN_BUDGET_TOKENS,
  type PassageRef,
  type ThreadMessage,
} from '../lib/scribe/book'
import * as prompts from '../lib/scribe/book-prompts'

let pass = 0
let fail = 0
function check(name: string, ok: unknown, detail?: unknown) {
  if (ok) pass++
  else {
    fail++
    console.log(`FAIL ${name}`, detail ?? '')
  }
}

// ── A synthetic 60,000 word draft ─────────────────────────────────────────
// Varied enough that chunks differ (no two paragraphs identical), plain
// enough to be obviously synthetic. Fifteen chapters of about 4,000 words.

const SUBJECTS = ['the gutter', 'the morning walk', 'the unanswered letter', 'the board meeting', 'the long drive', 'the broken fence']
const VERBS = ['hung there', 'came back', 'waited', 'went unmentioned', 'kept its shape', 'refused to settle']
const TAILS = ['and nothing about it changed', 'which is what an impression does', 'until the judgment moved', 'as if the thing itself were the problem', 'and the year went on', 'and no one said so']

function sentence(seed: number): string {
  const s = SUBJECTS[seed % SUBJECTS.length]
  const v = VERBS[Math.floor(seed / 6) % VERBS.length]
  const t = TAILS[Math.floor(seed / 36) % TAILS.length]
  return `Paragraph ${seed}: ${s} ${v}, ${t}, in the ${seed % 7 === 0 ? 'seventh' : 'ordinary'} week of it.`
}

function paragraph(seed: number, sentences = 5): string {
  const out: string[] = []
  for (let i = 0; i < sentences; i++) out.push(sentence(seed * 10 + i))
  return out.join(' ')
}

function chapterBody(chapterIndex: number, targetWords: number): string {
  const paras: string[] = []
  let words = 0
  let seed = chapterIndex * 1000
  while (words < targetWords) {
    const p = paragraph(seed++)
    paras.push(p)
    words += countWords(p)
  }
  return paras.join('\n\n')
}

const CHAPTERS = 15
const headed: string[] = []
for (let i = 1; i <= CHAPTERS; i++) {
  headed.push(`# Chapter ${i}: The ${SUBJECTS[i % SUBJECTS.length]}\n\n${chapterBody(i, 4000)}`)
}
const HEADED_DRAFT = headed.join('\n\n')
const totalWords = countWords(HEADED_DRAFT)
check('synthetic draft is about 60k words', totalWords >= 58_000 && totalWords <= 66_000, totalWords)

// ── Splitting ─────────────────────────────────────────────────────────────
{
  const r = splitChapters(HEADED_DRAFT, 'auto')
  check('auto picks headings', r.strategy === 'headings', r.strategy)
  check('headings yield fifteen chapters', r.chapters.length === CHAPTERS, r.chapters.length)
  check('heading titles are kept', r.chapters[0].title.startsWith('Chapter 1:'), r.chapters[0].title)
  const sum = r.chapters.reduce((n, c) => n + c.words, 0)
  // Heading lines are the only words not in a chapter body.
  check('no words lost splitting by headings', sum + CHAPTERS * 5 >= totalWords - CHAPTERS * 5 && sum <= totalWords, { sum, totalWords })
  check('chapter text has no heading line', !r.chapters[3].text.includes('# Chapter'))
}
{
  const marked = headed.map((c, i) => c.replace(/^# Chapter \d+: (.*)$/m, `CHAPTER ${i + 1}\n\n$1`)).join('\n\n')
  const r = splitChapters(marked, 'auto')
  check('auto falls back to markers', r.strategy === 'markers', r.strategy)
  check('markers yield fifteen chapters', r.chapters.length === CHAPTERS, r.chapters.length)
  check('a bare marker takes the short line under it as title', r.chapters[1].title.startsWith('The '), r.chapters[1].title)
}
{
  const plain = headed.map(c => c.replace(/^# .*\n\n/m, '')).join('\n\n')
  const r = splitChapters(plain, 'auto')
  check('auto falls back to size', r.strategy === 'size', r.strategy)
  check('size sections are about 3,000 words', r.chapters.every(c => c.words <= 3600) && r.chapters.length >= 17, { n: r.chapters.length })
  const sum = r.chapters.reduce((n, c) => n + c.words, 0)
  check('no words lost splitting by size', sum === countWords(plain), { sum, expected: countWords(plain) })
  check('size cuts at paragraph breaks', r.chapters.every(c => !c.text.startsWith(' ') && c.text.split('\n\n').every(p => p.startsWith('Paragraph'))))
}
{
  const withPreamble = `A short note.\n\n${HEADED_DRAFT}`
  const r = splitChapters(withPreamble, 'headings')
  check('a short preamble does not become a chapter', r.chapters.length === CHAPTERS, r.chapters.length)
  const longPre = `${paragraph(999)}\n\n${paragraph(998)}\n\n${HEADED_DRAFT}`
  const r2 = splitChapters(longPre, 'headings')
  check('a long preamble becomes an Opening chapter', r2.chapters.length === CHAPTERS + 1 && r2.chapters[0].title === 'Opening', r2.chapters[0]?.title)
}

// ── Chunking and the reindex plan ─────────────────────────────────────────
{
  const chapter = splitChapters(HEADED_DRAFT, 'headings').chapters[4].text
  const mine = chunkDraft(chapter)
  const chunkWords = mine.map(c => countWords(c.content))
  check('chunks are about 400 words', chunkWords.every(w => w <= 400) && chunkWords.slice(0, -1).every(w => w >= 250), chunkWords)
  check('chunking loses no words', chunkWords.reduce((a, b) => a + b, 0) === countWords(chapter))
  check('chunks start on paragraph boundaries', mine.every(c => c.content.startsWith('Paragraph')))
  check('chunk hashes are stable', hashText(mine[0].content) === mine[0].content_hash && hashText('a') !== hashText('b'))
  const long = chunkDraft('word '.repeat(1500))
  check('an overlong paragraph is cut into windows', long.length === 4 && countWords(long[0].content) === 400, long.length)

  const stored = mine.map(c => ({ chunk_index: c.chunk_index, content_hash: c.content_hash }))
  const same = planChunks(mine, stored)
  check('an unchanged chapter re-embeds nothing', same.embed.length === 0 && same.keep.length === mine.length && same.remove.length === 0)

  // Edit one paragraph in the middle: only the chunk holding it changes, and
  // the chunks after it keep their content and are reused by hash.
  const paras = chapter.split('\n\n')
  paras[Math.floor(paras.length / 2)] += ' One new sentence, added by hand, that changes this paragraph alone.'
  const edited = chunkDraft(paras.join('\n\n'))
  const plan = planChunks(edited, stored)
  check('a one paragraph edit re-embeds at most two chunks', plan.embed.length >= 1 && plan.embed.length <= 2, plan.embed.length)
  check('the untouched chunks are kept or reused', plan.keep.length + plan.reuse.length >= mine.length - 2, { keep: plan.keep.length, reuse: plan.reuse.length })

  // Cut the last paragraph: the tail chunks go, the head is kept.
  const shorter = chunkDraft(paras.slice(0, -3).join('\n\n'))
  const plan2 = planChunks(shorter, stored)
  check('a cut removes trailing chunk indexes', plan2.remove.length >= 1 && plan2.remove.every(i => i >= shorter.length), plan2.remove)
}

// ── The outline and the brief ─────────────────────────────────────────────
{
  const chapters = splitChapters(HEADED_DRAFT, 'headings').chapters.map((c, i) => ({
    id: `c${i + 1}`,
    position: i + 1,
    title: c.title,
    status: i < 3 ? 'working' : 'raw',
    word_count: c.words,
    summary: `Chapter ${i + 1} argues that ${SUBJECTS[i % 6]} is an impression. It then turns on the judgment. It lands on the ordinary week.`,
    argument: { thesis: `${SUBJECTS[i % 6]} is not the problem`, claims: ['one', 'two'], depends_on: [], open_questions: ['why now'] },
  }))
  const outline = buildOutline(chapters, 'c5')
  check('outline has one line per chapter', outline.split('\n').length === CHAPTERS)
  check('outline marks the current chapter', outline.includes('(this chapter)'))
  check('outline lines fit sixty tokens', outline.split('\n').every(l => estimateTokens(l) <= 62), Math.max(...outline.split('\n').map(estimateTokens)))
  const forty = [...chapters, ...chapters, ...chapters].map((c, i) => ({ ...c, id: `x${i}`, position: i + 1 }))
  check('a forty five chapter outline stays under 3,000 tokens', estimateTokens(buildOutline(forty)) < 3000, estimateTokens(buildOutline(forty)))

  const brief = buildBookBrief({
    title: 'The Ordinary Week',
    summary: 'x '.repeat(9000), // far over the cap
    argument: { thesis: 'The judgment is the thing.', through_line: 'From gutter to week.', open_questions: ['what about grief'] },
    chapters,
    currentChapterId: 'c5',
  })
  check('brief truncates the rolling summary to budget', estimateTokens(brief) < 2500 + 1200 + 800 + 600, estimateTokens(brief))
  check('brief names the neighbours', brief.includes('NEIGHBOURING CHAPTERS') && brief.includes('4. Chapter 4') && brief.includes('6. Chapter 6'))
  check('brief carries this chapter card', brief.includes('THIS CHAPTER'))
}

// ── Thread windowing ──────────────────────────────────────────────────────
{
  const draft = splitChapters(HEADED_DRAFT, 'headings').chapters[0].text
  const thread: ThreadMessage[] = [{ id: 'm0', role: 'user', content: 'Here is my fragment about the gutter.' }]
  for (let i = 1; i <= 80; i++) {
    if (i % 2 === 1) {
      thread.push({ id: `m${i}`, role: 'user', content: i % 10 === 5
        ? `<kyle-edit summary="kept 3, reverted 1"/>\nI went through it.\n\n<draft>\n${draft}\n</draft>`
        : `Turn ${i}: make the ${SUBJECTS[i % 6]} paragraph land harder. ${'Some more direction. '.repeat(60)}` })
    } else {
      thread.push({ id: `m${i}`, role: 'scribe', content: i % 8 === 0
        ? `Here is the full draft.\n\n<draft>\n${draft}\n</draft>\n\nLines that are mine: none.`
        : `Turn ${i}: done.\n\n<edit>\n<find>Paragraph ${i}</find>\n<replace>Paragraph ${i} revised</replace>\n</edit>\n\n${'Commentary on the change and the weakest claim. '.repeat(60)}`, draft_text: draft })
    }
  }
  thread.push({ id: 'm81', role: 'user', content: 'Now finish it.' })

  check('stripDraftBody replaces a hand revision with one line', !stripDraftBody(thread[5].content).includes('<draft>') && stripDraftBody(thread[5].content).includes('kept 3, reverted 1'))
  check('stripDraftBody removes an old style draft body', !stripDraftBody(thread[8].content).includes('Paragraph 1:') && stripDraftBody(thread[8].content).includes('Lines that are mine'))

  const win = windowThread(thread, { recentBudgetTokens: RECENT_TURNS_TOKENS, summaryThroughId: null })
  check('opening is pinned', win.opening?.content === 'Here is my fragment about the gutter.')
  check('recent turns fit the budget', win.tokens.recent <= RECENT_TURNS_TOKENS + 400, win.tokens.recent)
  check('something was folded', win.fold.length > 0 && win.foldThroughId !== null, win.fold.length)
  check('the last message is still last', win.recent[win.recent.length - 1].content === 'Now finish it.')
  check('no draft bodies in recent history', win.recent.every(m => !m.content.includes('<draft>')))
  check('recent history starts on a user turn or after a whole exchange', win.recent[0].role === 'user')

  // After a fold, the marker advances and the folded turns are not resent.
  const again = windowThread(thread, { recentBudgetTokens: RECENT_TURNS_TOKENS, summaryThroughId: win.foldThroughId })
  check('turns before the marker are not resent', again.fold.length === 0 && again.recent.length === win.recent.length, { fold: again.fold.length })

  // The whole-thread cost without windowing, for the record.
  const naive = thread.reduce((n, m) => n + estimateTokens(m.content), 0)
  check('windowing cuts the history by more than half', win.tokens.recent + win.tokens.opening < naive / 2, { naive, windowed: win.tokens.recent })
}

// ── The turn budget ───────────────────────────────────────────────────────
{
  const chapter = splitChapters(HEADED_DRAFT, 'headings').chapters[0].text
  const sixK = chunkDraft(chapter).slice(0, 18).map(c => c.content).join(' ') // about 6,000 words with overlap
  const report = budgetReport({
    system: 6500,
    exemplars: 4000,
    brief: 3000,
    threadSummary: 1500,
    history: RECENT_TURNS_TOKENS,
    workingDraft: estimateTokens(sixK),
  })
  check('a 6,000 word chapter turn is under the ceiling', report.over === 0 && report.total < TURN_BUDGET_TOKENS, report)
  const exemplars = fitExemplars([{ title: 'a', text: 'w '.repeat(6000) }, { title: 'b', text: 'w '.repeat(6000) }, { title: 'c', text: 'w '.repeat(6000) }])
  const exTokens = exemplars.reduce((n, e) => n + estimateTokens(e.text), 0)
  check('exemplars are capped at the voice budget', exTokens <= 4000 + 50 && exemplars.length >= 1, { exTokens, n: exemplars.length })
}

// ── Findings, claims and verdicts ─────────────────────────────────────────
{
  const reply = `Two gaps.\n\n1. The claim about the gutter is not grounded.\n\n\`\`\`json\n{"findings": [{"kind": "gap", "passage": "Paragraph 1000: the gutter hung there", "note": "No ground. A scene would do it.", "chapter_position": null}, {"kind": "cross_gap", "passage": "Paragraph 1001: the morning walk came back", "note": "Chapter 3 says the opposite.", "chapter_position": 3}]}\n\`\`\`\n`
  const f = parseFindings(reply)
  check('parses two findings', f.length === 2 && f[1].kind === 'cross_gap' && f[1].chapter_position === 3, f)
  check('strips the findings block from the commentary', !stripFindingsBlock(reply).includes('"findings"') && stripFindingsBlock(reply).includes('Two gaps'))
  check('no findings in a reply without a block', parseFindings('The argument holds.').length === 0)

  const claims = parseClaims('{"claims": [{"kind": "date", "claim": "Seneca died in 65 AD", "passage": "Seneca died in 65 AD, ordered by Nero.", "query": "Seneca death Nero", "figure": "Seneca"}]}')
  check('parses a claim', claims.length === 1 && claims[0].kind === 'date' && claims[0].figure === 'Seneca')

  const passages: PassageRef[] = [
    { chunk_id: 'p1', chunk_table: 'rag_corpus', content: 'Seneca was ordered by Nero to take his own life, and he opened his veins in the year sixty-five.', author: 'Tacitus', work: 'Annals', section_label: '15.62', translator: 'Church', text_type: 'primary', mode: 'quote' },
  ]
  const judged = parseJudgeResults(JSON.stringify({ results: [
    { claim: 'Seneca died in 65 AD', passage: 'x', verdict: 'supported', chunk_id: 'p1', excerpt: 'ordered by Nero to take his own life', note: 'Tacitus says so.' },
    { claim: 'Seneca was born in Rome', passage: 'y', verdict: 'contradicted', chunk_id: 'p1', excerpt: 'Seneca was born in Corduba in Spain', note: 'Not in the passage.' },
    { claim: 'Seneca taught Nero', passage: 'z', verdict: 'contradicted', chunk_id: 'p9', excerpt: 'anything', note: 'From memory.' },
    { claim: 'Seneca wrote in Greek', passage: 'w', verdict: 'unverifiable', chunk_id: null, excerpt: null, note: 'No passage.' },
  ] }))
  const v = verifyJudgeResults(judged, passages)
  check('a verdict with a real excerpt stands', v[0].verdict === 'supported' && v[0].evidence.length === 1 && !v[0].downgraded)
  check('an excerpt not in the chunk is downgraded', v[1].verdict === 'unverifiable' && v[1].downgraded && v[1].note.startsWith('Downgraded'))
  check('a chunk id that was not retrieved is downgraded', v[2].verdict === 'unverifiable' && v[2].downgraded)
  check('unverifiable passes through', v[3].verdict === 'unverifiable' && !v[3].downgraded)
}

// ── Commands ──────────────────────────────────────────────────────────────
{
  check('parses /rewrite', parseCommand('/rewrite')?.name === 'rewrite' && parseCommand('/rewrite')?.arg === null)
  check('parses /rewrite next', parseCommand('/rewrite next')?.arg === 'next')
  check('parses /gaps book', parseCommand('/gaps book')?.arg === 'book')
  check('parses /summarise', parseCommand('/summarise')?.name === 'summarize')
  check('ignores plain text', parseCommand('concede that point') === null)
  const p = commandPrompt({ name: 'rewrite', arg: 'next' }, { inBook: true, lastStop: 'He never fixed the gutter' })!
  check('rewrite next carries the stop point', p.includes('He never fixed the gutter') && p.startsWith('<command name="rewrite" arg="next"/>'))
  check('the command marker renders as the command', describeCommandTurn(p) === '/rewrite next')
  check('gaps outside a book has no search_book', !commandPrompt({ name: 'gaps', arg: null }, { inBook: false })!.includes('search_book'))
  check('gaps inside a book asks for search_book', commandPrompt({ name: 'gaps', arg: null }, { inBook: true })!.includes('search_book'))
  check('factcheck is not a chat turn', commandPrompt({ name: 'factcheck', arg: null }, { inBook: true }) === null)
  check('finds where a rewrite stopped', rewriteStopPoint('I stopped at the paragraph beginning "The board meeting waited" because the budget ran out.') === 'The board meeting waited')
}

// ── Shaping ───────────────────────────────────────────────────────────────
{
  const stream = ['First thought about the gutter.', 'Then the walk.', 'Back to the gutter, and the year.', 'A note on grief.', 'The walk again, resolved.'].map((s, i) => `${s} ${paragraph(700 + i, 2)}`).join('\n\n')
  const paras = numberParagraphs(stream)
  check('numbers five paragraphs', paras.length === 5 && paras[0].n === 1)
  const proposal = parseShape('```json\n{"form": "essay", "title": "The Gutter", "note": "Two threads.", "parts": [{"title": "The gutter", "thesis": "t", "lacks": "l", "paragraphs": [3, 1]}, {"title": "The walk", "thesis": "t2", "lacks": "l2", "paragraphs": [2, 5, 2]}]}\n```')!
  check('parses a shape proposal', proposal.form === 'essay' && proposal.parts.length === 2)
  const chapters = assembleShape(paras, proposal)
  check('shape reorders paragraphs as proposed', chapters[0].text.startsWith('Back to the gutter') && chapters[0].text.includes('First thought'))
  check('a paragraph listed twice is placed once', chapters[1].text.split('Then the walk').length === 2)
  check('a forgotten paragraph lands in Unplaced', chapters[2]?.title === 'Unplaced' && chapters[2].text.startsWith('A note on grief'))
  const all = chapters.reduce((n, c) => n + c.words, 0)
  check('shaping loses no words', all === countWords(stream), { all, expected: countWords(stream) })
}

// ── The prompts carry no dashes ───────────────────────────────────────────
{
  const texts = Object.entries(prompts)
    .map(([k, v]) => [k, typeof v === 'function' ? (v as (a: string | null) => string)('a heading') : String(v)] as const)
  const bad = texts.filter(([, t]) => /[–—]/.test(t)).map(([k]) => k)
  check('no em or en dashes in any book prompt', bad.length === 0, bad)
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
