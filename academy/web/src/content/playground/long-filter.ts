/**
 * The Long Filter — the fixed quantities behind the working note.
 *
 * The prose lives in the component; what sits here is the material the page
 * computes over: the plate of civilizations, the two axes of the Λ table, and
 * the ledger of what a post-transition civilization dissolves and what stands
 * in its place.
 */

/** Marks on the plate — one civilization each. */
export const CIVILIZATIONS = 1000

/** Halving period, in years, when the risk is set to decay. */
export const HALVING_YEARS = 1000

/** Fixed seed for the plate scatter, so the field is stable across redraws. */
export const SCATTER_SEED = 20260825

/** Λ table rows: annual probability of self-destruction. */
export const LAMBDA_RISKS = [0.01, 0.003, 0.001, 0.0003]

/** Λ table columns: years to the moral transition (τ_v). */
export const LAMBDA_TAUS = [200, 500, 1000, 2000, 5000]

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
      body: 'Sages agree about virtue and disagree about facts. Two of them reading the same models will differ on the best pathway, and neither is failing at anything. Politics survives, and gets to be about the question rather than the players.',
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
      body: 'Bushels stay finite. What ends is rivalry, not scarcity. Markets were a way to coordinate between people who do not trust each other, and the coordination problem outlives the mistrust.',
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
