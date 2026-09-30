# Staging review: stoic-scholarship-2026-09

Generated 2026-09-28T19:18:02.676Z by `academy/corpus-ingestion/pd-ingest/report.js`. Approve a source by setting its
`corpus_staging_sources.status` to `approved`; `node pd-ingest/promote.js --slug <slug>` then moves it into `rag_corpus`.

## Staged

### Émile Bréhier, *Chrysippe* — `brehier-chrysippe-1910`

| | |
| --- | --- |
| Status | **staged** |
| Tier / text_type / language | 2 / scholarship / french |
| Translator, edition | original; Les Grands Philosophes. Paris: Félix Alcan (1910) |
| quotable_on_air | false |
| Source | https://archive.org/details/chrysippe00br |
| Retrieved / raw sha256 | 2026-09-28T18:52:16+00:00 / `49122ccb3686b3a2…` |
| Words / chunks / notes | 69,926 / 272 / 0 |
| OCR | good (estimated 1.2% of sampled words garbled) |

**License evidence**

> Émile Bréhier, Chrysippe, Les Grands Philosophes. Paris: Félix Alcan, 1910. Published before 1931: public domain in the United States. The source page carries no public-domain statement of its own.

**Cleaning problems**

- In French and untranslated: it answers French-language retrieval only, and English queries filtered to english will not reach it. Greek quotations are OCR-garbled throughout (Latin-script renderings of Greek type).
- printed pages from leaf offset 14; 234 of 238 legible running-head numbers agree (the rest are OCR misreadings)

**Question map on promotion**

- Q03 (states): Reads the comprehensive impression (phantasia kataleptike) as passive, against Brochard's active reading: certainty lies in the impression itself, with assent following it.
- Q07 (states): Chrysippus's reconciliation of fate and responsibility (De fato 12–13 read with Diogenianus): the co-fated (confatalia) and the distinction of principal from concurrent causes, so that an event is necessary only through the antecedents it implies.
- Q05 (states): The passion as a sickness of the soul: a judgment of reason gone excessive, not a separate irrational part, and its therapy by correcting the judgment.

**Three chunks at random**

*pp. 109* (p. 109), 144 words:

> CHAPITRE II LA PHYSIOCE. § I. — Les principes de la physique : le pluralisme. Les Stoïciens admettent seulement des corps, c'est-à- dire des êtres entièrement distincts les uns des autres par leur essence et leurs qualités, individus isolés les uns des autres'. Ils veulent trouver la raison de l'existence et de la nature de cet individu dans lintiniité du corps lui-même, et non plus dans une cause agissant de lextérieur sur une matière préalablement donnée, telle que la participation à une idée (Platon) ou la tendance à réaliser une fin (Aristote^. Pour Aristote, l'être d'abord indéterminé, atteint graduellement sa réalité par des étapes successives où il s'enrichit peu à peu, et c'est la série de ces étapes ou de ces événements ;. Cf. le principe de Cbrysippe, Stobée, Ed., I, p. 131 (Ars., II, 118, 3) : To {ùv aÎTtov cv xai aûiu.

*pp. 183* (p. 183), 295 words:

