// The working draft as a Word document. Scribe's drafts are plain prose with a
// little markdown (headings, a blockquote for a corpus passage, the odd list,
// *emphasis*, [YOUR TURN: ...] gaps); parseProse already turns that into
// blocks for the draft pane, so the same blocks become Word paragraphs here.
// Nothing about the hand-retype gate changes: the file carries the standing
// "Developed with Arete" note, same as the clipboard export.
//
// Loaded on demand from the chat page (dynamic import), so the docx library is
// never in the page bundle until the first export.

import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  Footer,
  HeadingLevel,
  LevelFormat,
  PageNumber,
  Paragraph,
  TextRun,
} from 'docx'
import { parseInline, parseProse } from './prose'
import type { Trim } from './book'
import { DEVELOPED_WITH_ARETE } from './attribution'

const NUMBERING = 'scribe-numbered'

// `italics` sets the whole run italic (a block quote); the segment's own
// emphasis still applies on top.
function runs(text: string, italics = false): TextRun[] {
  return parseInline(text).map(seg => {
    switch (seg.type) {
      case 'strong':
        return new TextRun({ text: seg.text, bold: true, italics })
      case 'em':
        return new TextRun({ text: seg.text, italics: true })
      case 'gap':
        return new TextRun({ text: `[${seg.text}]`, italics: true, highlight: 'yellow' })
      default:
        return new TextRun({ text: seg.text, italics })
    }
  })
}

const rule = () =>
  new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA', space: 1 } },
    spacing: { before: 200, after: 200 },
  })

export function buildDraftDocument(title: string | null, markdown: string): Document {
  const children: Paragraph[] = []
  if (title?.trim()) {
    children.push(new Paragraph({ text: title.trim(), heading: HeadingLevel.TITLE }))
  }

  let listInstance = 0
  for (const b of parseProse(markdown)) {
    switch (b.type) {
      case 'h1':
        children.push(new Paragraph({ children: runs(b.text), heading: HeadingLevel.HEADING_1 }))
        break
      case 'h2':
        children.push(new Paragraph({ children: runs(b.text), heading: HeadingLevel.HEADING_2 }))
        break
      case 'h3':
        children.push(new Paragraph({ children: runs(b.text), heading: HeadingLevel.HEADING_3 }))
        break
      case 'quote':
        children.push(
          new Paragraph({
            children: runs(b.text, true),
            indent: { left: 720 },
            spacing: { after: 200 },
          })
        )
        break
      case 'list':
        listInstance++
        for (const item of b.items) {
          children.push(
            new Paragraph({
              children: runs(item),
              ...(b.ordered
                ? { numbering: { reference: NUMBERING, level: 0, instance: listInstance } }
                : { bullet: { level: 0 } }),
              spacing: { after: 80 },
            })
          )
        }
        break
      case 'hr':
        children.push(rule())
        break
      default:
        children.push(new Paragraph({ children: runs(b.text), spacing: { after: 200 } }))
    }
  }

  children.push(rule())
  children.push(
    new Paragraph({
      children: [new TextRun({ text: DEVELOPED_WITH_ARETE.replace(/^\*|\*$/g, ''), italics: true })],
    })
  )

  return new Document({
    creator: 'Arete Scribe',
    title: title ?? 'Working draft',
    styles: {
      default: {
        document: { run: { font: 'Georgia', size: 24 }, paragraph: { spacing: { line: 336 } } },
      },
    },
    numbering: {
      config: [
        {
          reference: NUMBERING,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  })
}

export function docxFilename(title: string | null): string {
  const base = (title ?? 'working-draft')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'working-draft'}.docx`
}

// The draft as a book interior, ready to upload to a print-on-demand service:
// the page is the trim size, a chapter (# heading) starts a new page with its
// number above the title, body paragraphs are indented the way printed prose
// is rather than spaced apart, and every page is numbered at the foot.
//
// Margins are 0.75 in on every side. That clears the inside-margin minimum KDP
// sets for books of up to 700 pages, which is why they are not mirrored; the
// docx library has no switch for mirrored margins.
export function buildBookDocument(title: string | null, markdown: string, trim: Trim): Document {
  const children: Paragraph[] = []
  const indent = { firstLine: convertInchesToTwip(0.3) }

  if (title?.trim()) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: title.trim(), size: 40 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: convertInchesToTwip(2.2) },
      })
    )
  }

  let chapter = 0
  // The first paragraph after a heading is set flush, as in print.
  let flush = true
  let listInstance = 0
  for (const b of parseProse(markdown)) {
    switch (b.type) {
      case 'h1':
        chapter++
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `CHAPTER ${chapter}`, size: 18, characterSpacing: 40 })],
            alignment: AlignmentType.CENTER,
            pageBreakBefore: true,
            spacing: { before: convertInchesToTwip(1.4), after: 160 },
          }),
          new Paragraph({
            children: runs(b.text),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: convertInchesToTwip(0.5) },
          })
        )
        flush = true
        break
      case 'h2':
      case 'h3':
        children.push(
          new Paragraph({
            children: runs(b.text),
            heading: b.type === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            spacing: { before: 280, after: 120 },
            keepNext: true,
          })
        )
        flush = true
        break
      case 'quote':
        children.push(
          new Paragraph({
            children: runs(b.text, true),
            indent: { left: convertInchesToTwip(0.4), right: convertInchesToTwip(0.4) },
            spacing: { before: 120, after: 120 },
          })
        )
        flush = true
        break
      case 'list':
        listInstance++
        for (const item of b.items) {
          children.push(
            new Paragraph({
              children: runs(item),
              ...(b.ordered
                ? { numbering: { reference: NUMBERING, level: 0, instance: listInstance } }
                : { bullet: { level: 0 } }),
              spacing: { after: 60 },
            })
          )
        }
        flush = true
        break
      case 'hr':
        children.push(new Paragraph({ text: '*', alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }))
        flush = true
        break
      default:
        children.push(new Paragraph({ children: runs(b.text), ...(flush ? {} : { indent }) }))
        flush = false
    }
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: DEVELOPED_WITH_ARETE.replace(/^\*|\*$/g, ''), italics: true, size: 18 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    })
  )

  const margin = convertInchesToTwip(0.75)
  return new Document({
    creator: 'Arete Scribe',
    title: title ?? 'Book',
    styles: {
      default: {
        document: { run: { font: 'Georgia', size: 22 }, paragraph: { spacing: { line: 300 } } },
        heading1: { run: { font: 'Georgia', size: 32 } },
        heading2: { run: { font: 'Georgia', size: 24, bold: true } },
        heading3: { run: { font: 'Georgia', size: 22, italics: true } },
      },
    },
    numbering: {
      config: [
        {
          reference: NUMBERING,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertInchesToTwip(trim.width), height: convertInchesToTwip(trim.height) },
            margin: { top: margin, bottom: margin, left: margin, right: margin, footer: convertInchesToTwip(0.4) },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
}

export function bookFilename(title: string | null, trim: Trim): string {
  return docxFilename(title).replace(/\.docx$/, `-book-${trim.id}.docx`)
}
