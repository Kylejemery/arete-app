/**
 * The Garden — content for the Playground experiment and its three beds.
 *
 * Diogenes Laertius 7.40 reports that the Stoics likened philosophy to a
 * living creature (logic the bones and sinews, ethics the flesh, physics the
 * soul), to an egg (logic the shell, ethics the white, physics the yolk), and
 * to a fertile field (logic the surrounding wall, ethics the fruit, physics
 * the soil or the trees). The field is the picture this experiment builds.
 *
 * Ancient sources are given by standard reference. Renderings are close
 * paraphrase, not quotation, so they can be read against any edition.
 */

export type PartId = 'logic' | 'physics' | 'ethics'

export type Part = {
  id: PartId
  name: string
  greek: string
  /** What it is in the garden */
  figure: string
  /** One line */
  line: string
  /** The gloss on the hub */
  gloss: string
  /** What happens when you take it away */
  without: string
  href: string
  /** The link text into the bed */
  go: string
}

export const parts: Part[] = [
  {
    id: 'logic',
    name: 'Logic',
    greek: 'λογική',
    figure: 'The wall',
    line: 'What keeps false things out.',
    gloss:
      'The Stoics meant more by logic than we do: the theory of argument, yes, but also the theory of knowledge, of what an impression is and when to assent to it, and of how to say what you mean. It stands around the garden because everything inside depends on it. A doctrine about nature that cannot survive an argument is not a doctrine, and a rule for living that rests on a false impression is a wall with a hole in it.',
    without:
      'Without the wall, anything walks in. Bad arguments trample the beds and a plausible falsehood takes root beside the truth, and from the inside you cannot tell them apart. The trees still grow. You just no longer know which fruit is safe to eat.',
    href: '/playground/the-garden/logic',
    go: 'Stand at the gate',
  },
  {
    id: 'physics',
    name: 'Physics',
    greek: 'φυσική',
    figure: 'The soil and the trees',
    line: 'What everything grows from.',
    gloss:
      'The study of nature, and for the Stoics that meant everything: the two principles, the one living cosmos, the breath that holds each thing together, fate, providence, the gods. It is the soil because the whole ethics grows out of it. “Live according to nature” is an empty sentence until you know what nature is, what you are, and what in you is nature’s own work.',
    without:
      'Take the soil away and the trees go with it, and the fruit with them. The rule of life is still written on the gate, but it points at nothing. You are told to live according to nature and cannot say what nature wants, or whether it wants anything at all.',
    href: '/playground/the-garden/physics',
    go: 'Dig into the soil',
  },
  {
    id: 'ethics',
    name: 'Ethics',
    greek: 'ἠθική',
    figure: 'The fruit',
    line: 'What the whole thing is for.',
    gloss:
      'The fruit is the point. Logic and physics are studied for the sake of it, and Chrysippus said outright that the study of nature is taken up for no other reason than to tell good from bad. Stoic ethics is the account of what is good, which is virtue alone; of what is indifferent, which is everything else; and of how a rational creature comes to want what it was made to want.',
    without:
      'Without the fruit, why build the wall or work the soil? A garden that bears nothing is a fenced field of dirt. The Stoics were clear that the other two parts serve this one, and that a philosopher who never gets to living well has not yet started.',
    href: '/playground/the-garden/ethics',
    go: 'Sort the harvest',
  },
]

export const pictures = [
  {
    id: 'garden',
    name: 'A fertile field',
    logic: 'the wall around it',
    physics: 'the soil, or the trees',
    ethics: 'the fruit',
  },
  {
    id: 'egg',
    name: 'An egg',
    logic: 'the shell',
    physics: 'the yolk',
    ethics: 'the white',
  },
  {
    id: 'animal',
    name: 'A living creature',
    logic: 'the bones and sinews',
    physics: 'the soul',
    ethics: 'the flesh',
  },
] as const

export const gardenSources = [
  'Diogenes Laertius 7.39–41 (the three parts and the three pictures; the disagreement over the order of teaching)',
  'Plutarch, On Stoic Self-Contradictions 1035a–d (Chrysippus on the order of the parts and the purpose of physics)',
  'Sextus Empiricus, Against the Logicians 1.16–19 (the same pictures, with the parts assigned differently)',
]

// ── logic: at the gate ───────────────────────────────────────────────────────

