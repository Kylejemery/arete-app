# A sample Enchiridion

What the typesetter produces, so the output can be judged without running
anything. Nothing here is read at runtime. These files are a reference for
review and for talking to a printer.

| File | What it is |
|---|---|
| `sample-interior.pdf` | The book block, 32 pages at 5 by 8 inches |
| `sample-cover.pdf` | The paperback wrap: back, spine and front, with bleed |
| `title-page.png` | The title page |
| `chapter-opening.png` | A chapter opening on a recto, with its first entries |
| `body-page.png` | A verso, showing quote rules and a page break |

## Where it comes from

None of this is a real member's writing. It is generated from the fixture in
`server/scripts/verify-enchiridion-pdf.js`, which was built to use exactly
the markdown shapes `server/enchiridion-agent.js` emits: journal entries with
their prompts and dates, beliefs shown before and after refinement, Cabinet
exchanges with each counselor named, numbered precepts, goals with their
status, and corpus passages with translator and edition. The prose is
invented in the register the real thing aims at.

Regenerate with:

```
cd server
node scripts/verify-enchiridion-pdf.js ../docs/enchiridion
```

That writes `interior.pdf` and `cover.pdf`, which were renamed with the
`sample-` prefix here, and it exits non-zero if any structural check fails.
The page images were rendered from the interior at 1.5x.

## What to look at

The interior is where the work is. Worth checking:

- Every chapter opens on a right-hand page, with a blank verso inserted when
  the previous chapter ended on one.
- Running heads name the book on the left page and the chapter on the right,
  and chapter openings carry none.
- Folios skip the front matter, so the first chapter page is 1. A blank page
  still counts in the pagination without printing a number.
- A quote and the date beneath it stay together across a page break, and keep
  one continuous rule rather than splintering.
- No single line is stranded at the top or bottom of a page.
- Apostrophes and quotation marks are typographic, not the straight ones a
  phone keyboard produces.
- The page count is a multiple of four, because that is how signatures fold.

The cover's spine is measured from the page count times the paper caliper, so
it is only correct for a book of this length on the stock configured in
`agent_config`. At 32 pages the spine is about a tenth of an inch, which is
below the quarter inch any vendor will print type on, so it is deliberately
left bare here. Confirm the caliper against your printer before ordering.
