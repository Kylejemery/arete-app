/**
 * The Long Filter, formal statement — the tables.
 *
 * The prose and the derivations live in the component; what sits here is every
 * table the companion note quotes, so the numbers can be checked in one place
 * rather than hunted through markup. Figures are as computed for the essay;
 * where a row is an empirical anchor rather than a model output, the section it
 * comes from says so.
 */

import { regionHref } from './long-filter'

export type Row = (string | number)[]
/** `links`, when present, holds one essay link per row: that row's setting loaded into the phase diagram. */
export type Table = { head: string[]; rows: Row[]; links?: string[] }

/** §0 — every symbol the note uses, with units. */
export const NOTATION: Table = {
  head: ['Symbol', 'Meaning', 'Units'],
  rows: [
    ['p_m', 'Malice hazard. Deliberate destruction for gain, status, or rivalry', 'yr⁻¹'],
    ['p_e', 'Error hazard. Accident, misjudgment, design flaw, miscalculation', 'yr⁻¹'],
    ['p_x', 'External hazard. Impact, burst, stellar, geological. Irreducible', 'yr⁻¹'],
    ['n', 'Years elapsed since acquiring the capability', 'yr'],
    ['S(n)', 'Probability of surviving n years', '—'],
    ['H', 'Halving time of the hazard rate, in the declining-hazard model', 'yr'],
    ['s', 'Share of moral progressors (prokoptontes) in the population', '—'],
    ['s₀', 'Starting share, floored at the phoenix rate of sagehood', '—'],
    ['s_max', 'Ceiling on the progressor share: those who ever move', '—'],
    ['g', 'Growth rate of the progressor share', 'yr⁻¹'],
    ['c', 'Annual growth rate of destructive capability', 'yr⁻¹'],
    ['e', 'Annual growth rate of competence per unit capability', 'yr⁻¹'],
    ['d', 'c − e, the capability gap, driving malice and error alike', 'yr⁻¹'],
    ['φ', 'Share of error that depends on conflict, and so falls with s', '—'],
    ['τ_v', 'End of the transition: the year s reaches 99% of s_max', 'yr'],
    ['Ṅ', 'Rate at which technological civilizations arise in the galaxy', 'yr⁻¹'],
    ['N', 'Civilizations past their transition, expected in the galaxy: Ṅ ∫_τ^∞ S dt', '—'],
    ['R', 'The moral ratio, p_m0/g', '—'],
    ['R*', 'Malice alone at d = 0: the R at which N reaches one', '—'],
    ['d₁', 'The gap at which N reaches one, all hazards included', 'yr⁻¹'],
    ['T_s', 'Date of interstellar settlement, a hypothesis', 'yr'],
  ],
}

/** §1.3 — lifetimes under a fixed hazard. */
export const FIXED_HAZARD: Table = {
  head: ['p', 'Median lifetime', 'Mean lifetime'],
  rows: [
    ['10⁻²', '69 yr', '100 yr'],
    ['10⁻³', '693 yr', '1,000 yr'],
    ['10⁻⁴', '6,931 yr', '10,000 yr'],
    ['10⁻⁵', '69,314 yr', '100,000 yr'],
  ],
}

/** §2.3 — the floor S(∞) under a declining hazard. */
export const DECLINING_FLOOR: Table = {
  head: ['', 'p₀ = 10⁻²', '10⁻³', '10⁻⁴'],
  rows: [
    ['H = 100 yr', '23.6%', '86.6%', '98.6%'],
    ['H = 1,000 yr', '~0%', '23.6%', '86.6%'],
    ['H = 10,000 yr', '~0%', '~0%', '23.6%'],
  ],
}

/** §3.2 — reading the phoenix line as a rate, under three population frames. */
export const PHOENIX_FRAMES: Table = {
  head: ['Frame', 'P', 'e₀', 'Lives per 500 yr', 's₀'],
  rows: [
    ["Roman empire, Seneca's own", '5×10⁷', '25', '1.0×10⁹', '10⁻⁹'],
    ['World population, 1st c.', '2×10⁸', '25', '4.0×10⁹', '2.5×10⁻¹⁰'],
    ['World today', '8×10⁹', '73', '5.5×10¹⁰', '1.8×10⁻¹¹'],
  ],
}

