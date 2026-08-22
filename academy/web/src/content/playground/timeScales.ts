/**
 * The View from Above — time scales.
 *
 * Each scale compresses an immense real span into something a person can hold
 * in the mind: the whole universe into a year, the Earth into a day, our
 * species into an hour. Events carry only their *real* distance from now (in
 * years); the component computes where each one lands on the compressed window,
 * so the numbers stay honest and Sagan-free of hand-tuned dates.
 *
 * The final scale — A Life, as a Single Day — turns the exercise inward. It is
 * anchored at birth rather than the present, and the reader sets the age.
 *
 * The reflections are close paraphrase of public-domain translations, each
 * carrying its standard reference so it can be read against any edition.
 */

export type TimeEvent = {
  label: string;
  detail?: string;
  /** Real years before the present. Used when the scale is anchored at "now". */
  yearsAgo?: number;
  /** Real age in years. Used when the scale is anchored at "birth" (a life). */
  atAge?: number;
  /** Draw this one large — a hinge in the story. */
  emphasis?: boolean;
};

export type TimeScale = {
  id: string;
  /** Small tag on the rail. */
  kicker: string;
  /** Display title. */
  name: string;
  /** The real span being compressed, e.g. "13.8 billion years". */
  spanLabel: string;
  /** What it is compressed into, e.g. "a single calendar year". */
  intoLabel: string;
  /** The real span in years. Drives every position. */
  spanYears: number;
  /** How the compressed timestamp reads. */
  frame: 'calendar' | 'clock' | 'stopwatch' | 'week';
  /** Where zero sits: the present (deep-time scales) or birth (a life). */
  anchor: 'present' | 'birth';
  /** A plain-language conversion, e.g. "One second ≈ 438 years". */
  ratio: string;
  /** One line under the title. */
  blurb: string;
  events: TimeEvent[];
  reflection: { text: string; by: string };
};

/** A day, in years, so the personal scale reads in whole years of a life. */
export const LIFE_YEARS = 80;

export const timeScales: TimeScale[] = [
  {
    id: 'cosmic-calendar',
    kicker: 'The Cosmic Calendar',
    name: 'The Universe, as One Year',
    spanLabel: '13.8 billion years',
    intoLabel: 'a single calendar year',
    spanYears: 13.8e9,
    frame: 'calendar',
    anchor: 'present',
    ratio: 'One second ≈ 438 years · one day ≈ 37.8 million years',
    blurb:
      'The Big Bang is the first instant of January. Everything that has ever happened is squeezed into the year that follows — and everything you have a name for happens in its final minutes.',
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
    id: 'earth-day',
    kicker: 'Deep Time',
    name: 'The Earth, as One Day',
    spanLabel: '4.54 billion years',
    intoLabel: 'a single day, midnight to midnight',
    spanYears: 4.54e9,
    frame: 'clock',
    anchor: 'present',
    ratio: 'One second ≈ 52,500 years · one hour ≈ 189 million years',
    blurb:
      'The planet forms at midnight. Life shows up before breakfast, but it stays microscopic almost all day. Everything you would recognise happens after dinner — and all of human history is the last flicker before midnight.',
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
    id: 'humanity-hour',
    kicker: 'Our Species',
    name: 'Humankind, as One Hour',
    spanLabel: '300,000 years',
    intoLabel: 'a single hour',
    spanYears: 3.0e5,
    frame: 'stopwatch',
    anchor: 'present',
    ratio: 'One minute = 5,000 years · one second ≈ 83 years',
    blurb:
      'The clock starts when the first humans appear. For most of the hour we are hunters and gatherers under open sky. Farming, writing, empires, engines, the internet — everything you would call civilisation — is the last sixty seconds.',
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
    id: 'history-week',
    kicker: 'Recorded History',
    name: 'Civilisation, as One Week',
    spanLabel: '5,000 years',
    intoLabel: 'a single week, Monday to Sunday',
    spanYears: 5.0e3,
    frame: 'week',
    anchor: 'present',
    ratio: 'One day ≈ 714 years · one hour ≈ 30 years',
    blurb:
      'Writing begins Monday at dawn. The pyramids go up Monday afternoon; Socrates teaches on Thursday; Rome rises and falls by Friday. The modern world is Sunday evening, and your own lifetime is the last few minutes before you sleep.',
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
    id: 'a-life',
    kicker: 'The View, Turned Inward',
    name: 'A Life, as a Single Day',
    spanLabel: 'about eighty years',
    intoLabel: 'one day, dawn to dark',
    spanYears: LIFE_YEARS,
    frame: 'clock',
    anchor: 'birth',
    ratio: 'One year of life = eighteen minutes · one hour ≈ 3.3 years',
    blurb:
      'The last scale is the one you are standing on. Lay a whole life across a single day and set the hand to your age. Not to frighten you — to locate you. What time is it where you are, and how do you want to spend the afternoon?',
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
];