> sissent d'eux-mêmes et nécessairement à la notion du destin. \° Le principe de causalité' K — Chrysippe a eu à défendre le principe lui-même contre certains partisans de la contingence qui en niaient Tuniversalité pour pouvoir expliquer le choix de la volonté lorsque les circonstances sont les mêmes de part et d'autre; le stoïcien fait appel dans ce cas, comme dans le cas du prétendu hasard, à des causes invisibles*. L'affirmation de ce principe n'implique pas immédiatement celle du destin. Il énonce seulement qu'il n*y a pas d'événements sans cause ; or la théorie du destin va plus loin en affirmant : 1" l'unité absolue de la cause, « continue et éternelle » ; 2° et si on se place au point de vue de la multiplicité des agents, la liaison ou dépendance mutuelle entre les causes'. Les discussions de Carnéade, dans le De fato^ montrent clairement la différence ; car elles ont en partie pour but 1. Plct., De falo. Il (Arw., II, 264, 6). 2. Plut., De Slotc: rep«</H., 23 (Arx., II, n» 973). Alexandre d'Aphrodise {De fato, 22; surtout Au.^., H, 273, 10) nous a conserré une démonstration du principe de causalité, qui n'est pas formellement attribuée à Cbrysippc, mais contient beaucoup de ses idées (par exemple la classilicalion des causes, I. 18). Elle repose sur l'unité du cosmos. « Le monde serait dispersé, diVlsé, et ne resterait plus un, gouverné suirant un ordre unique, si l'on introduisait un mouTement sans cause. > 3. Le destin est 1" akia tûv ôvtuv E'.po(uvTi (Oioc. La., YIl, 149); 2' elpiiôv attiûv (Akm., II, n« 917, 920, 921). Nous n'avons pas à expliquer celte contradiction, après ce que nous avons dit plus iiaut sur le rapport de l'unité et de la multiplicité dans le monde.

*pp. 23* (p. 23), 306 words:

> tenu du traité intitulé : « Première introduction sur les syllogismes* ». Chrysippe exposait au début les trois formes ou modes indémontrables du syllogisme stoïcien. L'ordre des matières y ressemblait donc à celui qu'adoptait Aristote à partir du chapitre iv du livre i àes Analytiques. Bien des raisons nous amènent à croire que ce n'est pas la seule fois que YOrganon d'Aristote a servi pour ainsi dire de schéma dans la disposition des matières aux études logiques de Chrysippe, soit qu'il le suivit, soit qu'il le contredit : l'exposé de Chrysippe par Simplicius montre qu'il suivait dans le problème logique des oppositions la même voie qu'Aristote en distinguant le contraire, le contradictoire, et la privation ^. Dans le problème du possible, le principal de la discussion est consacré à discuter une thèse posée par Aristote, et dans les termes mêmes où elle avait été posée par lui : « L'impossible ne suit pas du possible^. » Nous nevou- 1. iRX., II, 80, 26. 2. Ap. SiMPuc, In Arist. cat., fragments réunis par Arnim, II, p. 49 à 52. Dans le l"et le 2' fragment {% 172 et 173, il ne s'agit pas de Chrysippe, mais des Stoïciens en général, mais ce fragment est lié d'une façon intime aux suivants dans lesquels Chrysippe et ses ouvrages sont nommés), Simplicius ramène tous les travaux stoïciens sur cette question au -kz^X twv ivttxf'.jiÉvwv d'Aristote (p. 49, 1. 15 sq.)- Même là où Chrysippe difffere d'opinion, les questions sont toujours posées de la même manière que chez Aristote. P. 51, 1. à, il examine quelques cas singuliers de priratious qui n'obéissent pas à la règle générale posée par Aristote, qu'il n'y a pas de changement possible que dans un seul sens, de l'é;'.: à la privation. 3. Cf. Epict., Z>w5er^, II, 19 sq. ; Arxui, II, 93, 2-12; la démons-


### W.L. Davidson, *The Stoic Creed* — `davidson-stoic-creed-1907`

| | |
| --- | --- |
| Status | **staged** |
| Tier / text_type / language | 2 / scholarship / english |
| Translator, edition | original; Religion in Literature and Life. Edinburgh: T. & T. Clark (1907) |
| quotable_on_air | false |
| Source | https://archive.org/details/thestoiccreed00daviuoft |
| Retrieved / raw sha256 | 2026-09-28T18:51:31+00:00 / `4be18fecddba5dbe…` |
| Words / chunks / notes | 71,611 / 253 / 0 |
| OCR | good (estimated 0.8% of sampled words garbled) |

**License evidence**

> W.L. Davidson, The Stoic Creed, Religion in Literature and Life. Edinburgh: T. & T. Clark, 1907. Published before 1931: public domain in the United States. The source page carries no public-domain statement of its own.

**Cleaning problems**

- Published in a religious series (T. & T. Clark, "Religion in Literature and Life"); the theology chapters read Stoicism with an eye to Christian theism (admission test 7). The appendix on pragmatism and humanism (pp. 255–266) is left out as off the question map.
- printed pages from leaf offset 28; 211 of 212 legible running-head numbers agree (the rest are OCR misreadings)

**Question map on promotion**

- Q04 (states): A systematic exposition of Stoic ethics, living according to nature, virtue the sole good, externals indifferent, set against the Epicurean contrast and assessed for its present-day value.
- Q01 (states): Stoic theology and religion: a providential, rational God immanent in the cosmos, with the Stoic treatment of divination, prayer and the problem of evil.

**Three chunks at random**

*pp. 123* (p. 123), 277 words:

> knows that even the phenomenon of nutrition is not wholly explicable by chemical and physical laws, inasmuch as the wall of the intestine refuses to behave like a mere dead membrane ; and the botanist, just because he is here dealing with living membranous tissue, has ceased to explain the rise of the sap in a tree simply by endosmose. The intervention of life in the membrane makes all the difference. How, again, in the case of Sensation, do atoms that are themselves colourless, scentless, soundless (for, as said, they have no secondary qualities), give rise by mere collocation to colour, scent, sound ? How, still more, do we get in this way the higher processes of Mind, — conception, judgment, reasoning, thought, — so different, not only in quantity, but in kind, from the properties of inorganic matter? In consciousness and self-consciousness and the processes of reflective thought, we have reached something of the nature of an organic unity, whose ruling feature is internal purposive development and spontaneous activity. These chasms — namely, between the lifeless and the living, on the one hand, and, on the other hand, between the merely animate or living and the conscious thinking life — are the standing difficulty for the Epicurean physics, as for pure material ism in whatsoever age. If man is not "a mere automaton," if consciousness be more than a bare " epiphenomenon " or useless adjunct of brain process, then mechanism cannot fully explain h'im, or account for his distinctive mental characteristics. "Ex nihilo nihil fit " is the great principle that Lucretius is con stantly using. Nowhere is it more applicable than here, against himself.

*pp. 110* (p. 110), 280 words:

> are eternal or uncreated, and indestructible — " strong in their solid singleness." This last property of in destructibility, implying in it indivisibility, belongs to them because of their exceptional hardness and solidity : they have no void or empty space within them ; there fore they cannot be broken up (hence the name aro/xo?, atom). Their motion, too, is indestructible. They are infinite in number, and have an indefinite (unlimited, though not absolutely limitless) number of shapes, sizes, and weights. They possess no secondary qualities — such as colour, taste, smell. They move naturally in parallel straight lines downwards, like rain falling perpendicularly from the heavens to the earth. And yet, if this perpendicular downward motion were the sole one, it would be impossible for matter to form into masses — there could be no such thing as aggregation, and the formation of the world would be impossible. Accordingly, a further supposition is necessary — namely, that the atoms have in them the power of swerving or declining from the straight line, even though it be but to the smallest possible extent — the power of passing out of the orderly march of the regular atomic dance, symbolized by the motes in a sunbeam, and so of crossing each other and of coming into contact and collision, thereby rendering combina tion and interaction possible. "This point of the subject also," says Lucretius (ii. 216-224), "we wish you to understand — namely, that atoms, when they are borne straight downwards through the void by their own weight, do usually, at an uncertain time and at uncertain places, push them selves a little from their course, just so far that you

*pp. 103* (p. 103), 285 words:

> " irrational soul" or i/a>xr) oAoyos, and in man as "rational soul" or ij/vxn ^-o'yov !xow"a- But when we ask, What really has "hold" in common with "vital force," or "vital force" with "soul "or with "reason"? we find that we have surmounted the difficulty only in words. In their ultimate unity, the Stoics assumed mind, with all its characteristics, in matter ; and the evolution of the world from the primal material fire became possible, only because in the primal fire are presupposed rationality and will. Yet, even thus, God is not, except in the sense of the material world ; and, although to the Later Stoa (Epictetus, Seneca, etc.), and in connexion with ethics, the Deity assumed a personal spiritual aspect, He is only an impersonal force to the founders of the school, and could scarcely be other if the Stoical physics is to be strictly adhered to. This suggests, for another point, that the physics and the ethics of the Stoics (more especially, the ethics of the Roman period) are not metaphysically of a piece : speculative materialism rules the one, intense scorn of moral materialism dominates the other. This will be impressed upon us with sufficient fulness later on. But, meanwhile, it may be well to observe that there are points in the ethical teaching that are affected for ill by the physical speculations. One such point is the conception of evil ; of which cosmic pantheism, looking upon the world as perfect, could give no adequate rendering. Another has reference to the doctrine of all-controlling necessity or fate. This had sometimes a numbing influence on practice, and tended to encourage people in a too servile acquiescence in the existing state


