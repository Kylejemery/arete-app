/**
 * Chrysippus's Cylinder — content for the Playground experiment.
 *
 * The analogy is preserved by Cicero, De Fato 42 to 43, where Chrysippus
 * answers the charge that fate destroys responsibility. Cicero's text is
 * quoted verbatim below from C.D. Yonge's translation (Bohn, 1853), which is
 * public domain and is in the corpus as the work "De Fato" (Yonge's chapter
 * 19; canonical section numbers differ from his chapters).
 *
 * One honest note about the extension. Cicero gives one shape, the cylinder,
 * and one contrast, a push against a rolling. The cone and the cube here are
 * ours: the argument turns on a thing's own nature deciding how it answers a
 * push, and the quickest way to see that is to push something else. The
 * characters in the second movement are ours too. Where the ancient text
 * stops and the illustration starts is marked in the interface, not left for
 * the reader to guess.
 */

// ── the two causes ───────────────────────────────────────────────────────────

export type Cause = {
  id: 'principal' | 'auxiliary'
  name: string
  latin: string
  gloss: string
  inTheScene: string
}

export const causes: Cause[] = [
  {
    id: 'auxiliary',
    name: 'The auxiliary cause',
    latin: 'causa adiuvans et proxima',
    gloss:
      'The nearby push. It explains why the thing moved now rather than later, and it comes from outside. Chrysippus grants the whole of it to fate without flinching: the push is not yours, and it was always going to come.',
    inTheScene: 'The hand at the left of the floor. Identical every time, whatever you set on the floor.',
  },
  {
    id: 'principal',
    name: 'The principal cause',
    latin: 'causa principalis et perfecta',
    gloss:
      'The thing’s own nature. It explains not that the thing moved but how: why this one ran true and that one came back to where it started. The push cannot account for the difference, because the push did not change.',
    inTheScene: 'The shape itself. It is the only thing you are allowed to change.',
  },
]

// ── the shapes ───────────────────────────────────────────────────────────────

export type ShapeId = 'cylinder' | 'cone' | 'cube'

export type Shape = {
  id: ShapeId
  name: string
  /** What it does when pushed, in three or four words */
  motion: string
  /** The one-line result printed after a push */
  result: string
  /** Why it does that */
  gloss: string
  /** Whether Cicero gives us this shape or we added it */
  ancient: boolean
  /** Physics: how the path is drawn. See the component. */
  path: 'straight' | 'arc' | 'halt'
}

export const shapes: Shape[] = [
  {
    id: 'cylinder',
    name: 'Cylinder',
    motion: 'Rolls, and keeps rolling',
    result: 'It ran true, and went far past the push.',
    gloss:
      'Cicero’s own case. The push gave it a beginning of motion, and nothing else. Everything after the first instant, the distance, the line, the fact that it rolled at all rather than skidding, came out of the cylinder. This is what Chrysippus wants: a motion fully caused from outside at its start and fully explained from inside thereafter.',
    ancient: true,
    path: 'straight',
  },
  {
    id: 'cone',
    name: 'Cone',
    motion: 'Rolls, and comes back round',
    result: 'It rolled, curved, and returned to where it began.',
    gloss:
      'A cone rolls about its own point, so it turns as it goes and arrives back near its start. It received the same push as the cylinder and made a circle of it. Nothing in the push accounts for the curve. Nothing outside the cone was ever going to.',
    ancient: false,
    path: 'arc',
  },
  {
    id: 'cube',
    name: 'Cube',
    motion: 'Tips once, and stops',
    result: 'It went over onto its face and stayed there.',
    gloss:
      'The same hand, the same force, and almost no motion. A cube has no rolling in it to give. Chrysippus’s point cuts this way too: if you want to say the push explains the outcome, you have to explain why this outcome is so different, and you cannot, because the push was the same.',
    ancient: false,
    path: 'halt',
  },
]

// ── the transfer ─────────────────────────────────────────────────────────────
//
// The second movement. An impression arrives, which is the push. A character
// receives it, which is the shape. The assent is what rolls.

export type CharacterId = 'trained' | 'quick' | 'rigid'

export type Character = {
  id: CharacterId
  /** The shape this character answers to */
  shape: ShapeId
  name: string
  gloss: string
}

