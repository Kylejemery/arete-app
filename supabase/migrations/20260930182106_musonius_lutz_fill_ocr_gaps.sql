-- Musonius Rufus, Lectures (Lutz 1947): fill the lines the OCR lost.
--
-- Four of the 85 English chunks carried "[…]" where archive.org's OCR of
-- the scan (MUSONIUSRUFUSSTOICFRAGMENTS_djvu.txt) had dropped lines: VIII,
-- p. 67 (five places), XVI, p. 107 (four words at a clipped right margin)
-- and XVIIIA, p. 113 (four places, including the passage on meat and the
-- quotation of Heraclitus). The scan's own page images show every one of
-- those lines. They were read off the images on 2026-09-30, word by word:
-- image 17 (pp. 66-67), image 37 (pp. 106-107) and image 40 (pp. 112-113),
-- 0-based, of archive.org item MUSONIUSRUFUSSTOICFRAGMENTS. Nothing is
-- reconstructed from context. Seven punctuation misreadings on the same
-- pages are corrected with them ("No one." "music. Likewise" "statesman.
-- When" "yourself.”" "it.”" "drinking. Once" "swallowing. We") and one
-- word ("But how" is "But now"). Lecture XI needs no fill: in the 1947
-- volume it begins where our chunk does, and Lutz's note says the opening
-- was lost in transmission, not in the scan.
--
-- The same fills and fixes are in the pipeline (pd-ingest/sources.js, gaps
-- with a fill and the image they came from). Each corrected chunk below was
-- checked to appear verbatim in the rebuilt pipeline text of its lecture,
-- and the other 81 live chunks were checked to appear there unchanged.
--
-- Method, as in 20260930174718: each chunk is checked against the md5 of
-- its current text; its original is kept as a deprecated row at the end of
-- the work, every column copied; then the text is replaced and checked
-- against the md5 computed outside the database. Any mismatch raises and
-- rolls the migration back. Chunk boundaries, ids, section_label and
-- locator are unchanged, so VIII (482 words) and XVIIIA (537) run over the
-- pipeline's 350-word chunk size. The two 'poor' chunks and the two 'fair'
-- ones become 'good': their text is now read off the page. The changed
-- chunks are re-embedded after this migration.
--
-- ci = chunk_index, b / a = md5 before / after, t = the corrected text.
do $$
declare
  rec record;
  t text;
begin
  for rec in
    select * from jsonb_to_recordset($json$
[
{
"ci": 75,
"b": "f4146992ca4fecd4dab72f7d3c7731b5",
"a": "abf7c7941923bdeef6b6c007c244ce23",
"t": "Of these two propositions let us examine the former: Is it possible for anyone to be a good king unless he is a good man? No, it is not possible. But given a good man, would he not be entitled to be called a philosopher? Most certainly, since philosophy is the pursuit of ideal good. Therefore a good king is found to be forthwith and of necessity a philosopher also. Now again that the philosopher is entirely kingly you may understand from this. The attribute of a kingly person is obviously the ability to rule peoples and cities well and to be worthy to govern men. Well, then, who would be a more capable head of a city or more worthy to govern men than the philosopher? For it behooves him (if he is truly a philosopher) to be intelligent, disciplined, noble-minded, a good judge of what is just and of what is seemly, efficient in putting his plans into effect, patient under hardship. In addition to this, he should be courageous, fearless, resolute in the face of things apparently disastrous, and besides beneficent, helpful, and humane. Could anyone be found more fit or better able to govern than such a man? No one. Even if he does not have many subjects obedient to him, he is not for that reason less kingly, for it is enough to rule one’s friends or one’s wife and children or, for that matter, only oneself. For, indeed, a physician who attends few patients is no less a physician than the one who attends many if, to be sure, he has skill and experience in healing. In the same way the musician who teaches only a few pupils is no less a musician than the one who teaches many, provided he knows the art of music. Likewise the horseman who trains only one or two horses is just as much a horseman as the one who trains many if he is skilled in horsemanship. And so the title of kingly person belongs to the one who has only one or two subjects just as well as to the one who has many, only let him have the skill and ability to rule, so that he may deserve the name of king. For this reason it seems to me that Socrates too called philosophy the statesmanlike and royal discipline, because one who masters it immediately becomes a statesman. When Musonius said these things, the king was glad at his words and told him that he was grateful for what he said and added, “In return for this, ask of me whatever you wish for I shall refuse you nothing.”\n\nThen Musonius said, “ The only favor I ask of you is to remain faithful to this teaching, since you find it commendable, for in this way and no other will you best please me and benefit yourself.”"
},
{
"ci": 110,
"b": "4772c1bae3b52c2a7be9fb1ddac87bdc",
"a": "f8cc55cb7cba6f79fabcfd9602cb152d",
"t": "If, then, my young friend, with a view to becoming such a man, as you surely will if you truly master the lessons of philosophy, you should not be able to induce your father to permit you to do as you wish, nor succeed in persuading him, reason thus: your father forbids you to study philosophy, but the common father of all men and gods, Zeus, bids you and exhorts you to do so. His command and law is that man be just and honest, beneficent, temperate, high-minded, superior to pain, superior to pleasure, free of all envy and all malice; to put it briefly, the law of Zeus bids man be good. But being good is the same as being a philosopher. If you obey your father, you will follow the will of a man; if you choose the philosopher’s life, the will of God. It is plain, therefore, that your duty lies in the pursuit of philosophy rather than not. But, you say, your father will restrain you and actually shut you up to prevent your study of philosophy. Perhaps he will do so, but he will not prevent you from studying philosophy unless you are willing; for we do not study philosophy with our hands or feet or any other part of the body, but with the soul and with a very small part of it, that which we may call the reason. This God placed in the strongest place so that it might be inaccessible to sight and touch, free from all compulsion and in its own power."
},
{
"ci": 111,
"b": "e6295e8659949f970aaee3d4e74ab698",
"a": "c1a2335cc1191699071c6bbd78c7c929",
"t": "Particularly if your mind is good your father will not be able to prevent you from using it nor from thinking what you ought nor from liking the good and not liking the base; nor again from choosing the one and rejecting the other. In the very act of doing this, you would be studying philosophy, and you would not need to wrap yourself up in a worn cloak nor go without a chiton nor grow long hair nor deviate from the ordinary practices of the average man. To be sure, such things are well enough for professional philosophers, but philosophy does not consist in them, but rather in thinking out what is man’s duty and meditating upon it.”"
},
{
"ci": 116,
"b": "b01c1edbbef02bbcbf6481a70582e9f5",
"a": "df46ba44598065026af025782e1bd0c9",
"t": "On the subject of food he used to speak frequently and very emphatically too, as a question of no small significance, nor leading to unimportant consequences; indeed he believed that the beginning and foundation of temperance lay in self-control in eating and drinking. Once, putting aside other themes such as he habitually discussed, he spoke somewhat as follows. As one should prefer inexpensive food to expensive and what is abundant to what is scarce, so one should prefer what is natural for men to what is not. Now food from plants of the earth is natural to us, grains and those which though not cereals can nourish man well, and also food (other than flesh) from animals which are domesticated. Of these foods the most useful are those which can be used at once without fire, since they are also most easily available; for example fruits in season, some of the green vegetables, milk, cheese, and honey. Also those which require fire for their preparation, whether grains or vegetables, are not unsuitable, and are all natural food for man. On the other hand he showed that meat was a less civilized kind of food and more appropriate for wild animals. He held that it was a heavy food and an obstacle to thinking and reasoning, since the exhalations rising from it being turbid darkened the soul. For this reason also the people who make larger use of it seem slower in intellect. Furthermore, as man of all creatures on earth is the nearest of kin to the gods, so he should be nourished in a manner most like the gods. Now the vapors rising from the earth and water are sufficient for them, and so, he said, we ought to be nourished on food most like that, the lightest and purest; for thus our souls would be pure and dry, and being so, would be finest and wisest, as it seemed to Heraclitus when he said, “The clear dry soul is wisest and best.” But now, he said, we feed ourselves much worse than the unreasoning brutes. For even if they, driven by appetite as by a lash, fall upon their food, nevertheless they are not guilty of making a fuss about their food and exercising ingenuity about it, but they are satisfied with what comes their way, seeking satiety only, nothing more. But we contrive all kinds of arts and devices to give relish to eating and to make more enticing the act of swallowing. We have come to such a point of delicacy in eating and gourmanderie that as some people have written books on music and medicine, so some have even written books on cooking which aim to increase the pleasure of the palate, but ruin the health. It is at all events a common observation that those who are luxurious and intemperate in food have much less vigorous health. Some, in fact, are like women who have the unnatural cravings of pregnancy; these men, like such women, refuse the most common foods and have their digestion utterly ruined. Thus, as worn-out iron constantly needs tempering, their appetites continually demand being sharpened either by neat wine or a sharp sauce or some sour relish."
}
]
$json$::jsonb) as x(ci int, b text, a text, t text)
  loop
    select chunk_text into t from public.rag_corpus
     where author = 'Musonius Rufus' and work = 'Lectures' and program_id = 'stoicism-phd'
       and language = 'english' and deprecated = false and chunk_index = rec.ci;
    if t is null then raise exception 'Lutz chunk % not found', rec.ci; end if;
    if md5(t) = rec.a then continue; end if;  -- already filled
    if md5(t) <> rec.b then raise exception 'Lutz chunk % is not the text the fills were made from', rec.ci; end if;
    if md5(rec.t) <> rec.a then raise exception 'Lutz chunk % replacement does not match its md5', rec.ci; end if;

    insert into public.rag_corpus (
      program_id, author, work, section_label, chunk_index, chunk_text, word_count,
      translator, source_url, text_type, embedding, course_relevance, difficulty,
      source_chunk_index, language, paired_chunk_id, source_type, parent_chunks,
      deprecated, edition_year, locator, license_status, license_evidence,
      quotable_on_air, edition, retrieved_at, raw_sha256, ocr_quality,
      printed_pages, cited_by, contains_quoted_primary, greek_terms,
      verification_status, synthesis_document_id
    )
    select
      r.program_id, r.author, r.work, r.section_label,
      (select max(r2.chunk_index) + 1 from public.rag_corpus r2
        where r2.author = r.author and r2.work = r.work and r2.program_id = r.program_id),
      r.chunk_text, r.word_count,
      r.translator, r.source_url, r.text_type, r.embedding, r.course_relevance, r.difficulty,
      r.source_chunk_index, r.language, r.paired_chunk_id, r.source_type, r.parent_chunks,
      true, r.edition_year, r.locator, r.license_status, r.license_evidence,
      r.quotable_on_air, r.edition, r.retrieved_at, r.raw_sha256, r.ocr_quality,
      r.printed_pages, r.cited_by, r.contains_quoted_primary, r.greek_terms,
      r.verification_status, r.synthesis_document_id
    from public.rag_corpus r
    where r.author = 'Musonius Rufus' and r.work = 'Lectures' and r.program_id = 'stoicism-phd'
      and r.language = 'english' and r.deprecated = false and r.chunk_index = rec.ci;

    update public.rag_corpus
       set chunk_text = rec.t,
           word_count = case when word_count is null then null
                             else array_length(regexp_split_to_array(btrim(rec.t), '\s+'), 1) end,
           ocr_quality = 'good'
     where author = 'Musonius Rufus' and work = 'Lectures' and program_id = 'stoicism-phd'
       and language = 'english' and deprecated = false and chunk_index = rec.ci;
  end loop;
end
$$;