### R.D. Hicks, *Stoic and Epicurean* — `hicks-stoic-and-epicurean-1910`

| | |
| --- | --- |
| Status | **staged** |
| Tier / text_type / language | 2 / scholarship / english |
| Translator, edition | original; The Epochs of Philosophy, ed. J.G. Hibben. New York: Charles Scribner's Sons (1910) |
| quotable_on_air | false |
| Source | https://archive.org/details/stoicandepicurea002438mbp |
| Retrieved / raw sha256 | 2026-09-28T18:50:47+00:00 / `00dac8b99c0c6bf6…` |
| Words / chunks / notes | 116,997 / 394 / 0 |
| OCR | good (estimated 0.6% of sampled words garbled) |

**License evidence**

> R.D. Hicks, Stoic and Epicurean, The Epochs of Philosophy, ed. J.G. Hibben. New York: Charles Scribner's Sons, 1910. Published before 1931: public domain in the United States. The source page carries no public-domain statement of its own.

**Cleaning problems**

- printed pages from leaf offset 28; 387 of 387 legible running-head numbers agree (the rest are OCR misreadings)

**Question map on promotion**

- Q01 (states): Sets Stoic pantheism and providence, a rational fiery pneuma pervading one living cosmos, against Epicurean atomism, in which the world arises from the chance swerve of atoms and the gods take no part.
- Q03 (complicates): Expounds the Stoic criterion, the apprehensive presentation, and then the Academic (Arcesilaus, Carneades) and Pyrrhonist attacks on it, so that the Stoic claim to certainty is read against its strongest ancient opponents.