export const characters: Character[] = [
  {
    id: 'trained',
    shape: 'cylinder',
    name: 'The trained mind',
    gloss:
      'Has worked on the one thing that is its own: what it agrees to. The impression arrives with the same force as for anyone. What follows is shaped by the work.',
  },
  {
    id: 'quick',
    shape: 'cone',
    name: 'The quick temper',
    gloss:
      'Takes every impression at a run and curves. The anger goes out, circles, and comes back to the same place it started, which is usually the self.',
  },
  {
    id: 'rigid',
    shape: 'cube',
    name: 'The settled grudge',
    gloss:
      'Will not be moved, and calls that strength. The impression lands, tips it once into a fixed position, and there it stays for years.',
  },
]

export type Impression = {
  id: string
  /** The push, in the second person */
  scene: string
  /** A handle for it in running prose */
  short: string
  /** What each character assents to. Same push, three motions. */
  assent: Record<CharacterId, string>
}

export const impressions: Impression[] = [
  {
    id: 'insult',
    short: 'the insult',
    scene: 'Someone talks over you in a meeting, then repeats your point as their own and is thanked for it.',
    assent: {
      trained:
        'The impression says: you have been robbed and made small. The trained mind notices that two things arrived together, an event and a verdict, and that only the first is outside. It lets the verdict go and keeps the event, which is that the point is now in the room, where it was needed.',
      quick:
        'The impression says: you have been robbed and made small. Agreed, instantly, and the whole afternoon goes into the reply. By evening the anger has made its circuit and is back where it began, with nothing said and nothing changed.',
      rigid:
        'The impression says: you have been robbed and made small. Agreed, and filed. The person is now a thief and will be a thief in four years, because nothing further will be admitted about them.',
    },
  },
  {
    id: 'passed-over',
    short: 'the promotion',
    scene: 'The work you did for eighteen months is given to someone else to finish, and announced without your name on it.',
    assent: {
      trained:
        'The impression says: this is an injustice and it is unbearable. The first half may well be true and is worth acting on. The second half is the addition, and it is the only part that makes the day unliveable, so it is the part that gets examined.',
      quick:
        'The impression says: this is an injustice and it is unbearable. Both halves taken at once. The response is large, immediate, and aimed at whoever is nearest, which is rarely whoever decided.',
      rigid:
        'The impression says: this is an injustice and it is unbearable. Taken once and held. The work stops being something to do well and becomes evidence in a case that will never be heard.',
    },
  },
  {
    id: 'cancelled',
    short: 'the cancelled evening',
    scene: 'A friend cancels an hour before, for the third time, with a message that reads as though it cost nothing to send.',
    assent: {
      trained:
        'The impression says: you are not worth the trouble to them. That is a claim about another mind, and it arrived free of evidence. What is actually in hand is three cancellations, which is a fact worth raising with them directly, and an evening that is now yours.',
      quick:
        'The impression says: you are not worth the trouble to them. Agreed at speed. A message is drafted, sharpened, sent, regretted, and the evening is spent on the reply to the reply.',
      rigid:
        'The impression says: you are not worth the trouble to them. Agreed, and the friendship is quietly downgraded without the friend being told, which guarantees the fourth cancellation.',
    },
  },
]

// ── the text ─────────────────────────────────────────────────────────────────

/**
 * Verbatim from Yonge's public-domain translation, held in rag_corpus as
 * De Fato ch. 18 to ch. 19. Quoted as it stands.
 */
export const passage = {
  text:
    'As then, says he, a man who pushes a cylinder gives it a principle of motion, but not immediately that of revolution; so an object strikes our sense and conveys its image to our soul, yet leaves us free to form our specific sentiment concerning it; and, as has been said in the case of the cylinder which is set in motion from without, it will continue for the future to move according to its own proper force and nature.',
  citation: 'Cicero, On Fate 42 to 43',
  translator: 'tr. C.D. Yonge, 1853',
}

/** The sentence just before it, which sets up the distinction. */
export const setup = {
  text:
    'They grant that sentiments cannot arise without some corresponding action of the sense, yet they say that this action, having a proximate cause, not a principal one, takes place as Chrysippus conjectures.',
  citation: 'Cicero, On Fate 41',
  translator: 'tr. C.D. Yonge, 1853',
}

export const closing =
  'The argument is not that you are outside the order of causes. It is that you are one of them. The push is fate’s; the rolling is yours; and a thing can be fully caused and still be the kind of thing it is.'
