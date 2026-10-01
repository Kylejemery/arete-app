/**
 * The Long Filter — the fixed quantities behind the working note.
 *
 * The prose lives in the component; what sits here is the material the page
 * computes over: the plate of civilizations, the constants of the three-hazard
 * model, and the ledger of what a post-transition civilization dissolves and
 * what stands in its place.
 */

/** Marks on the plate — one civilization each. */
export const CIVILIZATIONS = 1000

/** Halving period, in years, when the risk is set to decay. */
export const HALVING_YEARS = 1000

/** Fixed seed for the plate scatter, so the field is stable across redraws. */
export const SCATTER_SEED = 20260825

/**
 * The phoenix rate: the baseline incidence of sagehood before anyone was
 * cultivating it deliberately. One in a billion, read off Seneca's remark in
 * the forty-second letter that the good man appears about once in five hundred
 * years — an empire of ~50 million living ~25 years each is ~10⁹ lives.
 *
 * The model's growing population is moral progressors (prokoptontes), not
 * sages, and progressors are far more common than sages. So this is used as a
 * conservative floor for their starting share s₀, not as an estimate of it.
 */
export const PHOENIX_RATE = 1e-9

/** K = ln(1/s₀) ≈ 20.72. The log distance a species has to cross. */
export const LOG_DISTANCE = Math.log(1 / PHOENIX_RATE)

/** Technological civilizations arising per year in the galaxy (Ṅ). */
export const ARISING_PER_YEAR = 0.01

/** Irreducible external hazard (p_x). Its reciprocal is L_ℓ. */
export const EXTERNAL_HAZARD = 1e-8

/**
 * The closed-form moral threshold of the earlier model, R* = log(Ṅ/p_x) /
 * log(1/(e·s₀)) ≈ 0.700, which assumed exponential growth to s = 1 and no
 * hazard after the transition. The live threshold is now computed numerically
 * (long-filter-model.ts, moralThreshold) and depends on g and s_max; this
 * constant survives only for prose that has not yet been revised.
 */
export const MORAL_THRESHOLD =
  Math.log(ARISING_PER_YEAR / EXTERNAL_HAZARD) / Math.log(1 / (Math.E * PHOENIX_RATE))

/**
 * When interstellar settlement arrives, in years from now: a hypothesis, not a
 * measurement. Settlements around other stars are years or centuries apart, so
 * they decouple their fates, and a civilization that reached them before
 * saturating would escape the filter by distance rather than by character. The
 * model assumes that does not happen in time; this is the date it assumes
 * against. Ten thousand years by default, adjustable from a thousand to a
 * million.
 */
export const SETTLEMENT_YEARS = 10_000
export const SETTLEMENT_MIN = 1_000
export const SETTLEMENT_MAX = 1_000_000

/** Phase-diagram axes: the moral ratio R, log-scaled, and the capability gap d. */
export const RATIO_MIN = 0.01
export const RATIO_MAX = 10
export const GAP_MIN = -0.005
export const GAP_MAX = 0.003

/** The ceiling on the progressor share, s_max: a dial from 0.90 to 1.00. */
export const CEILING_MIN = 0.9
export const CEILING_MAX = 1
export const CEILING_DEFAULT = 0.99

/** φ, the share of error that depends on conflict and so falls as progressors spread. */
export const CONFLICT_DEFAULT = 0.7

/** Who the note is by, and when this revision was written. */
export const BYLINE = 'Kyle'
export const REVISED = 'October 2026'

/**
 * Named settings for the phase diagram, in percent a year. The essay opens on
 * `realistic`; the others are the parameter sets the formal statement quotes,
 * so a reader can load each one rather than take the table on trust.
 */
export type Preset = {
  key: string
  label: string
  note: string
  malice: number
  growth: number
  errorBase: number
  gap: number
  /** s_max, as a fraction. */
  ceiling: number
  /** φ, as a fraction. */
  conflict: number
}

export const PRESETS: Preset[] = [
  {
    key: 'hellman',
    label: 'Hellman',
    note: 'p_m0 1%, optimistic error 10⁻⁵',
    malice: 1,
    growth: 0.6,
    errorBase: 0.001,
    gap: 0,
    ceiling: CEILING_DEFAULT,
    conflict: CONFLICT_DEFAULT,
  },
  {
    key: 'superforecasters',
    label: 'Superforecasters',
    note: 'p_m0 0.3%, optimistic error 10⁻⁵',
    malice: 0.3,
    growth: 0.6,
    errorBase: 0.001,
    gap: 0,
    ceiling: CEILING_DEFAULT,
    conflict: CONFLICT_DEFAULT,
  },
  {
    key: 'realistic',
    label: 'Realistic error',
    note: '70% of a 1% total is error',
    malice: 0.3,
    growth: 0.6,
    errorBase: 0.7,
    gap: 0,
    ceiling: CEILING_DEFAULT,
    conflict: CONFLICT_DEFAULT,
  },
  {
    key: 'outpace',
    label: 'Competence outpaces',
    note: 'the same, with d = −0.20%',
    malice: 0.3,
    growth: 0.6,
    errorBase: 0.7,
    gap: -0.2,
    ceiling: CEILING_DEFAULT,
    conflict: CONFLICT_DEFAULT,
  },
]

/** The setting the essay opens on. */
export const DEFAULT_PRESET = 'realistic'

