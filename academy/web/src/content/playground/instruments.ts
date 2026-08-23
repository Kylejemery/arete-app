/**
 * The View from Above — the instruments.
 *
 * Fifteen ways to put a life, and the universe it happens in, into perspective.
 * Some compress an immense span into a graspable window (a year, a day, an
 * hour); others zoom through space, matter, or number. They share a shell — a
 * rail, a header, a reflection — but each carries its own body, discriminated
 * by `kind`, so the component can render a timeline for one and a scrollable
 * solar system for the next.
 *
 * Where a figure can be computed it is (positions, timestamps, week counts),
 * so the numbers stay honest. The reflections are close paraphrase of
 * public-domain translations, each with its standard reference.
 */

/** A life, in years — the day the personal instruments lay a life across. */
export const LIFE_YEARS = 80
/** The present, for turning historical dates into "years ago" / generations. */
export const PRESENT_YEAR = 2026
/** Shared age slider bounds. */
export const AGE_MIN = 0
export const AGE_MAX = 90
export const AGE_DEFAULT = 40

// ── shared shape ─────────────────────────────────────────────────────────────

type Reflection = { text: string; by: string }

type Base = {
  id: string
  /** Rail grouping. */
  section: string
  /** Small tag on the rail and header. */
  kicker: string
  /** Display title. */
  name: string
  /** One line under the title. */
  blurb: string
  /** Optional one-line "X → Y" shown in the header (non-timeline kinds). */
  mapping?: string
  /** Optional mono sub-line. */
  ratio?: string
  reflection: Reflection
}

export type TimelineEvent = {
  label: string
  detail?: string
  yearsAgo?: number
  atAge?: number
  emphasis?: boolean
}

export type Waypoint = { label: string; detail?: string; yearsAgo: number; emphasis?: boolean }
export type FutureEvent = { label: string; detail?: string; yearsAhead: number; emphasis?: boolean }
export type Milestone = { label: string; detail?: string; year: number; emphasis?: boolean }
export type Body = { name: string; modelMeters: number; realAU: string; size: string; emphasis?: boolean }
export type PowerStep = { exp: number; label: string; here: string; emphasis?: boolean }
export type NumberRow = { label: string; seconds: number; human: string; emphasis?: boolean }
export type TravelRow = { dest: string; km: number; emphasis?: boolean }

export type Instrument = Base &
  (
    | {
        kind: 'timeline'
        spanLabel: string
        intoLabel: string
        spanYears: number
        frame: 'calendar' | 'clock' | 'stopwatch' | 'week'
        anchor: 'present' | 'birth'
        events: TimelineEvent[]
      }
    | { kind: 'future'; events: FutureEvent[] }
    | { kind: 'relay'; spanYears: number; waypoints: Waypoint[]; stat: string }
    | { kind: 'generations'; yearsPerGen: number; maxGen: number; milestones: Milestone[] }
    | { kind: 'weeks'; perYear: number }
    | { kind: 'heartbeat'; bpm: number }
    | { kind: 'peppercorn'; sunNote: string; bodies: Body[] }
    | { kind: 'powers'; steps: PowerStep[] }
    | { kind: 'travel'; rows: TravelRow[] }
    | { kind: 'emptyAtom'; emptyPercent: string; stadium: string }
    | { kind: 'numbers'; rows: NumberRow[] }
  )

// ── the instruments ──────────────────────────────────────────────────────────