/** §4.2 — the transition against the improvement rate, at s_max = 0.99. */
export const TRANSITION_TIME: Table = {
  head: ['g', 'Midpoint, s = s_max/2', 'τ_v, s = 0.99 s_max'],
  rows: [
    ['0.1%/yr', '20,713 yr', '25,308 yr'],
    ['0.3%/yr', '6,904 yr', '8,436 yr'],
    ['0.6%/yr', '3,452 yr', '4,218 yr'],
    ['1.0%/yr', '2,071 yr', '2,531 yr'],
    ['2.0%/yr', '1,036 yr', '1,265 yr'],
  ],
}

/** §5.3 — why virtue's protection arrives late. */
export const PROGRESSOR_SHARE: Table = {
  head: ['Progressor share exceeds', 'Only in the final'],
  rows: [
    ['10⁻⁶', '72.7% of the transition'],
    ['10⁻⁴', '54.5%'],
    ['10⁻²', '36.3%'],
    ['10⁻¹', '26.8%'],
    ['0.5', '18.1%'],
  ],
}

/** §5.6 — the gap at the realistic baseline (p_m0 0.3%, p_e0 0.7%, g 0.6%). */
export const GAP_CLIFF: Table = {
  head: ['d', 'Malice, whole transition', 'Error, whole transition', 'N'],
  rows: [
    ['+0.05%/yr', '28.2', '76.5', '2×10⁻⁴⁶'],
    ['0', '10.4', '25.8', '9×10⁻¹⁶'],
    ['−0.03%/yr', '6.44', '15.6', '4×10⁻⁵'],
    ['−0.05%/yr', '4.92', '11.7', '0.03'],
    ['−0.067%/yr = d₁', '4.04', '9.57', '1'],
    ['−0.10%/yr', '2.90', '6.81', '59'],
    ['−0.20%/yr', '1.50', '3.50', '6,770'],
  ],
  links: [
    regionHref(0.3, 0.6, 0.7, 0.05),
    regionHref(0.3, 0.6, 0.7, 0),
    regionHref(0.3, 0.6, 0.7, -0.03),
    regionHref(0.3, 0.6, 0.7, -0.05),
    regionHref(0.3, 0.6, 0.7, -0.067),
    regionHref(0.3, 0.6, 0.7, -0.1),
    regionHref(0.3, 0.6, 0.7, -0.2),
  ],
}

/** §5.7 — splitting a 1% total between the two terms, at g = 0.6%/yr. */
export const MALICE_SPLIT: Table = {
  head: ['Malice share', 'R', 'N at d = 0', 'N at d = −0.07%', 'd₁'],
  rows: [
    ['100%', '1.67', '9×10⁻¹⁴', '2.3', '−0.065%'],
    ['60%', '1.00', '3×10⁻¹⁵', '2.0', '−0.066%'],
    ['30%', '0.50', '9×10⁻¹⁶', '1.7', '−0.067%'],
    ['10%', '0.17', '4×10⁻¹⁶', '1.6', '−0.067%'],
  ],
  links: [
    regionHref(1, 0.6, 0.001, -0.07),
    regionHref(0.6, 0.6, 0.4, -0.07),
    regionHref(0.3, 0.6, 0.7, -0.07),
    regionHref(0.1, 0.6, 0.9, -0.07),
  ],
}

/** §5.8 — malice carries the gap too: Hellman's 1%, optimistic error, g = 0.6%/yr. */
export const MALICE_GAP: Table = {
  head: ['d', 'N'],
  rows: [
    ['0', '9×10⁻¹⁴'],
    ['−0.03%/yr', '4×10⁻⁴'],
    ['−0.06%/yr', '0.47'],
    ['−0.10%/yr', '62'],
    ['−0.20%/yr', '6,740'],
  ],
  links: [
    regionHref(1, 0.6, 0.001, 0),
    regionHref(1, 0.6, 0.001, -0.03),
    regionHref(1, 0.6, 0.001, -0.06),
    regionHref(1, 0.6, 0.001, -0.1),
    regionHref(1, 0.6, 0.001, -0.2),
  ],
}