export type Visitor = {
  id: string
  premises: string[]
  conclusion: string
  /** Does the conclusion follow? */
  valid: boolean
  /** The form's name, if it has one */
  form: string
  why: string
  source: string
}

export const visitors: Visitor[] = [
  {
    id: 'mp',
    premises: ['If it is day, it is light.', 'It is day.'],
    conclusion: 'Therefore it is light.',
    valid: true,
    form: 'The first indemonstrable',
    why:
      'This is the form Chrysippus put first among the five arguments that need no proof: a conditional, its antecedent, and so its consequent. Every other valid argument, the Stoics held, can be reduced to these five. Let it through.',
    source: 'Diogenes Laertius 7.80; Sextus Empiricus, Against the Logicians 2.224',
  },
  {
    id: 'ac',
    premises: ['If it is day, it is light.', 'It is light.'],
    conclusion: 'Therefore it is day.',
    valid: false,
    form: 'Affirming the consequent',
    why:
      'The conditional says that day brings light, not that light comes only from day. A lamp at midnight makes it light. This argument wears the clothes of the first indemonstrable, with the premises the wrong way round, and it is the commonest way a false belief gets into a garden.',
    source: 'Diogenes Laertius 7.80 (the form it imitates)',
  },
  {
    id: 'mt',
    premises: ['If it is day, it is light.', 'It is not light.'],
    conclusion: 'Therefore it is not day.',
    valid: true,
    form: 'The second indemonstrable',
    why:
      'A conditional and the denial of its consequent yield the denial of its antecedent. If day always brings light and there is no light, it cannot be day. Valid, and one of the five.',
    source: 'Diogenes Laertius 7.80',
  },
  {
    id: 'da',
    premises: ['If it is day, it is light.', 'It is not day.'],
    conclusion: 'Therefore it is not light.',
    valid: false,
    form: 'Denying the antecedent',
    why:
      'Again the shape is borrowed from a real indemonstrable, the second, with the wrong part denied. That it is not day tells you nothing about whether it is light, since the conditional never said day was the only source of it.',
    source: 'Diogenes Laertius 7.80 (the form it imitates)',
  },
  {
    id: 'conj',
    premises: ['Not both: it is day and it is night.', 'It is day.'],
    conclusion: 'Therefore it is not night.',
    valid: true,
    form: 'The third indemonstrable',
    why:
      'A denied conjunction and one of its conjuncts yield the denial of the other. If the two cannot hold together and one of them holds, the other does not. Valid.',
    source: 'Diogenes Laertius 7.80',
  },
  {
    id: 'disj1',
    premises: ['Either it is day or it is night.', 'It is day.'],
    conclusion: 'Therefore it is not night.',
    valid: true,
    form: 'The fifth indemonstrable',
    why:
      'The Stoic “either… or” is exclusive: exactly one of the two holds. So from the disjunction and one disjunct you may deny the other. Valid, and the fifth of the five.',
    source: 'Diogenes Laertius 7.81',
  },
  {
    id: 'disj2',
    premises: ['Either it is day or it is night.', 'It is not day.'],
    conclusion: 'Therefore it is night.',
    valid: true,
    form: 'The fourth indemonstrable',
    why:
      'From an exclusive disjunction and the denial of one disjunct, the other follows. Valid. Notice that the two disjunctive forms are the mirror of each other, as the two conditional forms are.',
    source: 'Diogenes Laertius 7.81',
  },
  {
    id: 'horns',
    premises: ['What you have not lost, you still have.', 'You have not lost horns.'],
    conclusion: 'Therefore you have horns.',
    valid: false,
    form: 'The Horned Man',
    why:
      'A sophism from the Megarian school, which the Stoics studied precisely so as to keep it out. The first premise is the breach: it is true only of things you once had. Said of things in general it is false, and a false premise in a valid shape is how the argument gets its horns on you. Turn it away and say why.',
    source: 'Diogenes Laertius 7.187, 2.108',
  },
  {
    id: 'sorites',
    premises: [
      'One grain is not a heap.',
      'Adding one grain to what is not a heap never makes it a heap.',
    ],
    conclusion: 'Therefore ten thousand grains are not a heap.',
    valid: false,
    form: 'The Heap',
    why:
      'The sorites, the hardest visitor at the gate. Each step looks harmless and the conclusion is false. Chrysippus’ answer was to stop answering: somewhere along the run of questions the wise man falls silent and refuses to assent either way, because a clear line has not been given. That is not a trick. It is the wall doing its job when the ground is soft.',
    source: 'Cicero, Academica 2.93–94; Diogenes Laertius 7.82',
  },
]

