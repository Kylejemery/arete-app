/**
 * The Long Filter, formal statement — the tables.
 *
 * The prose and the derivations live in the component; what sits here is every
 * table the companion note quotes, so the numbers can be checked in one place
 * rather than hunted through markup. Figures are as computed for the essay;
 * where a row is an empirical anchor rather than a model output, the section it
 * comes from says so.
 */

export type Row = (string | number)[]
export type Table = { head: string[]; rows: Row[] }

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
    ['s₀', 'Baseline per-capita incidence of sagehood before deliberate cultivation', '—'],
    ['K', 'ln(1/s₀), the log distance from baseline to saturation', '—'],
    ['g', 'Annual growth rate of the sage fraction of a population', 'yr⁻¹'],
    ['c', 'Annual growth rate of destructive capability', 'yr⁻¹'],
    ['e', 'Annual growth rate of competence per unit capability', 'yr⁻¹'],
    ['d', 'c − e, the capability gap', 'yr⁻¹'],
    ['τ_v', 'Time from capability acquisition to moral saturation', 'yr'],
    ['f_v', 'Fraction of civilizations reaching saturation before destroying themselves', '—'],
    ['Ṅ', 'Rate at which technological civilizations arise in the galaxy', 'yr⁻¹'],
    ['L_s, L_ℓ', 'Mean lifetime of the non-transitioned and transitioned populations', 'yr'],
    ['f_c,s, f_c,ℓ', 'Detectability of each population', '—'],
    ['R', 'The moral ratio, p_m0/g', '—'],
    ['R*', 'Threshold value of R above which expected survivors fall below one', '—'],
    ['d*', 'Threshold value of d above which the error integral dominates', 'yr⁻¹'],
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

/** §4.2 — saturation time against the improvement rate. */
export const SATURATION_TIME: Table = {
  head: ['g', 'τ_v'],
  rows: [
    ['0.1%/yr', '20,723 yr'],
    ['0.3%/yr', '6,908 yr'],
    ['0.6%/yr', '3,454 yr'],
    ['1.0%/yr', '2,072 yr'],
    ['2.0%/yr', '1,036 yr'],
  ],
}

/** §5.3 — why draining malice as virtue rises buys so little. */
export const SAGE_SHARE: Table = {
  head: ['Sage fraction exceeds', 'Only in the final'],
  rows: [
    ['10⁻⁶', '66.7% of the window'],
    ['10⁻⁴', '44.4%'],
    ['10⁻²', '22.2%'],
    ['10⁻¹', '11.1%'],
    ['0.5', '3.3%'],
  ],
}

/** §5.6 — the error cliff, at p_e0 = 10⁻⁵/yr and τ_v = 3,454 yr. */
export const ERROR_CLIFF: Table = {
  head: ['d', 'I_e', 'f_v factor'],
  rows: [
    ['−0.10%/yr', '0.010', '0.990'],
    ['0', '0.035', '0.966'],
    ['+0.05%/yr', '0.092', '0.912'],
    ['+0.10%/yr', '0.306', '0.736'],
    ['+0.15%/yr', '1.179', '0.308'],
    ['+0.20%/yr', '4.995', '0.007'],
    ['+0.30%/yr', '105.4', '10⁻⁴⁶'],
  ],
}

/** §5.7 — splitting a 1% total between the two terms barely moves the count. */
export const MALICE_SPLIT: Table = {
  head: ['Malice share', 'R', 'I_e', 'N_ℓ'],
  rows: [
    ['100%', '1.67', '0', '5×10⁻⁹'],
    ['60%', '1.00', '13.8', '3×10⁻⁹'],
    ['30%', '0.50', '24.2', '2×10⁻⁹'],
    ['10%', '0.17', '31.1', '1×10⁻⁹'],
  ],
}

/** §5.8 — what happens to R* if baseline malice grows with capability. */
export const CAPABILITY_SCALING: Table = {
  head: ['Q', 'Φ(Q)', 'R* = ln(10⁶)/Φ'],
  rows: [
    ['0', '19.7', '0.700'],
    ['0.05', '33.7', '0.410'],
    ['0.20', '258', '0.054'],
    ['0.50', '4.2×10⁴', '3.3×10⁻⁴'],
    ['1.00', '5.0×10⁸', '2.8×10⁻⁸'],
  ],
}

