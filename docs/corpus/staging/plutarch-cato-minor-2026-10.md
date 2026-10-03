# Staging review: plutarch-cato-minor-2026-10

Generated 2026-10-03T14:00:06.143Z by `academy/corpus-ingestion/pd-ingest/report.js`. Approve a source by setting its
`corpus_staging_sources.status` to `approved`; `node pd-ingest/promote.js --slug <slug>` then moves it into `rag_corpus`.

## Staged

### Plutarch, *Life of Cato the Younger* — `plutarch-cato-minor-perrin-1919`

| | |
| --- | --- |
| Status | **staged** |
| Tier / text_type / language | 1 / primary / english |
| Translator, edition | Bernadotte Perrin; Loeb Classical Library 100 (Plutarch's Lives, vol. VIII) (1919) |
| quotable_on_air | true |
| Source | https://github.com/PerseusDL/canonical-greekLit/blob/bcc5df0602f3b3fe6fefe1e1d575602a25ab1db6/data/tlg0007/tlg050/tlg0007.tlg050.perseus-eng2.xml |
| Retrieved / raw sha256 | 2026-10-03T13:52:00+00:00 / `92f47222c81ca8ce…` |
| Words / chunks / notes | 25,457 / 103 / 77 |

**License evidence**

> Bernadotte Perrin, tr., Plutarch's Lives, vol. VIII (Sertorius and Eumenes, Phocion and Cato the Younger), Loeb Classical Library 100. Cambridge, MA: Harvard University Press; London: William Heinemann Ltd., 1919. Published in 1919, before 1931: public domain in the United States. The text is the Perseus Digital Library's digitisation (urn:cts:greekLit:tlg0007.tlg050.perseus-eng2, Trustees of Tufts University), whose TEI header reads: "Available under a Creative Commons Attribution-ShareAlike 4.0 International License". That license covers Perseus's encoding; the 1919 translation it carries is public domain. Attribution: Perseus Digital Library, Tufts University.

**Cleaning problems**

- From the Perseus TEI: Perrin's footnotes (<note>, 77 with text) leave the body and are staged as note chunks linked to their passage; one empty <note/> is dropped with the stray "72" before it (see parse.fixes). The TEI keeps quotations as <q> markup without the printed quotation marks, so the marks are supplied from that markup (“…”, ‘…’ inside a quotation; a speech running on into the next section is left open, as in print). Verse lines are joined with " / ". Perseus's chapter and section numbers are Perrin's. Nothing in Perrin's wording is changed.
- fix: stray "72" before an empty note (58.7, "Caesar was in possession of their camps,") (1×)
- 1 empty <note/> dropped (no note text in the TEI)

**Question map on promotion**

- Q10 (complicates): Cato is the Stoic who goes into politics and will not bend in it: he trains for public speech as a philosopher (4.1–2), fights bribery and Caesar, and loses the consulship rather than change his manners (49–50). Plutarch counts the cost: judged by results, Cato was "wholly wrong" to refuse Pompey's marriage alliance, which drove Pompey to Caesar (30.6), and Cicero faults him for not courting the people when the state needed him (50.2).
- Q13 (complicates): The Roman candidate for the Stoic sage, drawn by a Platonist who admires him: steadfast from childhood, indifferent to heat, cold, office and death, yet seen to show "more passion than philosophy" at his brother's death (11.2), and vehement and inflexible where flexibility would have served. The Life presses the question of whether such a man is a sage or a magnificent extremist.
- Q14 (states): Philosophy as a way of life lived in public office: Cato studies with Antipater of Tyre (4.1), hardens his body to heat and cold and walks while his friends ride (5.3, 9.3), brings the Stoic Athenodorus back to his camp and keeps philosophers about him (10, 57), and on his last night argues the Stoic paradox that the good man alone is free and reads Plato's dialogue On the Soul twice before taking his life (67–68).
- Q05 (complicates): Cato is famed for firmness against pleasures and fears, yet grieves for Caepio with lamentation and a costly funeral; Plutarch defends the grief as tenderness mingled with inflexibility rather than a lapse (11.2–3), so the Stoic ideal of freedom from passion meets a case its admirers would not call a fault.

**Three chunks at random**

*Plut. Cat. Min. 54.1–4*, 267 words:

> When Cato was dispatched to Asia, that he might help those who were collecting transports and soldiers there, he took with him Servilia his sister and her young child by Lucullus. For Servilia had followed Cato, now that she was a widow, and had put an end to much of the evil report about her dissolute conduct by submitting to Cato’s guardianship and sharing his wanderings and his ways of life of her own accord.
> 
> But Caesar did not spare abuse of Cato even on the score of his relations with Servilia.
> 
> Now, in other ways, as it would seem, Pompey’s commanders in Asia had no need of Cato, and therefore, after persuading Rhodes into allegiance, he left Servilia and her child there, and returned to Pompey, who now had a splendid naval and military force assembled.
> 
> Here, indeed, and most clearly, Pompey was thought to have made his opinion of Cato manifest. For he determined to put the command of his fleet into the hands of Cato, and there were no less than five hundred fighting ships, besides Liburnian craft, look-out ships, and open boats in great numbers.
> 
> But he soon perceived, or was shown by his friends, that the one chief object of Cato’s public services was the liberty of his country, and that if he should be made master of so large a force, the very day of Caesar’s defeat would find Cato demanding that Pompey also lay down his arms and obey the laws. Pompey therefore changed his mind, although he had already conferred with Cato about the matter, and appointed Bibulus admiral.

*Plut. Cat. Min. 31.1–4*, 285 words:

> These things, however, were still in the future. Meanwhile Lucullus got into a contention with Pompey over the arrangements in Pontus (each of them, namely, demanded that his own proceedings should be confirmed), Cato came to the aid of Lucullus, who was manifestly wronged, and Pompey, worsted in the senate and seeking popular favour, invited the soldiery to a distribution of land.
> 
> But when Cato opposed him in this measure also, and frustrated the law, then Pompey attached himself to Clodius, at that time the boldest of the popular leaders, and won Caesar to his support, a result for which Cato himself was in a way responsible. For Caesar, on returning from his praetorship in Spain, desired to be a candidate for the consulship, and at the same time asked for a triumph.
> 
> But since by law candidates for a magistracy must be present in the city, while those who are going to celebrate a triumph must remain outside the walls, he asked permission from the senate to solicit the office by means of others. Many were willing to grant the request, but Cato opposed it; and when he saw that the senators were ready to gratify Caesar, he consumed the whole day in speaking and thus frustrated their desires.
> 
> Accordingly, Caesar gave up his triumph, entered the city, and at once attached himself to Pompey and sought the consulship. After he had been elected consul, he gave his daughter Julia in marriage to Pompey, and now that the two were united with one another against the state, the one would bring in laws offering allotment and distribution of land to the poor, and the other would be at hand with support for the laws.

*Plut. Cat. Min. 48.5*, 95 words:

> Plancus got him removed from the jury after the speeches were over, and was convicted none the less. And altogether Cato was a perplexing and unmanageable quantity for defendants; they neither wished to allow him to be a juror in their cases nor had the courage to challenge him. For not a few of them were convicted because their attempted rejection of Cato made it appear that they had no confidence in the justice of their cases; and some were bitterly assailed by their revilers for not accepting Cato as juror when he was proposed.


## Skipped (recorded)

| Source | Reason |
| --- | --- |
| — | none |

## Not yet attempted

| Source | Why |
| --- | --- |
| — | none |