export const logicSources = [
  'Diogenes Laertius 7.41–83 (the Stoic division of logic; the five indemonstrables at 7.79–81)',
  'Epictetus, Discourses 1.7 and 1.17 (why the study of arguments is necessary; logic as the measure)',
  'Cicero, Academica 2.91–98 (the sorites and Chrysippus’ silence)',
]

// ── physics: one breath, four tensions ───────────────────────────────────────

export type Grade = {
  id: 'hexis' | 'physis' | 'psyche' | 'logos'
  index: number
  name: string
  greek: string
  /** What holds together at this tension */
  things: string
  /** What the pneuma does here */
  does: string
  /** The gloss */
  gloss: string
}

export const grades: Grade[] = [
  {
    id: 'hexis',
    index: 0,
    name: 'Tenor',
    greek: 'ἕξις · hexis',
    things: 'Stones, bones, timber, iron',
    does: 'Holds a thing together and makes it one thing rather than a heap.',
    gloss:
      'The lowest tension. Even a stone is not inert on the Stoic view: a current of breath runs out to its surface and back to its centre, and that is why it is a stone and not a scatter of dust. Take the breath away and it would fall apart. Tenor is the answer to the question of why there are things at all.',
  },
  {
    id: 'physis',
    index: 1,
    name: 'Nature',
    greek: 'φύσις · physis',
    things: 'Plants, and the growing parts of animals',
    does: 'Holds together, and also grows, feeds, and reproduces.',
    gloss:
      'Wind the breath tighter and a thing does not merely persist: it takes in, puts out, and pushes toward a form. The tree in the garden is at this tension. So are your hair and nails, which is why the Stoics could say that part of you is a plant. Nature in this narrow sense is the source of the word the whole ethics turns on.',
  },
  {
    id: 'psyche',
    index: 2,
    name: 'Soul',
    greek: 'ψυχή · psychē',
    things: 'Animals',
    does: 'All of the above, and also perceives, and moves toward what it perceives.',
    gloss:
      'Tighter still, and the thing begins to receive impressions and to move on them. An animal is drawn to what suits it and away from what harms it, and it is right to do so: this attachment to its own constitution is what the Stoics called oikeiōsis, and it is the root that ethics grows from. A dog that seeks its food is not making a mistake.',
  },
  {
    id: 'logos',
    index: 3,
    name: 'Reason',
    greek: 'λόγος · logos',
    things: 'Human beings, and the gods',
    does: 'All of the above, and also assents, judges, and can withhold.',
    gloss:
      'At the highest tension the breath can turn on its own impressions and say yes or no to them. This is the same breath that holds the stone together, wound to the point where it can examine itself. It is what makes a rule of life possible, and what makes the rule “according to nature” mean, for us, “according to reason.” The cosmos as a whole is at this tension too. That is the Stoic god.',
  },
]

export const principles = {
  active: {
    name: 'The active principle',
    greek: 'τὸ ποιοῦν',
    text:
      'Reason, god, fate, the fiery breath that runs through everything: the Stoics used all these names for the one thing that acts. It is not outside the world. It is in the world the way the soul is in a body, everywhere in it and shaping all of it.',
  },
  passive: {
    name: 'The passive principle',
    greek: 'τὸ πάσχον',
    text:
      'Matter without quality, what the active principle works on. Never found on its own, any more than a shape is found without something shaped. Everything you can point to is the two together, breath through stuff, at some tension.',
  },
}

export const physicsSources = [
  'Diogenes Laertius 7.132–160 (the division of physics; the two principles at 7.134; the cosmos as a living being at 7.139–143)',
  'Sextus Empiricus, Against the Logicians 1.234 (the pneuma at tenor, nature, soul)',
  'Marcus Aurelius, Meditations 4.4 and 9.9 (the ladder of tenors, natures and souls in practice)',
  'Cicero, On the Nature of the Gods 2.29–39 (the Stoic case that the world is alive and rational)',
]

// ── ethics: sort the harvest ─────────────────────────────────────────────────

export type Basket = 'good' | 'bad' | 'preferred' | 'dispreferred' | 'indifferent'