/** §6.3 — the parameters, and where each comes from. */
export const PARAMETERS: Table = {
  head: ['Parameter', 'Value', 'Basis'],
  rows: [
    ['Ṅ', '10⁻² yr⁻¹', 'One technological civilization per century'],
    ['s₀', '10⁻⁹', '§3'],
    ['p_x', '10⁻⁸ yr⁻¹', 'Gives L_ℓ = 10⁸ yr'],
    ['p_e0', '10⁻⁵ yr⁻¹', 'Weakly constrained. See §11, A8'],
    ['L_s', '~3×10² yr', 'Equals 1/p at p = 3×10⁻³'],
  ],
}

/** §6.4 — the expected count across the credible parameter box. */
export const EXPECTED_COUNT: Table = {
  head: ['p_m0', 'g', 'd', 'R', 'N_ℓ'],
  rows: [
    ['1.00%', '0.60%', '0', '1.67', '5×10⁻⁹'],
    ['1.00%', '0.60%', '+0.10%', '1.67', '4×10⁻⁹'],
    ['0.30%', '0.60%', '0', '0.50', '50'],
    ['0.30%', '0.60%', '+0.10%', '0.50', '38'],
    ['0.30%', '0.60%', '+0.15%', '0.50', '16'],
    ['0.30%', '1.00%', '+0.10%', '0.30', '2,513'],
    ['0.10%', '0.60%', '0', '0.17', '36,000'],
  ],
}

/** §7.2 — the competence threshold, where I_e costs half of f_v. */
export const COMPETENCE_THRESHOLD: Table = {
  head: ['g', 'τ_v', 'd*'],
  rows: [
    ['0.1%/yr', '20,723 yr', '+0.010%/yr'],
    ['0.3%/yr', '6,908 yr', '+0.052%/yr'],
    ['0.6%/yr', '3,454 yr', '+0.131%/yr'],
    ['1.0%/yr', '2,072 yr', '+0.249%/yr'],
    ['2.0%/yr', '1,036 yr', '+0.579%/yr'],
  ],
}

/** §7.4 — R* across four orders of s₀ and two of Ṅ/p_x. */
export const THRESHOLD_SWEEP: Table = {
  head: ['', 'Ṅ/p_x = 10⁵', '10⁶', '10⁷'],
  rows: [
    ['s₀ = 10⁻⁷', '0.74', '0.89', '1.04'],
    ['s₀ = 10⁻⁹', '0.58', '0.70', '0.82'],
    ['s₀ = 10⁻¹¹', '0.47', '0.57', '0.66'],
  ],
}

/** §8 — the improvement rate each malice estimate demands. */
export const REQUIRED_GROWTH: Table = {
  head: ['p_m0', 'Required g', 'Doubling time of the sage fraction'],
  rows: [
    ['1%/yr', '≥ 1.43%/yr', '49 yr'],
    ['0.3%/yr', '≥ 0.43%/yr', '162 yr'],
    ['0.1%/yr', '≥ 0.14%/yr', '485 yr'],
  ],
}

/** §9.3 — the two regimes and what each leaves to explain. */
export const FORK: Table = {
  head: ['Regime', 'Prediction', 'What explains the silence'],
  rows: [
    [
      'Both thresholds cleared',
      'Galaxy crowded with ancient civilizations',
      'Requires f_c,ℓ ≈ 0, argued from restraint',
    ],
    ['Either threshold missed', 'Expected survivors below one', 'Nothing to explain; we are early'],
  ],
}