**Three chunks at random**

*pp. 232* (p. 232), 292 words:

> or ofthe nerves. The knowledge we have, imperfect as it is, on these subjects has been acquired after painful efforts and strenuous researches carried on for generations. Itwould have been impossible without the microscope, and the continuance of those endeavours to systematise and extend knowledge for its own sake, which Epicurus discouraged on principle. Why should men busy themselves with minute investigationsof the structure of the eye and the laws ofreflection, so long as there were infinite atoms, enough and to spare, to bring a specimen of every visible object to the eye of every observer ? Besides, an ingenious corollary provides an easy explanation of erroneous perceptions, hallucinations, and dreams. Not only may films from real objects become distorted and blunted, but films from different objects, or even casual atoms, may meet in the air, blend, and enter the eye, causing die vision of objects which never were on land or sea, both in our waking hours and in dreams. Such aggregates or complexes of atoms, taking on the delusive appearance of real objects, were technically designated Systaseis. Epicurus goes on: "So long as nothing comes in the way to offer resistance, motion through the void accomplishes any imaginable distance in an indefinitely short time. For resistance encountered is the equivalent of slowness, its absence the equivalent of speed. Not that, ifwe consider the times perceptible by reason alone, the moving body arrives atmore than one place simultaneously (for this, too, is inconceivable), nor that when in time perceptible to sense it arrives from any pointyou please ofthe infinite, it will not be starting from the point to which we conceive it to have made its journey. For, if it stopped there on its arrival, thiswould be equivalent to its meetingwith

*pp. 189* (p. 189), 284 words:

