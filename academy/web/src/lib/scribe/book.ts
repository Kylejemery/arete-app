// The draft as a printed book: pages of a real trim size, chapters that start
// on a fresh page, and a page count Kyle can plan the whole book against.
//
// A page is a word budget, not a measured box. Screen type and print type never
// agree on where a line wraps, so measuring the pane would give a page count
// that changes with the window; words per page is what publishers estimate
// with, and it moves only when the text does. The figures are the usual ones
// for a trade paperback in an 11pt book face: 6x9 holds about 300 words, the
// smaller trims less.
//
// A chapter is a level-one heading (# Title). It always opens a new page and
// takes the top third of it, as a chapter opener does in print. Section
// headings (## and ###) cost a few lines and are never left alone at the foot
// of a page.

import { parseInline, parseProse, type Block } from './prose'

export type TrimId = '5x8' | '5.5x8.5' | '6x9'

export interface Trim {
  id: TrimId
  label: string
  wordsPerPage: number
  /** Page size in inches, for the book export. */
  width: number
  height: number
}

export const TRIMS: Trim[] = [
  { id: '5x8', label: '5 × 8 in', wordsPerPage: 250, width: 5, height: 8 },
  { id: '5.5x8.5', label: '5.5 × 8.5 in', wordsPerPage: 275, width: 5.5, height: 8.5 },
  { id: '6x9', label: '6 × 9 in', wordsPerPage: 300, width: 6, height: 9 },
]

export const DEFAULT_TRIM: TrimId = '6x9'

export function trimById(id: string | null | undefined): Trim {
  return TRIMS.find(t => t.id === id) ?? TRIMS.find(t => t.id === DEFAULT_TRIM)!
}

// What a heading or rule takes out of a page, in words of body text.
const CHAPTER_OPENER_SHARE = 0.3
const SECTION_HEADING_COST = 25
const RULE_COST = 15
// A section heading needs this much room under it or it moves to the next page.
const KEEP_WITH_NEXT = 40
// A paragraph is not split to leave fewer words than this on either page.
const MIN_SPLIT_WORDS = 15

