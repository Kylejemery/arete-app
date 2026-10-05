# Admission: Roger L'Estrange, *Seneca's Life and Death*, 2026-10-05

Not an arrival but a refiling. The first sixteen rows of `Seneca / Morals`
(Project Gutenberg #56075, *Seneca's Morals of a Happy Life, Benefits, Anger
and Clemency*, "Translated by SIR ROGER L'ESTRANGE. New Edition. Chicago:
Belford, Clarke & Co., 1882") are not Seneca. They are L'Estrange's own
prefatory matter, and they were live `primary` rows under Seneca's name, so the
counselor post-filter, which keeps the asked author's primary rows, could put
L'Estrange's words in Seneca's mouth.

The September precedent (`20260903165348_deprecate_front_matter_and_licence.sql`)
deprecated translators' prefaces and notes rather than relabelling them as
scholarship under the philosopher's name, and said such material belongs under
its own author through the Part 4 tests. So both halves were tested.

| Rows (old `chunk_index`) | Text | Decision |
| --- | --- | --- |
| 0 | Gutenberg header and title page (about 240 words), then the start of "TO THE READER" | With the preface: deprecated |
| 1–9 | "TO THE READER", L'Estrange's preface | Deprecated, under L'Estrange |
| 10 | Last 117 words of the preface, then "SENECA'S LIFE AND DEATH" (283 words) | With the life, by majority |
| 11–15 | "SENECA'S LIFE AND DEATH" | **Admitted**, scholarship, renumbered 0–5 |
| 16 | Last 182 words of the life, then *Of Benefits* I (218 words) | Stays Seneca, by majority |

Applied by `20261005172705_lestrange_seneca_life_refiled.sql`, verified by query
the same day: 6 live `scholarship` rows under author `Roger L'Estrange`, work
`Seneca's Life and Death`; 10 deprecated preface rows under the same author;
307 live `Seneca / Morals` rows from `chunk_index` 16; the shelf cache
refreshed. Row ids are unchanged, so the three Stoic QCA evidence excerpts in
the life still resolve.

## *Seneca's Life and Death*: admitted

About 2,160 words. L'Estrange (1616–1704) wrote it for *Seneca's Morals by Way
of Abstract* (1678). Much of it is his English of Tacitus, *Annals* 15.60–64,
quoted as Tacitus, with Dio for Seneca's money.

1. **Provenance.** Pass. Named author, dated edition, Gutenberg #56075.
2. **Argues or asserts.** Pass, as testimony. It is a life, not an argument,
   which is the *states* role the question map keeps for doxography and
   summary. Where it takes a side (Seneca's integrity) it sets the evidence
   against him beside it, which is what makes it useful.
3. **A cell in the question map.**
   - Q13, *complicates*: Seneca as a man who lived his doctrine (the nightly
     self-examination, the offer to hand his fortune back to Nero, the death)
     beside a fortune of "incredible sums", the greater part "the bounty of
     his prince", which "drew an envy upon him".
   - Q14, *states*: philosophy shown as conduct, to the last, when he asks
     his friends where all their philosophy is now.
4. **Does the corpus need it.** Pass. The corpus holds no Tacitus, Suetonius
   or Dio. This is its only narrative of Seneca's fall and death, and the
   Stoic QCA evidence already cites it for Seneca's POW, ADV and CONS.
5. **Chunks well.** Pass. Narrative in short episodes; six chunks.
6. **Legal form.** Public domain: written 1678, this printing 1882.
   `license_status = 'public_domain_us'`.
7. **A commitment that will leak.** Yes, and fenced. L'Estrange frames
   Seneca in a Christian register ("since it is God's will, I do not only
   obey, but assent to it" is Seneca's own words, but the surrounding praise
   of his "piety" is L'Estrange's). As scholarship under its own author it no
   longer passes the counselor post-filter as Seneca.
8. **True in ten years.** Not an empirical claim.

Metadata as on the other scholarship works: `translator = 'original'`,
`edition_year = 1882`, `source_url` the Gutenberg page, `edition` the title
page, `quotable_on_air = false`, `locator` null (the life has no divisions).

## "To the Reader": not admitted

About 3,900 words. Fails tests 2 to 4.

- **2 and 3.** Most of it is L'Estrange explaining why he made an abstract of
  Seneca rather than a translation. That is a fact about the edition, which
  belongs in metadata, not in retrieval. Its one argument is Augustine's: a
  long quotation of Seneca's lost *On Superstition* and Augustine's verdict
  that Seneca "worshipped what he reproved, acted what he disliked, and
  adored what he condemned".
- **4.** The corpus already holds that argument from Augustine himself
  (*City of God* 6.10, Dods).

Deprecated, not deleted, and filed under L'Estrange as work `To the Reader
(preface to Seneca's Morals)`, so that even the deprecated rows stop crediting
Seneca. Reversible: setting `deprecated = false` restores it.

## For Kyle

Two judgement calls, both reversible:

1. Admitting the life rather than deprecating it with the preface. The case
   for admitting is that it is the corpus's only account of Seneca's death.
2. Deprecating the preface. Its method note matters for reading the *Morals*:
   **L'Estrange says his *Morals* is an abstract, not a translation.** The 307
   rows still under `Seneca / Morals` are therefore his digest of Seneca, not
   Seneca's text. They are untouched here, with no `translator`, which is a
   separate decision: whether an abstract should stay in the `primary` layer
   at all.