> confidence that nothing we have to fear is eternal or even of long duration, also enables us to see that even in our limited life nothing enhances our security so much as friendship. XXIX. Of our desires, some are natural and necessary; others are natural, but not necessary; others, again, are neither natural nor necessary, but are due to groundless opinion. XXX. Some natural desires, again, entail no pain when not gratified, though the objects are vehemently pursued. These desires also are due to groundless opinion, and when they are not got rid of, it is not because of their own nature, but because of the man's groundless opinion. XL. 1 Thosewho could best insure the confidence that they would be safe from their neighbours, being thus in possession of the surest guarantee, passed the most agreeable life in each other's society, and their enjoyment ofthe fullest intimacy was suchthat, if one ofdiem died before his time, the survivors did not lament his death as if it called for pity. To the foregoing we may add a few ethical fragments of Diogenes of (Enoanda, which may or may not be actual words of Epicurus: 2 "Nothing is so productive of cheerfulness as to abstain from meddling and not to engage in difficult undertakings, nor force yourself to do something beyond your power. For ail this involves your nature in tumults/ 5 3 "The main part of happiness is the disposition which is underourown control. Service in the field is 1 Numbers XXXI to XXXIX, which deal with justice, have already been quoted in this chapter, pp. 177 sqq. 2 See Diogenis. (Enoandensis Fragmenta (loh. William), p. 3d. 3 Diogeoes of (Enoanda, Fragment LVI (William).

*pp. 30* (p. 30), 308 words:

> they were imagined. Hence a curious inversion of Platonic idealism. Plato said that a man is just and musical by partaking in the ideas, the objective realities, of justice and music: the Stoics said that a man was just when he had the material of justice, musical when he had the material of music within him. While we justly condemn this wild speculation as crude and baseless, we must remember that even in modern science there is a region of unverified hypotheses in which speculations on the nature of electricity and the properties of ether play their part. The statement that the universal substance is at once both force and matter, and therefore that the distinction between them is only transitory and relative, is strongly confirmed by the Stoic cosmogony. In the world as it is we resolve each particular thing into form and matter, but let us go back to the time before there was a heaven and earth and review the work of creation. Here again the analogy of the macrocosm and the microcosm is allimportant. The germination of a plant, the birth of an animal implies a seed or ovum, moisture being one indispensable condition. So, too, with a world, which is evolved, attains maturity, and again perishes by a process of orderly sequence stretching over an immense period of time. Before the birth of the world God alone existed, having absorbed into His fiery substance all nature at a general conflagration. At this stage the distinction between the soul and the body of the universe, between the active principle, God, and the passive principle, matter, is merged in complete identity. In the words of Chrysippus, "the universe is then its own soul and its own controlling mind," * and yet at the same time it never ceases to 1 Plutarch, De Stoicorum Repugnantiis, 41.


### W.T. Jackson, *Seneca and Kant* — `jackson-seneca-and-kant-1881`

| | |
| --- | --- |
| Status | **staged** |
| Tier / text_type / language | 2 / scholarship / english |
| Translator, edition | original; Seneca and Kant; or, an Exposition of Stoic and Rationalistic Ethics, with a Comparison of the Two Systems. Dayton, Ohio: United Brethren Publishing House (1881) |
| quotable_on_air | false |
| Source | https://archive.org/details/cu31924031229622 |
| Retrieved / raw sha256 | 2026-09-28T18:50:40+00:00 / `de02021d36268633…` |
| Words / chunks / notes | 15,780 / 71 / 0 |
| OCR | good (estimated 2.0% of sampled words garbled) |

**License evidence**

> W.T. Jackson, Seneca and Kant, Seneca and Kant; or, an Exposition of Stoic and Rationalistic Ethics, with a Comparison of the Two Systems. Dayton, Ohio: United Brethren Publishing House, 1881. Published before 1931: public domain in the United States. The source page carries no public-domain statement of its own.

**Cleaning problems**

- Carries a Christian apologetic frame (admission test 7): the conclusion (pp. 101–103) judges Stoicism "in its inmost essence a system of selfishness" and "far below" the Gospel. Held as a critic, never as agreement.
- printed pages from leaf offset 8; 65 of 67 legible running-head numbers agree (the rest are OCR misreadings)

**Question map on promotion**

- Q04 (attacks): Stoic and Kantian ethics agree that virtue is sought for itself and not for happiness, but the Stoic sage's self-sufficiency is pride: a system with no forgiveness, repentance or need of grace, and its licence of suicide concedes that virtue does not master every circumstance.
- Q06 (complicates): Seneca grounds duty in life according to nature; Kant grounds it in the autonomous rational will and refuses any natural end as its source. Setting the two side by side shows the Stoic ought depending on a providential nature that Kant will not grant.

**Three chunks at random**

*pp. 100* (p. 100), 186 words:

> as feeling can not be wholly ignored and obliterated without disastrous results. But why class all the feelings together as evil ? Root out most ruthlessly envy, malice, revenge, avarice, and all their kindred ; but why crush love, gratitude, sympathy, and mercy? In truth, amid the foes of virtue, Kant and Seneca would sacrifice its best friends. Admitting that virtue is "conformity to right reason," how can it thrive, whence its motive-power, unless constantly re-enforced by the better sensibilities ?* The Stoic of necessity acquired a harsh and repulsive character, destitute of the grace and beauty of true manhood. Such rigor could not but be followed by the most violent reactions ; and, accordingly, the grossest lewdness, and, as some allege, even cannibalism were found among them. It is in endurance and suffering that the excellence of Stoicism appears. There it shines resplendent, and furnishes a theme on which its sages loved to dwell. Never have • Cf. Goethe, Iphigenie auf Tauris, Act II., Sc. ». ,,Lust und Liebe sind die Fittige Zu grossen Thaten." " Pleasure and love are the pinions To noble deeds."

*pp. 66* (p. 66), 227 words:

> *'noumenon" and a "phenomenon." As Poetter says : „91I§ Snoumenon giebt bet SKenfc^ baS ©ittengefel ; als jtnnlic^eS 2Be[en ifl er Diefem ®e» fe^e unterworfen." And again : „3n bet Ktitifber i)ra!tif(^en Sernunft binbicirt alfo ^ant bem aJienfc^en ein fc^B})ferifd^e3 SermSgen. Sic t^eoreti[^e SBernunft ifi in leinet SBeifc fc^6j)ferifc^, fonbern nut etiennenb ; biejJtaftifc^cetbaut fic^ felbft i^e 2Selt"* But as a rational agent, man must consider himself a member, not so much of the sensible, as of the supersensible system, a system whose laws are entirely independent of mechanical influences, and have their grounds in reason only.f Now the fundamental fact in a rational will isfreedom. "We must attribute to every rational being possessing a will, the idea of freedom, under which idea alone can he act.";J: This freedom is the power of legislating for himself, and of determining his own causality accordingly: this constitutes true autonomy of will. In Kant's words, *As a noumenon man gives the law of morals; as a sensuous beinff he is subject to this law. Accordingly, in the CriticalExamination of the •^Practical Reason^ Kant claims for man a creative power. The pure (spec* ulative) reason is in no way 'creative, but only cognitive; the practical (moral) constructs its own world.—Poetter's Gesch. der Phil. Theil II., pp. 132-4. t Grund. 2ur Met. der Bitten ; v. Kirch., p. 83. J Ibid., Bp.76-7.

*pp. 49–50* (p. 49–50), 325 words:

> CHAPTER III. . The Ethical System of Kant. We are now ready to compare with the foregoing system the doctrine of Kant. Immanuel Kant, the founder of the Critical or Transcendental School of German philosophy, was born at Konigsberg, Prussia, in 1724. He was of Scottish descent, the orthography of the family name, originally Cant, having been changed to Kant to prevent the pronunciation, Tsant. He was a profound linguist, mathematician, and philosopher; yet not early did his superior abilities command public recognition. Not till his forty-sixth year (1770) was he appointed professor of logic and metaphysics in the university of his native city. His life was devoted to study; and such was his aversion to travel that he is said never to have gone farther than thirtytwo miles from Konigsberg. In person he was short and very spare, his feeble frame and hollow chest betokening an
> 
> early death, rather than ^the long and laborious life which was granted to him. While simple in dress and manners, he was rigidly methodical in all his habits. Study, diet, sleep, and exercise were regulated with mathematical precision. Independence was a marked trait of his character. During his student career at the university, he was compelled to maintain a constant struggle with poverty, yet he preferred to wear a shabby coat rather than accept any proffers of assistance. When he had risen to eminence he was visited by throngs of admirers, whom he took great pleasure in ' entertaining, but always strictly within the limits of time which he had marked out for himself. Although a profound thinker, he was also interested in lighter themes, and read and reread such works as "Tale of a Tub," and "Hudibras." As a lecturer, he was entertaining and popular, and attracted crowds of studentsand visitors. His friendships were warm and lasting. The attachment between him and the English merchant. Green, has a touch of romance in it. His manners were agree-


## Skipped (recorded)

| Source | Reason |
| --- | --- |
| — | none |

## Not yet attempted

| Source | Why |
| --- | --- |
| — | none |