/** §6.3 — the parameters, and where each comes from. */
export const PARAMETERS: Table = {
  head: ['Parameter', 'Value', 'Basis'],
  rows: [
    ['Ṅ', '10⁻² yr⁻¹', 'One technological civilization per century'],
    ['s₀', '10⁻⁹', '§3. A floor: it counts sages, and progressors are far more common'],
    ['s_max', '0.99 (dial 0.90 to 1.00)', 'Assumed. The share that never moves is set by culture, §5.9'],
    ['φ', '0.7 (dial 0 to 1)', 'Assumed. Haste, secrecy and racing as a share of error'],
    ['p_x', '10⁻⁸ yr⁻¹', 'Sets a survivor’s lifetime once everything else is retired'],
    [
      'p_e0',
      '7×10⁻³ yr⁻¹ (realistic), 10⁻⁵ yr⁻¹ (optimistic)',
      'Realistic: the 70% of a 1% total that §5.7 assigns to error. Optimistic: the original assumption, kept for comparison. Both weakly constrained. See §11, A8',
    ],
    ['τ_v', 's(τ_v) = 0.99 s_max', 'Where the count starts. 50%, 90% or 99% give the same N to three figures when d < 0'],
  ],
}

/** §6.4 — the expected count across the credible parameter box, at both error baselines. */
export const EXPECTED_COUNT: Table = {
  head: ['p_m0', 'g', 'd', 'R', 'N, p_e0 = 0.7%', 'N, p_e0 = 10⁻⁵'],
  rows: [
    ['1.00%', '0.60%', '0', '1.67', '3×10⁻²⁶', '9×10⁻¹⁴'],
    ['1.00%', '0.60%', '+0.10%', '1.67', '< 10⁻³⁰⁰', '4×10⁻¹⁴¹'],
    ['0.30%', '0.60%', '0', '0.50', '9×10⁻¹⁶', '0.009'],
    ['0.30%', '0.60%', '+0.10%', '0.50', '< 10⁻³⁰⁰', '2×10⁻⁴²'],
    ['0.30%', '1.00%', '+0.10%', '0.30', '4×10⁻³⁶', '5×10⁻⁹'],
    ['0.10%', '0.60%', '0', '0.17', '9×10⁻¹³', '23'],
    ['0.30%', '0.60%', '−0.07%', '0.50', '1.7', '20,000'],
    ['0.30%', '0.60%', '−0.20%', '0.50', '6,770', '2×10⁵'],
    ['1.00%', '0.60%', '−0.10%', '1.67', '0.07', '62'],
  ],
  links: [
    regionHref(1, 0.6, 0.7, 0),
    regionHref(1, 0.6, 0.7, 0.1),
    regionHref(0.3, 0.6, 0.7, 0),
    regionHref(0.3, 0.6, 0.7, 0.1),
    regionHref(0.3, 1, 0.7, 0.1),
    regionHref(0.1, 0.6, 0.7, 0),
    regionHref(0.3, 0.6, 0.7, -0.07),
    regionHref(0.3, 0.6, 0.7, -0.2),
    regionHref(1, 0.6, 0.7, -0.1),
  ],
}

/** §7.2 — the competence threshold d₁ at both baselines (p_m0 = 0.3%, s_max 0.99, φ 0.7). */
export const COMPETENCE_THRESHOLD: Table = {
  head: ['g', 'τ_v', 'd₁, p_e0 = 10⁻⁵', 'd₁, p_e0 = 0.7%'],
  rows: [
    ['0.1%/yr', '25,308 yr', '−0.022%/yr', '−0.072%/yr'],
    ['0.3%/yr', '8,436 yr', '−0.013%/yr', '−0.072%/yr'],
    ['0.6%/yr', '4,218 yr', '−0.001%/yr', '−0.067%/yr'],
    ['1.0%/yr', '2,531 yr', '−0.000%/yr', '−0.054%/yr'],
    ['2.0%/yr', '1,265 yr', '+0.038%/yr', '−0.032%/yr'],
  ],
}

/** §7.4 — d₁ against the baseline error rate (p_m0 0.3%, g 0.6%). */
export const ERROR_SWEEP: Table = {
  head: ['p_e0', 'd₁'],
  rows: [
    ['10⁻⁵ yr⁻¹', '−0.001%/yr'],
    ['10⁻⁴', '−0.002%/yr'],
    ['10⁻³', '−0.011%/yr'],
    ['3×10⁻³', '−0.031%/yr'],
    ['7×10⁻³', '−0.067%/yr'],
    ['10⁻²', '−0.091%/yr'],
    ['2×10⁻²', '−0.166%/yr'],
  ],
}

