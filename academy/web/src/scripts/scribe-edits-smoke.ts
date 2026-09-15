// Offline checks for Scribe's in-place edit protocol, the formatting actions
// behind the draft editors, and the Word export builder. No network, no tokens.
// Run: npx tsx src/scripts/scribe-edits-smoke.ts

import { Packer } from 'docx'
import {
  applyEdits,
  countEditBlocks,
  describeFailures,
  locateEdit,
  parseEdits,
  resolveTurnDraft,
  stripEdits,
} from '../lib/scribe/edits'
import { applyFormat } from '../lib/scribe/format'
import { buildDraftDocument, docxFilename } from '../lib/scribe/docx-export'
import { extractSnapshotIntent, withWorkingDraft } from '../lib/scribe/chat'

let pass = 0
let fail = 0
function check(name: string, ok: unknown, detail?: unknown) {
  if (ok) pass++
  else {
    fail++
    console.log(`FAIL ${name}`, detail ?? '')
  }
}

const DRAFT = `# The gutter

He never fixed the gutter. It hung there for a year, and every rain reminded him.

The Stoics would call this an impression: the gutter is not the problem, the judgment about the gutter is.

> "Men are disturbed not by things, but by the views which they take of things."

He knows this. He has known it for a year.`

// ── Parsing ──────────────────────────────────────────────────────────────────
const turn = `Two changes: the impression line was doing too much, and the ending needed a turn.

<edit>
<find>The Stoics would call this an impression: the gutter is not the problem, the judgment about the gutter is.</find>
<replace>The Stoics have a word for the thing that hung there: an impression. The gutter was never the problem.</replace>
</edit>

<edit>
<find>He knows this. He has known it for a year.</find>
<replace>He knows this. He has known it for a year, which is the same year the gutter has hung there.</replace>
</edit>

Lines that are mine: the second sentence of the new impression line.`

const edits = parseEdits(turn)
check('parses two edit blocks', edits.length === 2, edits)
check('find is verbatim, tag newlines stripped', edits[0].find === 'The Stoics would call this an impression: the gutter is not the problem, the judgment about the gutter is.')
check('counts opened blocks mid-stream', countEditBlocks(turn.slice(0, turn.indexOf('</edit>') + 7)) === 1)
check('stripEdits leaves the commentary only', !stripEdits(turn).includes('<find>') && stripEdits(turn).includes('Lines that are mine'))
check('stripEdits drops an unfinished trailing block', !stripEdits('Note.\n\n<edit>\n<find>partial').includes('<edit>'))

// ── Applying ─────────────────────────────────────────────────────────────────
const applied = applyEdits(DRAFT, edits)
check('both edits applied', applied.applied === 2 && applied.failed.length === 0, applied.failed)
check('replacement landed', applied.draft.includes('The Stoics have a word for the thing that hung there'))
check('untouched text is byte-identical', applied.draft.startsWith('# The gutter\n\nHe never fixed the gutter.') && applied.draft.includes('> "Men are disturbed'))
check('ending extended', applied.draft.endsWith('the same year the gutter has hung there.'))

const loose = applyEdits(DRAFT, [{ find: '"Men are disturbed not by things,  but by the views which they take of things."', replace: '"Men are disturbed not by things but by their opinions about them."' }])
check('loose match tolerates quotes and whitespace', loose.applied === 1 && loose.draft.includes('> "Men are disturbed not by things but by their opinions about them."'), loose)

const cut = applyEdits(DRAFT, [{ find: 'It hung there for a year, and every rain reminded him.', replace: '' }])
check('a cut closes the gap', cut.draft.includes('He never fixed the gutter.\n\nThe Stoics'), JSON.stringify(cut.draft.slice(0, 60)))

const cutPara = applyEdits(DRAFT, [{ find: '> "Men are disturbed not by things, but by the views which they take of things."', replace: '' }])
check('a cut paragraph leaves no triple newline', !/\n{3,}/.test(cutPara.draft))

const missing = applyEdits(DRAFT, [{ find: 'a sentence that was never there', replace: 'x' }, { find: '', replace: 'y' }])
check('a missing find is reported, not guessed', missing.applied === 0 && missing.failed.length === 2 && missing.draft === DRAFT, missing.failed)
check('failure note names the passage', describeFailures(missing.failed).includes('"a sentence that was never there"'))
check('no failures, no note', describeFailures([]) === '')