export function countWords(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

function blockWords(b: Block): number {
  if (b.type === 'hr') return 0
  if (b.type === 'list') return b.items.reduce((n, it) => n + countWords(it), 0)
  return countWords(b.text)
}

/** One block, or one piece of a paragraph that runs across a page break. */
export interface PageItem {
  blockIndex: number
  block: Block
  /** Set when the paragraph is split: the words of it on this page. */
  part?: {
    text: string
    /** Offset of this piece in the block's rendered (markup-free) text. */
    plainOffset: number
    continues: boolean
  }
}

export interface BookPage {
  number: number
  items: PageItem[]
  /** Set on a chapter's opening page. */
  chapter?: { number: number; title: string }
}

export interface Chapter {
  number: number
  title: string
  startPage: number
  endPage: number
  words: number
}

export interface BookLayout {
  pages: BookPage[]
  chapters: Chapter[]
  words: number
}

// A split must not fall inside *emphasis* or a [bracketed marker], or the two
// halves would each render the markup as literal characters.
function safeSplit(words: string[], want: number): number {
  const ok = (k: number) => {
    const head = words.slice(0, k).join(' ')
    const stars = (head.match(/\*/g) ?? []).length
    const open = (head.match(/\[/g) ?? []).length
    const close = (head.match(/\]/g) ?? []).length
    return stars % 2 === 0 && open === close
  }
  for (let k = want; k >= MIN_SPLIT_WORDS; k--) if (ok(k)) return k
  return 0
}

const plainLength = (text: string) => parseInline(text).reduce((n, s) => n + s.text.length, 0)

export function paginate(markdown: string, wordsPerPage: number): BookLayout {
  const blocks = parseProse(markdown)
  const pages: BookPage[] = []
  const chapters: Chapter[] = []
  let page: BookPage = { number: 1, items: [] }
  let used = 0
  let words = 0

  const newPage = () => {
    if (page.items.length) pages.push(page)
    page = { number: pages.length + 1, items: [] }
    used = 0
  }
  const room = () => wordsPerPage - used

  blocks.forEach((b, blockIndex) => {
    const w = blockWords(b)
    words += w

    if (b.type === 'h1') {
      newPage()
      const chapter = { number: chapters.length + 1, title: b.text }
      page.chapter = chapter
      chapters.push({ ...chapter, startPage: page.number, endPage: page.number, words: w })
      page.items.push({ blockIndex, block: b })
      used = Math.round(wordsPerPage * CHAPTER_OPENER_SHARE)
      return
    }

    if (chapters.length) chapters[chapters.length - 1].words += w

    if (b.type === 'h2' || b.type === 'h3') {
      if (used > 0 && room() < SECTION_HEADING_COST + KEEP_WITH_NEXT) newPage()
      page.items.push({ blockIndex, block: b })
      used += SECTION_HEADING_COST
      return
    }

    if (b.type === 'hr') {
      if (room() < RULE_COST) newPage()
      page.items.push({ blockIndex, block: b })
      used += RULE_COST
      return
    }

    if (b.type === 'list') {
      if (used > 0 && w > room()) newPage()
      page.items.push({ blockIndex, block: b })
      used += w
      return
    }

    // A paragraph or a quotation: fill the page, carry the rest over.
    if (w <= room()) {
      page.items.push({ blockIndex, block: b })
      used += w
      return
    }

    // Work in word positions over the paragraph's own text, so each piece is
    // an exact slice of it (double spaces and all) and its offset into the
    // rendered paragraph is exact.
    const spans = [...b.text.matchAll(/\S+/g)].map(m => [m.index!, m.index! + m[0].length] as const)
    const all = spans.map(([a, z]) => b.text.slice(a, z))
    let at = 0
    let first = true
    while (at < all.length) {
      const rest = all.slice(at)
      const fits = room()
      let take = rest.length <= fits ? rest.length : safeSplit(rest, fits)
      if (take && rest.length - take < MIN_SPLIT_WORDS && rest.length > fits) take = 0
      if (!take) {
        if (used > 0) { newPage(); continue }
        // A fresh page and still too long: split, but leave the next page
        // more than a stub.
        take = rest.length <= fits
          ? rest.length
          : (safeSplit(rest, Math.min(fits, rest.length - MIN_SPLIT_WORDS)) || fits)
      }
      const from = spans[at][0]
      const to = spans[at + take - 1][1]
      at += take
      if (first && at >= all.length) page.items.push({ blockIndex, block: b })
      else page.items.push({
        blockIndex,
        block: b,
        part: { text: b.text.slice(from, to), plainOffset: plainLength(b.text.slice(0, from)), continues: at < all.length },
      })
      first = false
      used += take
      if (at < all.length) newPage()
    }
  })

  if (page.items.length || !pages.length) pages.push(page)
  for (let i = 0; i < chapters.length; i++) {
    chapters[i].endPage = i + 1 < chapters.length ? chapters[i + 1].startPage - 1 : pages.length
  }
  return { pages, chapters, words }
}

// Scribe's working marks. A final draft should have none of them left.
const MARKERS: { label: string; re: RegExp }[] = [
  { label: 'YOUR TURN', re: /\[YOUR TURN\b/gi },
  { label: 'SCRIBE', re: /\[SCRIBE\b/gi },
  { label: 'VERIFY', re: /\[VERIFY\]/gi },
  { label: 'MOVE?', re: /\[MOVE\?\]/gi },
  { label: 'CUT?', re: /\[CUT\?\]/gi },
]

export function openMarkers(markdown: string): { label: string; count: number }[] {
  return MARKERS
    .map(m => ({ label: m.label, count: (markdown.match(m.re) ?? []).length }))
    .filter(m => m.count > 0)
}
