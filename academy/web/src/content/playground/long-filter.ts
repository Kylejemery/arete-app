/**
 * The Long Filter — the fixed quantities behind the working note.
 *
 * The prose lives in the component; what sits here is the material the page
 * computes over: the plate of civilizations, the constants that turn a p/g
 * ratio into a population of survivors, the two axes of the matrix, and the
 * ledger of what a post-transition civilization dissolves and what stands in
 * its place.
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
 */
export const PHOENIX_RATE = 1e-9

/** Technological civilizations arising per year in the galaxy (Ṅ). */
export const ARISING_PER_YEAR = 0.01

/** Mean lifetime of a transitioned civilization, in years (L_ℓ). */
export const LONG_LIFETIME = 1e8

/**
 * The p/g ratio at which exactly one transitioned civilization is expected.
 *
 * n = Ṅ · s₀^(p/g) · L_ℓ = 10⁶ · 10^(−9·p/g), so n = 1 at p/g = 2/3 — moral
 * improvement running 1.5× faster than annual catastrophic risk.
 */
export const THRESHOLD_RATIO = 2 / 3

/** Where the evidence puts us: 1% annual risk against 0.6% annual improvement. */
export const ANCHOR_RISK = 0.01
export const ANCHOR_IMPROVEMENT = 0.006

/** Matrix rows: annual probability of self-destruction. */
export const MATRIX_RISKS = [0.01, 0.003, 0.001, 0.0003]

/** Matrix columns: annual growth rate of the sage fraction. */
export const MATRIX_RATES = [0.001, 0.003, 0.006, 0.01, 0.02]

/** One line of the survivors' ledger — what goes, and what takes its place. */
export type LedgerRow = {
  gone: { title: string; body: string }
  stays: { title: string; body: string }
}

export const LEDGER: LedgerRow[] = [
  {
    gone: {
      title: 'Militaries',
      body: 'Armies answer to hostile states. Hostile states are what wanting looks like when it meets an obstacle.',
    },
    stays: {
      title: 'Nothing',
      body: 'Not disarmament, which is a treaty between parties who would rearm if they could. Closer to the way we no longer maintain city walls.',
    },
  },
  {
    gone: {
      title: 'Courts',
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
      title: 'Rules that are simply correct',
      body: 'With no interest to be served, a law about a river or a weapon becomes an empirical question with a findable answer, contested only over the evidence.',
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
    gone: { title: 'Policing', body: 'Deterrence presupposes the deterrable.' },
    stays: {
      title: 'Care',
      body: 'Someone in crisis is not committing a crime. Someone who cannot look after himself needs a person to come, and that person does not need to be armed.',
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
      title: 'The discount rate',
      body: 'At any rate we actually use, a payoff a thousand years out is worth nothing today, which is why nothing we build aims there.',
    },
    stays: {
      title: 'Deep time',
      body: 'Virtue is complete in the acting, so beginning a project whose result arrives in nine thousand years costs its author nothing. This, and not efficiency, is what changes which things can be built.',
    },
  },
]