/** §10 — what the decomposition bought, and what it cost. */
export const GAINS: Table = {
  head: ['Gain', 'Detail'],
  rows: [
    [
      'Coherence',
      'The single-hazard model held p fixed while s(t) rose. Contradiction removed.',
    ],
    ['One fewer free parameter', 'L_ℓ is now 1/p_x rather than a chosen number.'],
    [
      'A visible second failure mode',
      'The error cliff has no analogue in the single-hazard model and can dominate everything.',
    ],
    [
      'Contact with the philosophy',
      '§10 of the essay argues chosen virtue beats architectural virtue because it re-derives against novelty. That is an argument about e. Foreclosed minds have lower e because they cannot reason about unanticipated threats. This is the first formal counterpart the claim has had.',
    ],
    [
      'A second coupling to honesty',
      'Sages affect e through honesty rather than goodness: no fraud, no selective reporting, no secrecy. The Chalmers and Glasziou estimate that roughly 85% of biomedical research investment is avoidably wasted is a rough upper bound on the recoverable share.',
    ],
  ],
}

export const COSTS: Table = {
  head: ['Cost', 'Detail'],
  rows: [
    ['Two conditions instead of one', 'R < R* is necessary but no longer sufficient.'],
    [
      'A weakly constrained parameter',
      'p_e0 is close to unmeasurable and d* depends on it exponentially.',
    ],
    [
      'Less quotable',
      '"One ratio decides it" becomes "two ratios decide it, and they are coupled through g."',
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
    ifItFails: 'The whole argument fails; dispersal or constraint suffices',
  },
  {
    id: 'A3',
    claim: "Seneca's phoenix line reports a rate rather than rhetoric",
    kind: 'Interpretive',
    loadBearing: false,
    ifItFails: 's₀ moves; §7.4 shows R* barely moves',
  },
  {
    id: 'A4',
    claim: 'Sage fraction grows exponentially, not logistically',
    kind: 'Modeling',
    loadBearing: true,
    ifItFails:
      'A logistic ceiling below 1 means saturation is unreachable at any g, converting the result from rare to never',
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
    claim: 'Malice scales linearly with the non-sage fraction',
    kind: 'Modeling',
    loadBearing: false,
    ifItFails:
      '§5.3 shows the mechanism contributes only 4.8%, so the model is nearly insensitive to this',
  },
  {
    id: 'A7',
    claim: 'Saturation is the relevant threshold',
    kind: 'Modeling',
    loadBearing: false,
    ifItFails: '§4.3 shows this barely matters',
  },
  {
    id: 'A8',
    claim: 'p_e0 ≈ 10⁻⁵ and error compounds exponentially in d',
    kind: 'Modeling, weakly constrained',
    loadBearing: true,
    ifItFails: 'd* moves by orders of magnitude. This is now the softest number in the model',
  },
  {
    id: 'A9',
    claim: 'p_x constant across 10⁸ years',
    kind: 'Modeling',
    loadBearing: false,
    ifItFails: 'The galactic environment is not uniform in time; would modulate L_ℓ',
  },
  {
    id: 'A10',
    claim: 'Malice hazard saturates at the extinction threshold, so Q = 0',
    kind: 'Modeling',
    loadBearing: true,
    ifItFails:
      'If malice scales with capability without a ceiling, §5.8 shows R* collapses by orders of magnitude and the argument fails outright',
  },
  {
    id: 'A11',
    claim: 'p_m0 is malice-specific, not borrowed from total-catastrophe estimates',
    kind: 'Empirical, currently violated',
    loadBearing: true,
    ifItFails:
      '§5.7. The model double-counts as written, though §5.7 also shows the count is nearly invariant to the split',
  },
]

/** §12 — what would settle it. */
export const FALSIFIERS: { lead: string; body: string }[] = [
  {
    lead: 'Detection of any non-transitioned technological civilization',
    body: 'bounds Ṅ·f_c,s·L_s and constrains p directly.',
  },
  {
    lead: 'A measured g',
    body: 'from any long-run series tracking something closer to virtue than homicide. This is the most tractable empirical program the argument suggests.',
  },
  {
    lead: 'A measured d',
    body: 'from the history of accident rates per unit of destructive capability. Harder, but industrial and nuclear safety records over the last century are the obvious starting corpus.',
  },
  {
    lead: 'Any demonstrated route to a declining hazard rate requiring no character',
    body: 'falsifies A2 and therefore the necessity claim, which is the claim the essay actually makes.',
  },
  {
    lead: 'Evidence that moral diffusion is logistic with a ceiling below unity',
    body: 'falsifies A4 and converts the result from rare to never.',
  },
]