/** §7.1 — R* across the ceiling and the improvement rate. */
export const THRESHOLD_SWEEP: Table = {
  head: ['', 'g = 0.3%', '0.6%', '1.0%'],
  rows: [
    ['s_max = 0.90', '0.235', '0.208', '0.188'],
    ['0.95', '0.265', '0.237', '0.217'],
    ['0.99', '0.333', '0.304', '0.283'],
    ['0.999', '0.432', '0.402', '0.380'],
    ['1.00', '0.667', '0.667', '0.667'],
  ],
}

/** §8 — the improvement rate malice alone would demand, with no lead in competence. */
export const REQUIRED_GROWTH: Table = {
  head: ['p_m0', 'Required g at d = 0', 'Doubling time of the progressor share'],
  rows: [
    ['1%/yr', '≥ 4.5%/yr', '15 yr'],
    ['0.3%/yr', '≥ 1.07%/yr', '65 yr'],
    ['0.1%/yr', '≥ 0.30%/yr', '231 yr'],
  ],
}

/** §9.3 — the two regimes and what each leaves to explain. */
export const FORK: Table = {
  head: ['Regime', 'Prediction', 'What explains the silence'],
  rows: [
    [
      'Gap kept below d₁, through the transition and after',
      'Galaxy holds civilizations that live for epochs',
      'Requires near-zero detectability, argued from restraint (§9.4)',
    ],
    ['Any hazard left standing', 'Expected survivors below one', 'Nothing to explain; we are early'],
  ],
}

/** §10 — what the revision bought, and what it cost. */
export const GAINS: Table = {
  head: ['Gain', 'Detail'],
  rows: [
    [
      'Coherence',
      'Hazards no longer switch off at an arbitrary moment. Every term runs for all time, and a survivor is one whose hazards keep shrinking.',
    ],
    [
      'One mechanism, two hazards',
      'A single gap d drives malice and error. The danger in a capability is the distance between having it and understanding it.',
    ],
    [
      'A realistic population',
      'Progressors rather than sages, growing logistically to a ceiling set by culture rather than by human nature.',
    ],
    [
      'Contact with the philosophy',
      'Kathēkonta (appropriate actions) are what progressors do more reliably, and they are what move risk. The Stoic paradox that all non-sages are equally far from virtue (Cicero, De Finibus 3.48) is about states; the model is about actions.',
    ],
    [
      'A second coupling to honesty',
      'Progressors affect e through honesty: no fraud, no selective reporting, no secrecy. Honesty is what lets the institutions of error correction work, and those institutions are where e is actually made. The Chalmers and Glasziou estimate that roughly 85% of biomedical research investment is avoidably wasted is a rough upper bound on the recoverable share.',
    ],
  ],
}

export const COSTS: Table = {
  head: ['Cost', 'Detail'],
  rows: [
    ['No closed form', 'N, R* and d₁ come from numerical integration and bisection.'],
    [
      'R* is no longer necessary',
      'A lead in competence shrinks malice too, so a civilization over R* can still survive on d alone (§5.8).',
    ],
    [
      'A weakly constrained parameter',
      'p_e0 is close to unmeasurable, and d₁ is roughly proportional to it (§7.4).',
    ],
    [
      'Less quotable',
      '"One ratio decides it" becomes "a lead in competence decides it, and nobody has measured the lead."',
    ],
  ],
}

/** §11 — every assumption, and what breaks if it fails. */
export type Assumption = {
  id: string
  claim: string
  kind: string
  loadBearing: boolean
  ifItFails: string
}