export const baskets: { id: Basket; name: string; greek: string; short: string }[] = [
  { id: 'good', name: 'Good', greek: 'ἀγαθόν', short: 'Virtue and what shares in it' },
  { id: 'bad', name: 'Bad', greek: 'κακόν', short: 'Vice and what shares in it' },
  { id: 'preferred', name: 'Preferred', greek: 'προηγμένον', short: 'Indifferent, but worth taking' },
  { id: 'dispreferred', name: 'Dispreferred', greek: 'ἀποπροηγμένον', short: 'Indifferent, but worth avoiding' },
  { id: 'indifferent', name: 'Wholly indifferent', greek: 'ἀδιάφορον', short: 'Neither here nor there' },
]

export type Harvest = {
  id: string
  name: string
  basket: Basket
  why: string
}

export const harvest: Harvest[] = [
  {
    id: 'justice',
    name: 'Justice',
    basket: 'good',
    why:
      'A virtue, and so good without qualification. The Stoic test is that a good thing benefits in every use and can never harm; justice passes, and nothing outside virtue does.',
  },
  {
    id: 'health',
    name: 'Health',
    basket: 'preferred',
    why:
      'Indifferent: it does not make you happy or unhappy, and a fool with sound lungs is still a fool. But it is according to nature and has selective value, so the Stoic takes it when it is on offer. A preferred indifferent.',
  },
  {
    id: 'cowardice',
    name: 'Cowardice',
    basket: 'bad',
    why:
      'A vice. Bad in every use, which is the Stoic mark of the bad, as good in every use is the mark of the good.',
  },
  {
    id: 'wealth',
    name: 'Wealth',
    basket: 'preferred',
    why:
      'Preferred, not good. It can be used well or badly, and a thing that can be used badly cannot be what makes a life go well. But it is material for virtue to work with, and other things equal the Stoic selects it.',
  },
  {
    id: 'death',
    name: 'Death',
    basket: 'dispreferred',
    why:
      'Dispreferred, not bad. If death were bad, nothing in the sage’s power could make a life good, and the whole Stoic claim would fail. It is contrary to nature and to be avoided when nothing better is at stake; but it does no harm to the one thing that matters.',
  },
  {
    id: 'courage',
    name: 'Courage',
    basket: 'good',
    why: 'A virtue: knowledge of what is to be feared and what is not. Good, full stop.',
  },
  {
    id: 'hairs',
    name: 'Having an odd number of hairs on your head',
    basket: 'indifferent',
    why:
      'The Stoics’ own example. Some indifferents move neither impulse nor aversion at all: whether the hairs on your head are odd or even, whether you extend this finger or that. Wholly indifferent, and a useful reminder that “preferred” is a real category and not a euphemism.',
  },
  {
    id: 'pain',
    name: 'Pain',
    basket: 'dispreferred',
    why:
      'Dispreferred. Contrary to nature, reasonably avoided, and of no consequence to whether you are living well. The sage on the rack is still happy, which the Stoics knew sounded absurd and defended anyway.',
  },
  {
    id: 'reputation',
    name: 'A good reputation',
    basket: 'preferred',
    why:
      'Preferred. Chrysippus counted good repute among things with selective value, though the school argued about how much. Not good: it can be had by a scoundrel and lost by a saint.',
  },
  {
    id: 'injustice',
    name: 'Injustice',
    basket: 'bad',
    why: 'A vice. Bad, and the only kind of thing that is.',
  },
  {
    id: 'poverty',
    name: 'Poverty',
    basket: 'dispreferred',
    why:
      'Dispreferred. To be avoided if it can be, and not a harm to the one who has it. Cleanthes drew water at night to fund his days with Zeno and was not the worse philosopher for it.',
  },
  {
    id: 'finger',
    name: 'Bending or stretching a finger',
    basket: 'indifferent',
    why:
      'The other stock example of the wholly indifferent. Nothing in nature bids you do either. That such things exist shows that the Stoic ladder of value has a real bottom rung.',
  },
]

export const ethicsSources = [
  'Diogenes Laertius 7.84–131 (the division of ethics; the good, the bad and the indifferent at 7.101–107)',
  'Stobaeus, Anthology 2.7.5–7 (Arius Didymus’ summary of Stoic ethics)',
  'Cicero, On Ends 3.16–22 and 3.50–54 (oikeiōsis; preferred and dispreferred indifferents)',
  'Diogenes Laertius 7.160–161 (Aristo of Chios, who denied the distinction)',
]