export const instruments: Instrument[] = [
  // ═══════════════════════════ DEEP TIME ═══════════════════════════
  {
    kind: 'timeline',
    id: 'cosmic-calendar',
    section: 'Deep Time',
    kicker: 'The Cosmic Calendar',
    name: 'The Universe, as One Year',
    blurb:
      'The Big Bang is the first instant of January. Everything that has ever happened is squeezed into the year that follows — and everything you have a name for happens in its final minutes.',
    spanLabel: '13.8 billion years',
    intoLabel: 'a single calendar year',
    spanYears: 13.8e9,
    frame: 'calendar',
    anchor: 'present',
    ratio: 'One second ≈ 438 years · one day ≈ 37.8 million years',
    events: [
      { label: 'The Big Bang', detail: 'Space, time, and matter begin.', yearsAgo: 13.8e9, emphasis: true },
      { label: 'First stars ignite', detail: 'The dark ages of the cosmos end.', yearsAgo: 13.6e9 },
      { label: 'The Milky Way forms', detail: 'Our galaxy takes shape.', yearsAgo: 13.5e9 },
      { label: 'The Sun and Earth form', detail: 'A quiet suburb of one galaxy among trillions.', yearsAgo: 4.55e9, emphasis: true },
      { label: 'First life on Earth', detail: 'Single cells in the early oceans.', yearsAgo: 3.7e9 },
      { label: 'Oxygen fills the air', detail: 'Photosynthesis remakes the planet.', yearsAgo: 2.4e9 },
      { label: 'Complex cells appear', detail: 'The ancestor of everything you can see.', yearsAgo: 1.8e9 },
      { label: 'The Cambrian explosion', detail: 'Animal life bursts into variety.', yearsAgo: 5.38e8 },
      { label: 'First dinosaurs', detail: 'Life moves fully onto land and grows large.', yearsAgo: 2.3e8 },
      { label: 'The dinosaurs die', detail: 'An asteroid clears the stage for mammals.', yearsAgo: 6.6e7 },
      { label: 'Homo sapiens', detail: 'Our species — 300,000 years ago.', yearsAgo: 3.0e5, emphasis: true },
      { label: 'Farming begins', detail: 'The end of the last ice age, the first fields.', yearsAgo: 1.2e4 },
      { label: 'Writing, cities, history', detail: 'Everything in every history book.', yearsAgo: 5.0e3 },
      { label: 'Now', detail: 'This breath. Midnight, December 31.', yearsAgo: 0, emphasis: true },
    ],
    reflection: {
      text:
        'Think of the whole of existence, of which you are the tiniest part; and of the whole of time, in which a brief, fleeting instant has been assigned to you.',
      by: 'Marcus Aurelius, Meditations 5.24',
    },
  },
  {
    kind: 'timeline',
    id: 'earth-day',
    section: 'Deep Time',
    kicker: 'Deep Time',
    name: 'The Earth, as One Day',
    blurb:
      'The planet forms at midnight. Life shows up before breakfast, but stays microscopic almost all day. Everything you would recognise happens after dinner — and all of human history is the last flicker before midnight.',
    spanLabel: '4.54 billion years',
    intoLabel: 'a single day, midnight to midnight',
    spanYears: 4.54e9,
    frame: 'clock',
    anchor: 'present',
    ratio: 'One second ≈ 52,500 years · one hour ≈ 189 million years',
    events: [
      { label: 'Earth forms', detail: 'A molten world under bombardment.', yearsAgo: 4.54e9, emphasis: true },
      { label: 'First life', detail: 'Microbes in the young oceans — before 4 a.m.', yearsAgo: 3.7e9 },
      { label: 'The air turns breathable', detail: 'Cyanobacteria pump out oxygen.', yearsAgo: 2.4e9 },
      { label: 'Complex cells', detail: 'The cell with a nucleus — mid-afternoon.', yearsAgo: 1.8e9 },
      { label: 'Multicellular life', detail: 'Bodies, at last. Early evening.', yearsAgo: 8.0e8 },
      { label: 'The Cambrian explosion', detail: 'Animals diversify — around 9 p.m.', yearsAgo: 5.38e8 },
      { label: 'First dinosaurs', detail: 'Roughly 10:45 p.m.', yearsAgo: 2.3e8 },
      { label: 'The dinosaurs die', detail: 'About 11:39 p.m.', yearsAgo: 6.6e7 },
      { label: 'Homo sapiens', detail: 'Six seconds before midnight.', yearsAgo: 3.0e5, emphasis: true },
      { label: 'All of recorded history', detail: 'The final tenth of a second.', yearsAgo: 5.0e3 },
      { label: 'Midnight', detail: 'Now.', yearsAgo: 0, emphasis: true },
    ],
    reflection: {
      text:
        'Asia and Europe are corners of the cosmos; the whole sea a drop; Mount Athos a clod of earth; all the present a point in eternity.',
      by: 'Marcus Aurelius, Meditations 6.36',
    },
  },
  {
    kind: 'timeline',
    id: 'humanity-hour',
    section: 'Deep Time',
    kicker: 'Our Species',
    name: 'Humankind, as One Hour',
    blurb:
      'The clock starts when the first humans appear. For most of the hour we are hunters and gatherers under open sky. Farming, writing, empires, engines, the internet — everything you would call civilisation — is the last sixty seconds.',
    spanLabel: '300,000 years',
    intoLabel: 'a single hour',
    spanYears: 3.0e5,
    frame: 'stopwatch',
    anchor: 'present',
    ratio: 'One minute = 5,000 years · one second ≈ 83 years',
    events: [
      { label: 'The first humans', detail: 'Anatomically modern Homo sapiens.', yearsAgo: 3.0e5, emphasis: true },
      { label: 'Out of Africa', detail: 'People spread across the world.', yearsAgo: 7.0e4 },
      { label: 'Cave painting', detail: 'The first art we still have.', yearsAgo: 4.0e4 },
      { label: 'Farming begins', detail: 'The last three minutes.', yearsAgo: 1.1e4, emphasis: true },
      { label: 'Writing and the first cities', detail: 'The last minute begins.', yearsAgo: 5.0e3 },
      { label: 'The Roman Empire', detail: '24 seconds before the end.', yearsAgo: 2.0e3 },
      { label: 'The printing press', detail: 'Seven seconds left.', yearsAgo: 5.7e2 },
      { label: 'The Industrial Revolution', detail: 'The last three seconds.', yearsAgo: 2.5e2 },
      { label: 'The internet', detail: 'The final half-second.', yearsAgo: 4.0e1 },
      { label: 'Now', detail: 'The stroke of the hour.', yearsAgo: 0, emphasis: true },
    ],
    reflection: {
      text:
        'Alexander the Great and his stable-boy were levelled alike in death, and taken up into the same generative reason of the world.',
      by: 'Marcus Aurelius, Meditations 6.24',
    },
  },
  {
    kind: 'timeline',
    id: 'history-week',
    section: 'Deep Time',
    kicker: 'Recorded History',
    name: 'Civilisation, as One Week',
    blurb:
      'Writing begins Monday at dawn. The pyramids go up Monday afternoon; Socrates teaches on Thursday; Rome rises and falls by Friday. The modern world is Sunday evening, and your own lifetime is the last few minutes before you sleep.',
    spanLabel: '5,000 years',
    intoLabel: 'a single week, Monday to Sunday',
    spanYears: 5.0e3,
    frame: 'week',
    anchor: 'present',
    ratio: 'One day ≈ 714 years · one hour ≈ 30 years',
    events: [
      { label: 'Writing begins', detail: 'Sumer, Monday at dawn.', yearsAgo: 5.0e3, emphasis: true },
      { label: 'The Great Pyramid', detail: 'Monday afternoon.', yearsAgo: 4.6e3 },
      { label: 'Socrates and Athens', detail: 'Thursday.', yearsAgo: 2.45e3, emphasis: true },
      { label: 'Height of the Roman Empire', detail: 'Friday.', yearsAgo: 1.9e3 },
      { label: 'Fall of the Western Empire', detail: 'Friday evening.', yearsAgo: 1.55e3 },
      { label: 'The Renaissance', detail: 'Sunday.', yearsAgo: 5.5e2 },
      { label: 'The Industrial Revolution', detail: 'Sunday evening.', yearsAgo: 2.5e2 },
      { label: 'The World Wars', detail: 'The last hour.', yearsAgo: 9.0e1 },
      { label: 'Now', detail: 'Sunday, just before midnight.', yearsAgo: 0, emphasis: true },
    ],
    reflection: {
      text:
        'Consider the reign of Vespasian: people marrying, raising children, falling ill, warring, feasting, trading, farming — and of all that life not a trace remains.',
      by: 'Marcus Aurelius, Meditations 4.32',
    },
  },
  {
    kind: 'future',
    id: 'the-view-ahead',
    section: 'Deep Time',
    kicker: 'What Is Still to Come',
    name: 'The View Ahead',
    blurb:
      'We only ever look back. Turn around. Almost all of time is still in front of us — the Sun has billions of years left, and the universe will not go truly dark for longer than there are zeroes to write. You are not near the end of the story. You are in its bright morning.',
    mapping: 'From now → 10¹⁰⁰ years ahead, on a logarithmic axis',
    ratio: 'Each step to the right is ten times deeper into the future.',
    events: [
      { label: 'One thousand years', detail: "Today's languages are unreadable; almost nothing built now survives.", yearsAhead: 1e3 },
      { label: 'Ten thousand years', detail: 'The present warm age of the Earth is ending.', yearsAhead: 1e4 },
      { label: 'One hundred thousand years', detail: 'The constellations have dissolved; the night sky is unrecognisable.', yearsAhead: 1e5 },
      { label: 'One million years', detail: 'The average lifetime of a mammal species. Ours, perhaps, included.', yearsAhead: 1e6, emphasis: true },
      { label: 'Two hundred fifty million years', detail: 'A new supercontinent; the Sun has lapped the galaxy once more.', yearsAhead: 2.5e8 },
      { label: 'One billion years', detail: 'The Sun brightens; the oceans begin to boil away.', yearsAhead: 1e9 },
      { label: 'Five billion years', detail: 'The Sun swells to a red giant and swallows the inner planets.', yearsAhead: 5e9, emphasis: true },
      { label: 'One hundred billion years', detail: 'Other galaxies redshift out of sight; the sky empties.', yearsAhead: 1e11 },
      { label: 'The last stars fade', detail: 'Star formation ends. The long Degenerate Era begins.', yearsAhead: 1e14 },
      { label: 'Only black holes remain', detail: 'Even matter may come undone.', yearsAhead: 1e40 },
      { label: 'Heat death', detail: 'The last black hole evaporates. Time stops meaning anything.', yearsAhead: 1e100, emphasis: true },
    ],
    reflection: {
      text: 'The universe is change; our life is what our thoughts make it.',
      by: 'Marcus Aurelius, Meditations 4.3',
    },
  },
  {
    kind: 'relay',
    id: 'unbroken-relay',
    section: 'Deep Time',
    kicker: 'The Thread',
    name: 'The Unbroken Relay',
    blurb:
      'A single living thread runs from the first cell in the ancient sea all the way to you — and not one link in it ever broke. Every one of your ancestors, across billions of years, lived long enough to pass life on. You are the standing tip of the longest winning streak there is.',
    spanYears: 3.8e9,
    mapping: 'One continuous line, 3.8 billion years long',
    ratio: 'Every link held. You are its current end.',
    stat: '≈ 3.8 billion years · an unbroken chain of living things, not one of which died before passing life on.',
    waypoints: [
      { label: 'The first living cell', detail: 'In the early oceans.', yearsAgo: 3.8e9, emphasis: true },
      { label: 'The first animals', detail: 'Soft bodies in warm seas.', yearsAgo: 6.0e8 },
      { label: 'The first vertebrates', detail: 'A spine, a plan for a body.', yearsAgo: 5.2e8 },
      { label: 'The first mammals', detail: 'Small, warm, awake at night.', yearsAgo: 2.25e8 },
      { label: 'The first primates', detail: 'Hands, and eyes that face forward.', yearsAgo: 6.6e7 },
      { label: 'The first humans', detail: 'Faces you would know.', yearsAgo: 3.0e5 },
      { label: 'Your grandparents', detail: 'Two generations back.', yearsAgo: 60 },
      { label: 'You', detail: 'The link that is currently holding.', yearsAgo: 0, emphasis: true },
    ],
    reflection: {
      text:
        'You came into the world as a part, and you will vanish into that which produced you — or rather, be taken back, by change, into its generative reason.',
      by: 'Marcus Aurelius, Meditations 4.14',
    },
  },

  // ═══════════════════════════ THE SELF ═══════════════════════════
  {
    kind: 'timeline',
    id: 'a-life',
    section: 'The Self',
    kicker: 'A Day',
    name: 'A Life, as a Single Day',
    blurb:
      'Lay a whole life across a single day and set the hand to your age. Not to frighten you — to locate you. What time is it where you are, and how do you want to spend the afternoon?',
    spanLabel: 'about eighty years',
    intoLabel: 'one day, dawn to dark',
    spanYears: LIFE_YEARS,
    frame: 'clock',
    anchor: 'birth',
    ratio: 'One year of life = eighteen minutes · one hour ≈ 3.3 years',
    events: [
      { label: 'Birth', detail: 'Midnight. The day begins.', atAge: 0, emphasis: true },
      { label: 'First memories', detail: 'Around 1 a.m.', atAge: 4 },
      { label: 'Childhood', detail: 'Before dawn.', atAge: 10 },
      { label: 'Coming of age', detail: 'Sunrise, near 6 a.m.', atAge: 18, emphasis: true },
      { label: 'Building a life', detail: 'The long working morning.', atAge: 30 },
      { label: 'Midlife', detail: 'Noon. Exactly halfway.', atAge: 40, emphasis: true },
      { label: 'The afternoon', detail: 'What you make of what you built.', atAge: 55 },
      { label: 'Elderhood', detail: 'Evening, the light going gold.', atAge: 68 },
      { label: 'The last hours', detail: 'Late, and grateful for the day.', atAge: 80, emphasis: true },
    ],
    reflection: {
      text:
        'It is not that we have a short time to live, but that we waste much of it. Life is long enough if you know how to use it.',
      by: 'Seneca, On the Shortness of Life 1',
    },
  },
  {
    kind: 'weeks',
    id: 'four-thousand-weeks',
    section: 'The Self',
    kicker: 'The Whole Allowance',
    name: 'Four Thousand Weeks',
    blurb:
      'A long human life is about four thousand weeks. Here they are — one dot each. Set your age and watch the spent ones fill in. It is the smallness of the grid, not any single week, that does the work.',
    perYear: 52,
    mapping: 'A life ≈ 4,700 weeks — one dot each',
    ratio: 'Every filled square is a week already behind you.',
    reflection: {
      text: 'You act like mortals in all that you fear, and like immortals in all that you desire.',
      by: 'Seneca, On the Shortness of Life 3',
    },
  },
  {
    kind: 'heartbeat',
    id: 'heartbeat-budget',
    section: 'The Self',
    kicker: 'The Counter',
    name: 'The Heartbeat Budget',
    blurb:
      'A life is roughly three billion heartbeats — a fixed allowance, spent whether you attend to it or not. One is being spent right now, and now again. Set your age to see how much of the budget is behind you.',
    bpm: 70,
    mapping: '≈ 2.9 billion beats in a lifetime',
    ratio: 'About seventy a minute — spent whether you notice or not.',
    reflection: {
      text:
        'Even were you to live three thousand years, remember that no one loses any life but the one he is living, nor lives any but the one he loses.',
      by: 'Marcus Aurelius, Meditations 2.14',
    },
  },
  {
    kind: 'generations',
    id: 'relay-of-generations',
    section: 'The Self',
    kicker: 'The Line of Hands',
    name: 'The Relay of Generations',
    blurb:
      'History feels far away until you count it in people. At about twenty-five years to a generation, the whole of written civilisation is only a few hundred sets of hands, passed one to the next. Slide back through them and see who is really that close.',
    yearsPerGen: 25,
    maxGen: 480,
    mapping: 'One handshake per generation, ~25 years each',
    ratio: '480 generations ≈ 12,000 years — the whole of settled human life.',
    milestones: [
      { label: 'Your grandparents', year: 1960 },
      { label: 'The American Revolution', year: 1776 },
      { label: 'Shakespeare', year: 1600 },
      { label: 'The Black Death', year: 1350 },
      { label: 'The Norman Conquest', year: 1066 },
      { label: 'Charlemagne', year: 800 },
      { label: 'Julius Caesar', year: -44, emphasis: true },
      { label: 'The founding of Rome', year: -753 },
      { label: 'The Great Pyramid', year: -2560, emphasis: true },
      { label: 'The first writing', year: -3200 },
      { label: 'The first farmers', year: -10000, emphasis: true },
    ],
    reflection: {
      text: 'Cast your eyes over the vast procession of ages gone by, and the endless span still to come.',
      by: 'Marcus Aurelius, Meditations 4.50',
    },
  },

  // ═══════════════════════════ SPACE ═══════════════════════════
  {
    kind: 'peppercorn',
    id: 'peppercorn-solar-system',
    section: 'Space',
    kicker: 'To Scale',
    name: 'The Peppercorn Solar System',
    blurb:
      'Almost every picture of the solar system lies about distance to fit the page. This one does not. Shrink the Sun to a twenty-centimetre ball, and the planets become pinheads scattered down a corridor nearly a kilometre long. Scroll out through the emptiness — the space between the dots is the truth of the place.',
    sunNote: 'the Sun — a 20 cm ball',
    mapping: 'Sun → a 20 cm ball; Earth → a peppercorn 26 m away',
    ratio: 'Neptune is a pinhead three-quarters of a kilometre out. Between the dots: nothing.',
    bodies: [
      { name: 'Mercury', modelMeters: 10, realAU: '0.39 AU', size: 'a pinhead' },
      { name: 'Venus', modelMeters: 19, realAU: '0.72 AU', size: 'a peppercorn' },
      { name: 'Earth', modelMeters: 26, realAU: '1.0 AU', size: 'a peppercorn', emphasis: true },
      { name: 'Mars', modelMeters: 40, realAU: '1.5 AU', size: 'a pinhead' },
      { name: 'Jupiter', modelMeters: 135, realAU: '5.2 AU', size: 'a chestnut' },
      { name: 'Saturn', modelMeters: 247, realAU: '9.5 AU', size: 'a hazelnut' },
      { name: 'Uranus', modelMeters: 493, realAU: '19 AU', size: 'a peanut' },
      { name: 'Neptune', modelMeters: 776, realAU: '30 AU', size: 'a peanut', emphasis: true },
    ],
    reflection: {
      text:
        'No longer merely breathe with the air that surrounds you, but think now with the mind that embraces all things.',
      by: 'Marcus Aurelius, Meditations 8.54',
    },
  },
  {
    kind: 'powers',
    id: 'powers-of-ten',
    section: 'Space',
    kicker: 'Zoom by Ten',
    name: 'Powers of Ten',
    blurb:
      'Start at your own height and multiply by ten, again and again, out to the edge of the observable universe — then divide by ten, down past the cell to the quark. You sit almost exactly halfway between the largest thing there is and the smallest.',
    mapping: 'From the quark (10⁻¹⁸ m) to the cosmos (10²⁷ m)',
    ratio: 'Forty-five factors of ten from end to end; you are near the middle.',
    steps: [
      { exp: -18, label: '10⁻¹⁸ m', here: 'A quark — the smallest thing we can point to.' },
      { exp: -15, label: '10⁻¹⁵ m', here: 'A proton, deep in the nucleus of an atom.' },
      { exp: -10, label: '10⁻¹⁰ m', here: 'A single atom.' },
      { exp: -9, label: '10⁻⁹ m', here: 'The width of a strand of DNA.' },
      { exp: -6, label: '10⁻⁶ m', here: 'A bacterium; a cell of your own body.' },
      { exp: -3, label: '10⁻³ m', here: 'A grain of sand.' },
      { exp: 0, label: '10⁰ m', here: 'You. One metre, give or take.', emphasis: true },
      { exp: 3, label: '10³ m', here: 'A town; a walk across it.' },
      { exp: 6, label: '10⁶ m', here: 'A large country.' },
      { exp: 7, label: '10⁷ m', here: 'The whole Earth.' },
      { exp: 9, label: '10⁹ m', here: 'The Sun, and the space around it.' },
      { exp: 12, label: '10¹² m', here: 'The orbits of the inner planets.' },
      { exp: 16, label: '10¹⁶ m', here: 'One light-year; the nearest stars.' },
      { exp: 21, label: '10²¹ m', here: 'The Milky Way, end to end.' },
      { exp: 23, label: '10²³ m', here: 'Our local group of galaxies.' },
      { exp: 26, label: '10²⁶ m', here: 'The observable universe, entire.' },
    ],
    reflection: {
      text:
        'How small a part of the boundless abyss of time is allotted to each of us; how small a part of the universal substance.',
      by: 'Marcus Aurelius, Meditations 12.32',
    },
  },
  {
    kind: 'travel',
    id: 'cost-of-the-void',
    section: 'Space',
    kicker: 'The Emptiness',
    name: 'The Cost of the Void',
    blurb:
      'Space is not big so much as empty — empty on a scale the body cannot feel. So measure it in something the body knows: driving. Hold the wheel at highway speed and never stop, and see how long the nothing takes to cross. Or switch to the fastest thing there is, and watch even light struggle.',
    mapping: 'Every distance, as travel time — never stopping',
    ratio: 'By car, the galaxy’s centre is twenty times older than the universe away.',
    rows: [
      { dest: 'The Moon', km: 384400 },
      { dest: 'The Sun', km: 1.496e8, emphasis: true },
      { dest: 'Neptune', km: 4.5e9 },
      { dest: 'Voyager 1, right now', km: 2.4e10 },
      { dest: 'The nearest star', km: 4.0e13, emphasis: true },
      { dest: 'The centre of the galaxy', km: 2.5e17, emphasis: true },
    ],
    reflection: {
      text:
        'You will gain ample room by grasping the whole universe in your mind, and contemplating the eternity of time.',
      by: 'Marcus Aurelius, Meditations 9.32',
    },
  },

  // ═══════════════════════════ MATTER ═══════════════════════════
  {
    kind: 'emptyAtom',
    id: 'mostly-empty',
    section: 'Matter',
    kicker: 'What You Are Made Of',
    name: 'You Are Mostly Empty',
    blurb:
      'Reach for the small the way the other instruments reach for the large. An atom is almost entirely nothing: a nucleus like a marble at the centre of an empty stadium, with everything else a blur of field. The solid floor never actually touches your feet — it is force holding force apart.',
    emptyPercent: '99.9999999999999%',
    stadium: 'If the nucleus were a marble at the centre circle, the atom’s edge would be the far stands.',
    mapping: 'Nucleus → a marble; the atom → a stadium around it',
    ratio: 'You are ~99.9999999999999% empty space, held up by force, not stuff.',
    reflection: {
      text:
        'All things are woven together, and the bond is holy; there is one universe made up of all things, and one substance running through it all.',
      by: 'Marcus Aurelius, Meditations 7.9',
    },
  },

  // ═══════════════════════════ NUMBER ═══════════════════════════
  {
    kind: 'numbers',
    id: 'million-vs-billion',
    section: 'Number',
    kicker: 'Feel the Gap',
    name: 'A Million vs a Billion',
    blurb:
      'The mind treats a million and a billion as the same word with a different ending. They are not. The only way to feel the gap is to stop counting things and count seconds — then ask how long each number would take to run out.',
    mapping: 'Each number, counted off one second at a time',
    ratio: 'A billion is not a big million. It is a different world.',
    rows: [
      { label: 'A thousand seconds', seconds: 1e3, human: 'about 17 minutes — a coffee' },
      { label: 'A million seconds', seconds: 1e6, human: 'about 11½ days — a holiday', emphasis: true },
      { label: 'A billion seconds', seconds: 1e9, human: 'about 31.7 years — a career, a marriage', emphasis: true },
      { label: 'A trillion seconds', seconds: 1e12, human: 'about 31,700 years — older than the cave paintings' },
    ],
    reflection: {
      text: 'While we are postponing, life speeds by.',
      by: 'Seneca, Letters 1',
    },
  },
]