export const ASSUMPTIONS: Assumption[] = [
  {
    id: 'A1',
    claim: 'Annual catastrophe risk constant, trials independent',
    kind: 'Modeling',
    loadBearing: false,
    ifItFails: '§1 collapses; §2 already relaxes it',
  },
  {
    id: 'A2',
    claim: 'Hazard decline achievable only through something like character',
    kind: 'Philosophical',
    loadBearing: true,
    ifItFails:
      'The whole argument fails if some other route keeps d negative indefinitely. Coercion does not (§11 note): it concentrates malice in the controllers. Interstellar dispersal before the transition ends (A12) would. Dispersal within one system does not. Character here includes the institutions it builds',
  },
  {
    id: 'A3',
    claim: "Seneca's phoenix line reports a rate rather than rhetoric",
    kind: 'Interpretive',
    loadBearing: false,
    ifItFails: 's₀ moves; it is only a floor, and a higher start shortens the transition',
  },
  {
    id: 'A4',
    claim: 'Progressors grow logistically to a ceiling s_max, and the ceiling is cultural',
    kind: 'Modeling',
    loadBearing: false,
    ifItFails:
      'A lower ceiling leaves more malice and conflict error standing for good. It moves R* a great deal and d₁ hardly at all, so the gap still decides',
  },
  {
    id: 'A5',
    claim: 'Homicide and literacy proxy for g',
    kind: 'Empirical',
    loadBearing: false,
    ifItFails: 'g unmeasured; the quantitative apparatus becomes illustrative',
  },
  {
    id: 'A6',
    claim: 'Malice and conflict error scale linearly with the non-progressor share',
    kind: 'Modeling',
    loadBearing: false,
    ifItFails:
      '§5.3 shows the share stays near zero for most of the transition, so the form matters only near the end',
  },
  {
    id: 'A7',
    claim: 'Progressors are identified by checkable criteria that do not mention risk',
    kind: 'Philosophical',
    loadBearing: true,
    ifItFails:
      'If the only test of progress is lower risk, the argument is circular. The criteria used are treating externals as indifferent and acting from reason rather than passion',
  },
  {
    id: 'A8',
    claim: 'p_e0 lies between 10⁻⁵ and about 7×10⁻³, and the gap acts exponentially',
    kind: 'Modeling, weakly constrained',
    loadBearing: true,
    ifItFails:
      'd₁ is roughly proportional to p_e0 (§7.4). This is the softest number in the model',
  },
  {
    id: 'A9',
    claim: 'p_x constant across 10⁸ years',
    kind: 'Modeling',
    loadBearing: false,
    ifItFails: 'The galactic environment is not uniform in time; would modulate a survivor’s lifetime',
  },
  {
    id: 'A10',
    claim: 'One gap drives malice and error, and keeps its value after the transition',
    kind: 'Modeling',
    loadBearing: true,
    ifItFails:
      'If malice ignores the gap, R* becomes necessary again and the Hellman estimate cannot be survived. If d drifts back to zero after τ_v, the error virtue does not touch returns and survivors do not last',
  },
  {
    id: 'A11',
    claim: 'p_m0 is malice-specific, not borrowed from total-catastrophe estimates',
    kind: 'Empirical, currently violated',
    loadBearing: false,
    ifItFails: '§5.7. The model double-counts as written, but d₁ is nearly invariant to the split',
  },
  {
    id: 'A12',
    claim: 'Interstellar settlement arrives after the transition, T_s > τ_v, with T_s ≈ 10⁴ years taken as a hypothesis',
    kind: 'Speculative',
    loadBearing: true,
    ifItFails:
      'A civilization spread across stars before τ_v escapes by distance, and N no longer describes it. The assumption holds only while g exceeds about 0.25% a year (see the note on A2 and dispersal)',
  },
  {
    id: 'A13',
    claim: 'Reason (logos) is the same in every species, and people are born with starting points toward virtue (aphormai), not the virtues',
    kind: 'Philosophical premise',
    loadBearing: true,
    ifItFails:
      'Only the explanation of the silence (§9.4) depends on it. Without it, survivors need not converge on restraint, and the crowded branch needs another reason or fails',
  },
]

/** §12 — what would settle it. */
export const FALSIFIERS: { lead: string; body: string }[] = [
  {
    lead: 'Detection of any non-transitioned technological civilization',
    body: 'bounds the short-lived population and constrains p directly.',
  },
  {
    lead: 'A measured d',
    body: 'from the history of near misses and accidents per unit of destructive capability. The nuclear record is the obvious starting corpus, and §8 shows how coarse it is. This is the measurement the argument most needs.',
  },
  {
    lead: 'A measured g',
    body: 'from any long-run series tracking something closer to virtue than homicide.',
  },
  {
    lead: 'Any demonstrated route to a hazard that keeps falling without character',
    body: 'falsifies A2 and therefore the necessity claim, which is the claim the essay actually makes.',
  },
  {
    lead: 'A credible route to interstellar settlement within τ_v',
    body: 'falsifies A12 at that g, and with it the single-target framing: below g ≈ 0.25% a year the filter can be escaped by distance.',
  },
]