check('locate returns null on empty needle', locateEdit(DRAFT, '') === null)

// ── Resolving a turn ─────────────────────────────────────────────────────────
const full = resolveTurnDraft('Here it is.\n\n<draft>\nNew essay.\n</draft>', DRAFT)
check('a complete draft wins', full.mode === 'full' && full.draft === 'New essay.')
const viaEdits = resolveTurnDraft(turn, DRAFT)
check('edits resolve against the working draft', viaEdits.mode === 'edits' && viaEdits.draft === applied.draft)
const none = resolveTurnDraft('Nothing to change; the weakest claim is still the second paragraph.', DRAFT)
check('no draft, no edits: nothing changed', none.mode === 'none' && none.draft === null)
const noBase = resolveTurnDraft(turn, null)
check('edits with no working draft all fail', noBase.mode === 'edits' && noBase.applied === 0 && noBase.failed.length === 2)

check('snapshot marker with edits uses the resolved draft', extractSnapshotIntent('<snapshot stage="middle"/>\n' + turn, applied.draft)?.draft_text === applied.draft)
check('snapshot marker with a full draft uses that draft', extractSnapshotIntent('<snapshot stage="full"/>\n<draft>\nX\n</draft>', 'other')?.draft_text === 'X')
check('snapshot marker with nothing to capture is null', extractSnapshotIntent('<snapshot stage="middle"/>', null) === null)

const injected = withWorkingDraft('Cut the last line.', DRAFT)
check('working draft rides at the end of the message', injected.endsWith(`<working_draft>\n${DRAFT}\n</working_draft>`) && injected.startsWith('Cut the last line.'))
check('working draft is not injected twice', withWorkingDraft(injected, DRAFT) === injected)
check('no working draft, message unchanged', withWorkingDraft('Start.', null) === 'Start.')

// ── Formatting ───────────────────────────────────────────────────────────────
const b = applyFormat('the gutter', 4, 10, 'bold')
check('bold wraps the selection', b.text === 'the **gutter**' && b.selStart === 6 && b.selEnd === 12, b)
check('bold toggles off', applyFormat(b.text, b.selStart, b.selEnd, 'bold').text === 'the gutter')
const i = applyFormat('plain', 0, 0, 'italic')
check('italic with no selection inserts a placeholder', i.text.startsWith('*emphasis*'), i)
const h = applyFormat('one\ntwo\nthree', 4, 7, 'h2')
check('heading prefixes the selected line', h.text === 'one\n## two\nthree', h)
check('heading toggles off', applyFormat(h.text, h.selStart, h.selEnd, 'h2').text === 'one\ntwo\nthree')
check('heading replaces a quote prefix', applyFormat('> quoted', 0, 3, 'h1').text === '# quoted')
const n = applyFormat('a\nb\nc', 0, 5, 'numbers')
check('numbered list numbers each line', n.text === '1. a\n2. b\n3. c', n)
check('plain strips list markers', applyFormat(n.text, 0, n.text.length, 'plain').text === 'a\nb\nc')
const r = applyFormat('before\nafter', 6, 6, 'rule')
check('rule sits on its own line', r.text === 'before\n\n---\n\nafter', JSON.stringify(r.text))
const g = applyFormat('say it here', 4, 6, 'gap')
check('gap wraps the selection as YOUR TURN', g.text === 'say [YOUR TURN: it] here' && g.text.slice(g.selStart, g.selEnd) === 'it', g)

// ── Word export ──────────────────────────────────────────────────────────────
async function main() {
  const doc = buildDraftDocument('The Gutter', DRAFT + '\n\n- one\n- two\n\n1. first\n2. second\n\n---\n\nEnd with a [YOUR TURN: scene] gap and *emphasis*.')
  const buf = await Packer.toBuffer(doc)
  check('docx is a zip (PK header)', buf[0] === 0x50 && buf[1] === 0x4b, buf.slice(0, 4))
  check('docx has a body', buf.length > 2000, buf.length)
  check('filename is slugged', docxFilename('The Gutter: a year') === 'the-gutter-a-year.docx')
  check('filename falls back', docxFilename(null) === 'working-draft.docx')
  console.log(`${pass} passed, ${fail} failed`)
  if (fail) process.exit(1)
}
main()