/**
 * A link to the essay's phase diagram with a setting loaded, in percent a
 * year. The formal statement uses it so each row of a table can be tried.
 */
export function regionHref(malice: number, growth: number, errorBase: number, gap: number): string {
  return `/playground/the-long-filter?pm=${malice}&g=${growth}&pe=${errorBase}&d=${gap}#region`
}

/** Sources, quoted by both pages. */
export type Reference = { cite: string; href?: string }

export const REFERENCES: Reference[] = [
  {
    cite: 'Seneca, Epistulae Morales 42.1, trans. R. M. Gummere (1917–1925).',
    href: 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_42',
  },
  {
    cite: 'D. Brin, "The Great Silence: the Controversy Concerning Extraterrestrial Intelligent Life", Quarterly Journal of the Royal Astronomical Society 24 (1983), 283–309.',
    href: 'https://ui.adsabs.harvard.edu/abs/1983QJRAS..24..283B',
  },
  {
    cite: 'R. Hanson, "The Great Filter — Are We Almost Past It?" (1998).',
    href: 'http://mason.gmu.edu/~rhanson/greatfilter.html',
  },
  {
    cite: 'M. E. Hellman, "Risk Analysis of Nuclear Deterrence", The Bent of Tau Beta Pi (Spring 2008).',
  },
  {
    cite: 'E. Karger et al., Forecasting Existential Risk: Evidence from a Long-Run Forecasting Tournament, Forecasting Research Institute (2023).',
  },
  {
    cite: 'M. Eisner, "Long-Term Historical Trends in Violent Crime", Crime and Justice 30 (2003), 83–142.',
  },
  {
    cite: 'Our World in Data, "Literacy".',
    href: 'https://ourworldindata.org/literacy',
  },
  {
    cite: 'I. Chalmers and P. Glasziou, "Avoidable waste in the production and reporting of research evidence", The Lancet 374 (2009), 86–89.',
    href: 'https://doi.org/10.1016/S0140-6736(09)60329-9',
  },
]

/** One line of the survivors' ledger — what goes, and what takes its place. */
export type LedgerRow = {
  gone: { title: string; body: string }
  stays: { title: string; body: string }
}

export const LEDGER: LedgerRow[] = [
  {
    gone: {
      title: 'Militaries aimed at each other',
      body: 'Armies answer to hostile states. Hostile states are what wanting looks like when it meets an obstacle.',
    },
    stays: {
      title: 'Defence against what nobody chose',
      body: 'The capability does not vanish. It turns outward, to the external term: impact, burst, the slow arithmetic of a star. Not disarmament, which is a treaty between parties who would rearm if they could.',
    },
  },
  {
    gone: {
      title: 'Courts as contests',
      body: 'A lawsuit adjudicates between two people who each believe they were wronged and cannot settle it themselves.',
    },
    stays: {
      title: 'Mediation',
      body: 'A narrower job: not deciding who is right, but working out how an agreed principle applies to a case nobody anticipated when the principle was formed.',
    },
  },
  {
    gone: {
      title: 'Laws written against vice',
      body: 'Most of a legal code is a list of things people would otherwise do for gain.',
    },
    stays: {
      title: 'Rules argued on evidence',
      body: 'With fewer interests to serve, a law about a river or a weapon becomes mostly an empirical question. Still argued, often hard, but argued over the evidence rather than over who benefits.',
    },
  },
  {
    gone: {
      title: 'The state as an instrument of power',
      body: 'Sovereignty as the ability to compel, taxed and defended.',
    },
    stays: {
      title: 'The state as an instrument of judgment',
      body: 'Sages agree about virtue and hold the facts without judgment, taking them as they come until better evidence arrives. What stays open is the pathway: two of them reading the same models will weigh the same evidence differently, and neither is failing at anything. Politics survives, and gets to be about the question rather than the players.',
    },
  },
  {
    gone: { title: 'Policing as deterrence', body: 'Deterrence presupposes the deterrable, and there are far fewer of them.' },
    stays: {
      title: 'Care',
      body: 'Someone in crisis is not committing a crime. Someone who cannot look after themselves needs a person to come, and that person does not need to be armed.',
    },
  },
  {
    gone: {
      title: 'The wanting economy',
      body: 'Persuasion as an industry. Money as a motive rather than a tool.',
    },
    stays: {
      title: 'Allocation',
      body: 'Bushels stay finite. What ends is rivalry, not scarcity. Markets coordinated between people who did not trust each other, and the coordination problem outlives the mistrust.',
    },
  },
  {
    gone: {
      title: 'Secrecy',
      body: 'Most of what is hidden is hidden for advantage: the result that would cost a grant, the flaw that would cost a sale.',
    },
    stays: {
      title: 'Criticism, everywhere',
      body: 'The one kind of institution that grows rather than shrinks. Sages still err, which is the whole error term, so open review, audit and a press nobody owns become more central, not less. What changes is that nobody inside them is trying to win.',
    },
  },
  {
    gone: {
      title: 'The discount rate',
      body: 'At any rate we actually use, a payoff a thousand years out is worth nothing today, which is why nothing we build aims there.',
    },
    stays: {
      title: 'Deep time',
      body: 'Virtue is complete in the acting, so beginning a project whose result arrives in nine thousand years costs its author nothing. This, and not efficiency, is what changes which things can be built.',
    },
  },
]
