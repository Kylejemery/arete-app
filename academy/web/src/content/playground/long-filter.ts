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
 */
export const PHOENIX_RATE = 1e-9

/** K = ln(1/s₀) ≈ 20.72. The log distance a species has to cross. */
export const LOG_DISTANCE = Math.log(1 / PHOENIX_RATE)

/** Technological civilizations arising per year in the galaxy (Ṅ). */
export const ARISING_PER_YEAR = 0.01

/** Baseline annual error hazard at the start of the transition (p_e0). */
export const ERROR_HAZARD_BASE = 1e-5

/** Irreducible external hazard (p_x). Its reciprocal is L_ℓ. */
export const EXTERNAL_HAZARD = 1e-8

/**
 * The moral threshold, R* = log(Ṅ/p_x) / log(1/(e·s₀)) ≈ 0.700.
 *
 * Malice decomposes to f_v = (e·s₀)^R, so the count crosses one at a ratio of
 * logarithms — which is why it barely moves when the badly known parameters do.
 */
export const MORAL_THRESHOLD =
  Math.log(ARISING_PER_YEAR / EXTERNAL_HAZARD) / Math.log(1 / (Math.E * PHOENIX_RATE))

/** Phase-diagram axes: the moral ratio R, log-scaled, and the capability gap d. */
export const RATIO_MIN = 0.02
export const RATIO_MAX = 2.5
export const GAP_MIN = -0.002
export const GAP_MAX = 0.004

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
