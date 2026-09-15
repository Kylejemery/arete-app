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
  Document,
  HeadingLevel,
  LevelFormat,
  Paragraph,
  TextRun,
} from 'docx'
import { parseInline, parseProse } from './prose'
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
