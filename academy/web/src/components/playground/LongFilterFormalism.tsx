import Link from 'next/link'
import {
  ASSUMPTIONS,
  CAPABILITY_SCALING,
  COMPETENCE_THRESHOLD,
  COSTS,
  DECLINING_FLOOR,
  ERROR_CLIFF,
  EXPECTED_COUNT,
  FALSIFIERS,
  FIXED_HAZARD,
  FORK,
  GAINS,
  MALICE_SPLIT,
  NOTATION,
  PARAMETERS,
  PHOENIX_FRAMES,
  REQUIRED_GROWTH,
  SAGE_SHARE,
  SATURATION_TIME,
  THRESHOLD_SWEEP,
  type Table,
} from '@/content/playground/long-filter-formalism'
import styles from './LongFilterFormalism.module.css'

/**
 * A table from the companion note. `numeric` sets the whole grid in mono and
 * tabular figures, for the ones meant to be read down a column; the prose
 * tables keep the book face and only mono the key.
 */
function Grid({ table, numeric = false }: { table: Table; numeric?: boolean }) {
  return (
    <div className={styles.tableScroll}>
      <table className={`${styles.tbl} ${numeric ? styles.numeric : ''}`}>
        <thead>
          <tr>
            {table.head.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({
  num,
  title,
  children,
}: {
  num: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className={`${styles.section} ${styles.wrap}`}>
      <span className={styles.secNum}>{num}</span>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.sub}>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export default function LongFilterFormalism({
  backHref = '/playground/the-long-filter',
  backLabel = '← The Long Filter',
}: {
  backHref?: string
  backLabel?: string
}) {
  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link href={backHref} className={styles.backLink}>
          {backLabel}
        </Link>
      </div>

      <header className={`${styles.wrap} ${styles.hero}`}>
        <p className={styles.eyebrow}>Arete / playground / formal statement</p>
        <h1>The Long Filter: Formal Statement</h1>
        <p className={styles.standfirst}>
          Companion note to the essay. Everything here is derivation, parameter choice, and
          sensitivity. The philosophical argument lives elsewhere; this document exists so that
          anyone who wants to attack the argument knows exactly which line to attack.
        </p>
        <div className={styles.revision}>
          <p>
            Revision note: this version decomposes the hazard rate into malice, error, and external
            terms. The earlier single-hazard version held <span className={styles.mono}>p</span>{' '}
            constant across a window in which the sage fraction was assumed to be rising, which was
            incoherent. The decomposition fixes that, preserves the closed form, and exposes a second
            threshold the single-term model could not see.
          </p>
        </div>
      </header>

      <Section num="0" title="Notation">
        <Grid table={NOTATION} />
      </Section>

      <Section num="1" title="The fixed-hazard model">
        <Sub title="1.1 Statement">
          <p>
            Assume self-destruction is a Bernoulli trial repeated annually with constant probability{' '}
            <span className={styles.mono}>p</span>, and that trials are independent. Then
          </p>
          <div className={styles.block}>S(n) = (1 − p)ⁿ</div>
        </Sub>

        <Sub title="1.2 Derived quantities">
          <div className={styles.block}>
            {`t½   = ln(0.5) / ln(1 − p) ≈ ln(2) / p     for small p
E[T] = 1/p`}
          </div>
        </Sub>

        <Sub title="1.3 Numerical values">
          <Grid table={FIXED_HAZARD} numeric />
        </Sub>

        <Sub title="1.4 The limit result">
          <div className={styles.block}>
            {`lim S(n) = 0    for all p > 0
n→∞`}
          </div>
          <p>
            This is the formal content of the claim that a civilization able to destroy itself
            eventually will. It is not a claim about human nature. It is a property of the geometric
            distribution.{' '}
            <strong>
              Under a fixed hazard rate there is no value of p small enough to survive deep time.
              There are only values that take longer to lose.
            </strong>
          </p>
        </Sub>

        <Sub title="1.5 Empirical bounds">
          <p>
            Published estimates for annual probability of major nuclear exchange span roughly 10⁻³ to
            10⁻². Hellman&rsquo;s often-cited figure is near 10⁻². Superforecaster medians run lower.
            Eighty years of observed non-use weakly bounds the total below about 2×10⁻², which is
            weak because the sample is one civilization observed once.
          </p>
        </Sub>
      </Section>

      <Section num="2" title="The declining-hazard model">
        <Sub title="2.1 Statement">
          <p>
            The fixed-hazard assumption does all the work in §1.4. Relax it. Let hazard decay
            exponentially with halving time <span className={styles.mono}>H</span>:
          </p>
          <div className={styles.block}>
            {`p(t) = p₀ · 2^(−t/H)
S(n) = exp( −∫₀ⁿ p(t) dt ) = exp( −(p₀H / ln 2)(1 − 2^(−n/H)) )`}
          </div>
        </Sub>

        <Sub title="2.2 The floor">
          <div className={styles.result}>S(∞) = exp( −p₀H / ln 2 )  &gt;  0</div>
          <p>
            The integral converges. Total lifetime risk is finite and strictly below one.
          </p>
        </Sub>

        <Sub title="2.3 Numerical values of S(∞)">
          <Grid table={DECLINING_FLOOR} numeric />
        </Sub>

        <Sub title="2.4 Interpretation">
          <p>
            <strong>Survival never required zero risk. It required a derivative.</strong> §1 is
            arithmetic and §2 is arithmetic. The claim that the derivative can only be produced by
            something recognizable as character is neither, and it is the load-bearing philosophical
            premise (A2 in §11).
          </p>
        </Sub>
      </Section>

      <Section num="3" title="The phoenix rate">
        <Sub title="3.1 Source">
          <p>
            Seneca, <em>Epistulae Morales</em> 42.1: the good man appears perhaps once in five
            hundred years, as the phoenix does. Treated as a rate rather than as rhetoric.
          </p>
        </Sub>

        <Sub title="3.2 Conversion">
          <div className={styles.block}>
            {`Λ_lives = (P / e₀) · Δ
s₀ = 1 / Λ_lives`}
          </div>
          <Grid table={PHOENIX_FRAMES} numeric />
          <p>
            Take <span className={styles.mono}>s₀ = 10⁻⁹</span>, so{' '}
            <span className={styles.mono}>K = ln(1/s₀) = 20.72</span>. Seneca&rsquo;s own frame is
            the defensible one, since he was describing the world he could see.
          </p>
        </Sub>

        <Sub title="3.3 What s₀ measures">
          <p>
            Incidence of sagehood in a population making no systematic attempt to produce it. A floor
            on the achievable rate, not a ceiling.
          </p>
        </Sub>
      </Section>

      <Section num="4" title="Saturation time">
        <Sub title="4.1 Statement">
          <div className={styles.block}>
            {`s(t) = s₀ · e^(gt)          τ_v = ln(1/s₀) / g = K/g`}
          </div>
        </Sub>

        <Sub title="4.2 Numerical values">
          <Grid table={SATURATION_TIME} numeric />
        </Sub>

        <Sub title="4.3 The target is nearly irrelevant">
          <p>
            For target fraction <span className={styles.mono}>θ</span>,{' '}
            <span className={styles.mono}>τ_v(θ) = ln(θ/s₀)/g</span>. At{' '}
            <span className={styles.mono}>g</span> = 0.6%/yr: reaching 50% takes 3,338 yr, 90% takes
            3,436 yr, 99% takes 3,452 yr, 100% takes 3,454 yr.{' '}
            <strong>
              Whether the required end state is a fully sage civilization or merely a sage-governed
              one changes nothing material.
            </strong>{' '}
            This defuses the standard objection that the Stoic sage is unreachable.
          </p>
        </Sub>

        <Sub title="4.4 Empirical anchors for g">
          <p>
            <strong>European homicide.</strong> Roughly 40 per 100,000 in the 14th century to roughly
            1 today, across 600 years:
          </p>
          <div className={styles.block}>g = ln(40) / 600 = 0.615 %/yr</div>
          <p>
            <strong>Global literacy.</strong> About 12% in 1820 to about 87% in 2020, as growth in
            the odds ratio:
          </p>
          <div className={styles.block}>
            g = ln( (0.87/0.13) / (0.12/0.88) ) / 200 = 1.95 %/yr
          </div>
          <p>
            So <span className={styles.mono}>g</span> plausibly sits between 0.6% and 2%/yr. Neither
            series measures sagehood. Both measure something in its vicinity.
          </p>
        </Sub>
      </Section>

      <Section num="5" title="Decomposition of the hazard">
        <Sub title="5.1 Statement">
          <div className={styles.block}>p(t) = p_m(t) + p_e(t) + p_x</div>
          <p>
            Three terms with three different masters. <span className={styles.mono}>p_m</span> is
            governed by the growth of virtue. <span className={styles.mono}>p_e</span> is governed by
            competence and by honesty. <span className={styles.mono}>p_x</span> is governed by
            nobody.
          </p>
        </Sub>

        <Sub title="5.2 The malice term">
          <p>Malice scales with the non-sage fraction of the population:</p>
          <div className={styles.block}>
            {`p_m(t) = p_m0 · (1 − s(t)) = p_m0 · (1 − s₀e^(gt))`}
          </div>
          <p>Integrating across the window:</p>
          <div className={styles.block}>
            {`∫₀^τ p_m dt = p_m0 [ τ − (1 − s₀)/g ] ≈ p_m0 (K − 1)/g`}
          </div>
          <p>
            The effective multiplier is <span className={styles.mono}>1 − 1/K = 0.9517</span>,{' '}
            <strong>independent of g</strong>.
          </p>
        </Sub>

        <Sub title="5.3 Why the mechanism buys so little">
          <p>
            Draining malice as virtue rises reduces the malice integral by only 4.8 percent, because
            exponential growth spends almost all its time near zero:
          </p>
          <Grid table={SAGE_SHARE} numeric />
          <p className={styles.caption}>
            The single-hazard model was accidentally almost right, for a bad reason.
          </p>
        </Sub>

        <Sub title="5.4 The closed form survives">
          <div className={styles.block}>
            {`exp( −p_m0 (1 − 1/K) · K/g )  =  exp( −(p_m0/g)(K − 1) )  =  (e·s₀)^(p_m0/g)`}
          </div>
          <div className={styles.result}>
            {`f_v,malice = (e·s₀)^R
R = p_m0 / g`}
          </div>
          <p>
            <strong>
              The decomposition is exactly equivalent to replacing s₀ with e·s₀ = 2.72×10⁻⁹.
            </strong>{' '}
            Verified numerically to six significant figures. The single-ratio elegance is preserved.
          </p>
        </Sub>

        <Sub title="5.5 The external term">
          <p>
            <span className={styles.mono}>p_x</span> was previously laundered as a hand-chosen{' '}
            <span className={styles.mono}>L_ℓ</span>. It should not be a free parameter, because it
            sets the lifetime directly:
          </p>
          <div className={styles.block}>L_ℓ = 1 / p_x</div>
          <p>
            Inside <span className={styles.mono}>f_v</span> it is negligible. At{' '}
            <span className={styles.mono}>p_x = 10⁻⁸</span> and{' '}
            <span className={styles.mono}>g</span> = 0.6%/yr,{' '}
            <span className={styles.mono}>exp(−p_x τ_v) = 0.99997</span>. So{' '}
            <span className={styles.mono}>p_x</span> does no work during the transition and all its
            work afterward. One parameter, two roles, made explicit.
          </p>
        </Sub>

        <Sub title="5.6 The error term">
          <p>
            Destructive capability grows at <span className={styles.mono}>c</span>. Competence per
            unit capability grows at <span className={styles.mono}>e</span>. Let{' '}
            <span className={styles.mono}>d = c − e</span>:
          </p>
          <div className={styles.block}>
            {`p_e(t) = p_e0 · e^(dt)
I_e = ∫₀^τ p_e dt = p_e0 (e^(dτ) − 1) / d      (= p_e0·τ when d = 0)`}
          </div>
          <p>
            This term has no analogue in the single-hazard model, and it can dominate everything. At{' '}
            <span className={styles.mono}>p_e0 = 10⁻⁵/yr</span> and{' '}
            <span className={styles.mono}>τ_v = 3,454 yr</span> (
            <span className={styles.mono}>g</span> = 0.6%/yr):
          </p>
          <Grid table={ERROR_CLIFF} numeric />
          <p>
            <strong>This is a cliff, not a slope.</strong> Between{' '}
            <span className={styles.mono}>d</span> = 0.10% and 0.20% the survival factor falls by two
            orders of magnitude.
          </p>
        </Sub>

        <Sub title="5.7 Where p_m0 comes from, and a double count">
          <p>
            <span className={styles.mono}>p_m0</span> is not derived anywhere in this document. It
            has been borrowed from published estimates of total catastrophe risk, which already
            contain accident and miscalculation. Those belong in{' '}
            <span className={styles.mono}>p_e</span>. The same hazard is therefore priced twice.
          </p>
          <p>
            The historical record leans against the borrowing. The documented near-misses (Petrov
            1983, the NORAD training tape in 1979, Able Archer, B-59 in 1962) were overwhelmingly
            false alarms and misjudgment rather than decisions to attack. If that record is
            representative, malice is the minority share of the published totals.
          </p>
          <p>
            Splitting a 1 percent total between the two terms, at{' '}
            <span className={styles.mono}>g</span> = 0.6%/yr and{' '}
            <span className={styles.mono}>d</span> = 0:
          </p>
          <Grid table={MALICE_SPLIT} numeric />
          <p>
            <strong>The count is nearly invariant to the split.</strong>{' '}
            <span className={styles.mono}>R</span> clears its threshold comfortably at a 30 percent
            malice share and the answer does not move, because the total is what integrates across
            the window. Reallocating hazard between terms buys nothing.
          </p>
          <p>
            A consequence worth stating: with a realistic{' '}
            <span className={styles.mono}>p_e0</span> near 0.7%/yr, the competence condition requires{' '}
            <span className={styles.mono}>d ≤ −0.18%/yr</span>. Competence must{' '}
            <strong>outpace</strong> capability, not merely keep up.
          </p>
        </Sub>

        <Sub title="5.8 Does baseline malice grow with capability?">
          <p>
            §5.2 assumes <span className={styles.mono}>p_m0</span> is constant. A shrinking minority
            of non-sages in a world of compounding capability is plausibly more dangerous per head.
            Test it: let <span className={styles.mono}>p_m(t) = p_m0·e^(ct)·(1 − s(t))</span>.
          </p>
          <p>
            Integrating, and using <span className={styles.mono}>s₀e^(gτ) = 1</span> at saturation:
          </p>
          <div className={styles.block}>
            {`I_m = R · Φ(Q)
Φ(Q) = (s₀^(−Q) − 1)/Q − (s₀^(−Q) − s₀)/(Q + 1)
R = p_m0/g        Q = c/g`}
          </div>
          <p>
            A second dimensionless ratio against the same denominator. The closed form does not
            break; it generalizes. And <span className={styles.mono}>Φ(0) = K − 1 = 19.7233</span>{' '}
            exactly, so <span className={styles.mono}>exp(−R·Φ(0)) = (e·s₀)^R</span> recovers §5.4 as
            the <span className={styles.mono}>Q → 0</span> case. Verified against the exact integral
            to five significant figures.
          </p>
          <p>
            Since <span className={styles.mono}>e^(cτ) = s₀^(−Q) = 10^(9Q)</span>, the threshold
            collapses:
          </p>
          <Grid table={CAPABILITY_SCALING} numeric />
          <p>
            Holding <span className={styles.mono}>R*</span> above 0.50 requires{' '}
            <span className={styles.mono}>Q ≤ 0.032</span>, meaning capability may grow no faster
            than 0.019%/yr against moral growth of 0.6%/yr. Our own{' '}
            <span className={styles.mono}>Q</span> is plausibly between 1.7 and 8, giving{' '}
            <span className={styles.mono}>R*</span> of order 10⁻¹⁴ to 10⁻⁷².
          </p>
          <p>
            <strong>A result that extreme is the model, not the world.</strong> The error is that{' '}
            <span className={styles.mono}>e^(ct)</span> has no ceiling, and malice hazard saturates.
            Once a civilization can cross the extinction threshold once, further capability does not
            multiply the annual probability that someone crosses it. The hazard is
            threshold-dependent, not magnitude-dependent.
          </p>
          <p>So the correct form is</p>
          <div className={styles.block}>
            {`p_m(t) = p_m0 · min(1, e^(ct)/W) · (1 − s(t))`}
          </div>
          <p>
            and for any civilization already past <span className={styles.mono}>W</span> the
            multiplier is pinned at 1 across the whole window.{' '}
            <span className={styles.mono}>Q</span> returns to 0, <span className={styles.mono}>Φ</span>{' '}
            returns to <span className={styles.mono}>K − 1</span>, and{' '}
            <span className={styles.mono}>R*</span> returns to 0.700.{' '}
            <strong>§5.4 is right, and now it is right for a reason rather than by assumption.</strong>
          </p>
          <p>
            The asymmetry with §5.6 is substantive rather than convenient. Malice saturates because
            it requires only one threshold crossed. Error does not, because each new <em>kind</em> of
            capability opens failure channels the previous kinds did not have, and breadth has no
            natural ceiling. That is why <span className={styles.mono}>d</span> remains a live cliff
            while <span className={styles.mono}>Q</span> does not.
          </p>
        </Sub>
      </Section>

      <Section num="6" title="The full model">
        <Sub title="6.1 Survival to saturation">
          <div className={styles.block}>
            {`f_v = exp( − [ p_m0(1 − 1/K)·τ_v  +  I_e  +  p_x·τ_v ] )
    = (e·s₀)^R  ·  exp(−I_e)  ·  exp(−p_x τ_v)`}
          </div>
        </Sub>

        <Sub title="6.2 The modified Drake equation">
          <div className={styles.block}>
            {`N_obs = Ṅ · [ (1 − f_v)·f_c,s·L_s  +  f_v·f_c,ℓ·L_ℓ ]
L_ℓ = 1/p_x            f_v as in §6.1`}
          </div>
          <p>
            The first five Drake terms are absorbed into <span className={styles.mono}>Ṅ</span>.
            Nothing is claimed about them here.
          </p>
        </Sub>

        <Sub title="6.3 Parameters">
          <Grid table={PARAMETERS} />
        </Sub>

        <Sub title="6.4 Expected count">
          <div className={styles.block}>
            {`N_ℓ = Ṅ · f_v / p_x = 10⁶ · (e·s₀)^R · exp(−I_e)`}
          </div>
          <Grid table={EXPECTED_COUNT} numeric />
        </Sub>
      </Section>

      <Section num="7" title="Two thresholds">
        <Sub title="7.1 The moral threshold">
          <p>
            Setting <span className={styles.mono}>I_e</span> aside and requiring{' '}
            <span className={styles.mono}>N_ℓ ≥ 1</span>:
          </p>
          <div className={styles.result}>R* = log(Ṅ / p_x) / log(1/(e·s₀))</div>
          <p>
            With <span className={styles.mono}>Ṅ/p_x = 10⁶</span> and{' '}
            <span className={styles.mono}>e·s₀ = 2.72×10⁻⁹</span>:
          </p>
          <div className={styles.block}>R* = 6 / 8.566 = 0.700</div>
          <p>
            The single-hazard version gave 0.667. The correction moves it by five percent.{' '}
            <strong>
              In words: moral improvement must run at least 1.43 times faster than the malice hazard.
            </strong>
          </p>
        </Sub>

        <Sub title="7.2 The competence threshold">
          <p>
            Requiring <span className={styles.mono}>I_e &lt; ln 2</span>, so the error term costs
            less than half of <span className={styles.mono}>f_v</span>:
          </p>
          <Grid table={COMPETENCE_THRESHOLD} numeric />
          <p>
            <strong>
              In words: competence must keep pace with capability to within a fraction of a percent
              per year.
            </strong>
          </p>
        </Sub>

        <Sub title="7.3 The coupling">
          <p>
            <span className={styles.mono}>g</span> appears in both conditions, and this is the most
            consequential structural fact in the revised model. A low{' '}
            <span className={styles.mono}>g</span> raises <span className={styles.mono}>R</span>{' '}
            <em>and</em> tightens <span className={styles.mono}>d*</span>, because a slower
            transition means more years exposed to compounding capability.{' '}
            <strong>Moral slowness is punished twice.</strong> The two conditions are not
            independent, and a civilization cannot trade one against the other.
          </p>
        </Sub>

        <Sub title="7.4 Robustness of R*">
          <p>
            <span className={styles.mono}>R*</span> is a ratio of logarithms, so it is insensitive to
            the parameters that are least known. Sweeping{' '}
            <span className={styles.mono}>s₀</span> across four orders of magnitude and{' '}
            <span className={styles.mono}>Ṅ/p_x</span> across two:
          </p>
          <Grid table={THRESHOLD_SWEEP} numeric />
          <p>
            <span className={styles.mono}>R*</span> stays inside [0.47, 1.04] across the entire
            sweep. <strong>d* has no comparable robustness</strong>, since it depends exponentially
            on <span className={styles.mono}>p_e0</span> and{' '}
            <span className={styles.mono}>τ_v</span>, both poorly known. The second threshold is the
            weaker of the two.
          </p>
        </Sub>
      </Section>

      <Section num="8" title="Where we sit">
        <p>
          Using <span className={styles.mono}>p_m0</span> = 1%/yr (Hellman) and{' '}
          <span className={styles.mono}>g</span> = 0.6%/yr (the homicide anchor):
        </p>
        <div className={styles.block}>
          {`R = 1.67        f_v ≈ 5×10⁻¹⁵        N_ℓ ≈ 5×10⁻⁹`}
        </div>
        <p>
          Using <span className={styles.mono}>p_m0</span> = 0.3%/yr (superforecaster range) and the
          same <span className={styles.mono}>g</span>:
        </p>
        <div className={styles.block}>
          {`R = 0.50        f_v ≈ 5×10⁻⁵         N_ℓ ≈ 50`}
        </div>
        <p>
          <strong>
            The two credible parameter sets land on opposite sides of the moral threshold.
          </strong>{' '}
          The model does not tell us which universe we are in. It tells us the question reduces to
          measurable quantities, and that our best estimates straddle the line.
        </p>
        <p>
          Required improvement rates to clear <span className={styles.mono}>R*</span> = 0.700:
        </p>
        <Grid table={REQUIRED_GROWTH} numeric />
        <p>
          We have no measurement of <span className={styles.mono}>d</span> at all. That is the honest
          state of the second condition.
        </p>
      </Section>

      <Section num="9" title="The two-population result">
        <Sub title="9.1 The crossover">
          <div className={styles.block}>
            {`N_s = Ṅ (1 − f_v) L_s ≈ 3        N_ℓ = Ṅ f_v L_ℓ`}
          </div>
          <p>
            Equal when <span className={styles.mono}>f_v = L_s/L_ℓ = 3×10⁻⁶</span>.
          </p>
        </Sub>

        <Sub title="9.2 Consequence">
          <p>
            Below the threshold, the transitioned population outnumbers the doomed one by up to{' '}
            <span className={styles.mono}>L_ℓ/L_s ≈ 3×10⁵</span>.{' '}
            <strong>The filter cannot explain the silence.</strong> It predicts a crowded galaxy, and
            the whole explanatory burden falls on <span className={styles.mono}>f_c,ℓ</span>, which
            requires an independent argument about restraint. Above the threshold,{' '}
            <span className={styles.mono}>f_c,ℓ</span> is irrelevant because there is nobody to
            detect.
          </p>
        </Sub>

        <Sub title="9.3 The fork">
          <Grid table={FORK} />
          <p className={styles.caption}>
            Note the asymmetry: clearing requires <strong>both</strong> conditions, missing requires{' '}
            <strong>either</strong>. The revised model is strictly less optimistic than the
            single-hazard version.
          </p>
        </Sub>
      </Section>

      <Section num="10" title="What the decomposition bought">
        <Grid table={GAINS} />
        <Grid table={COSTS} />
      </Section>

      <Section num="11" title="Assumptions ledger">
        <div className={styles.assumptions}>
          {ASSUMPTIONS.map((a) => (
            <div key={a.id} className={styles.assumption}>
              <span className={styles.aid}>{a.id}</span>
              <div>
                <p className={styles.aclaim}>{a.claim}</p>
                <span
                  className={`${styles.akind} ${a.loadBearing ? styles.loadBearing : ''}`}
                >
                  {a.kind}
                  {a.loadBearing ? ' · load-bearing' : ''}
                </span>
                <p className={styles.afail}>{a.ifItFails}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '1.6rem' }}>
          <strong>A4 and A8 deserve the most attention and receive the least.</strong> Every observed
          social diffusion process is logistic, not exponential, and a logistic asymptote below 1.0
          would mean no civilization ever saturates at any <span className={styles.mono}>g</span>. A8
          is worse in a different way: it is not wrong so much as unmeasured, and the second
          threshold rests entirely on it.
        </p>
      </Section>

      <Section num="12" title="Falsification conditions">
        <ol className={styles.falsifiers}>
          {FALSIFIERS.map((f) => (
            <li key={f.lead}>
              <b>{f.lead}</b> {f.body}
            </li>
          ))}
        </ol>
      </Section>

      <section className={`${styles.section} ${styles.summary}`}>
        <div className={styles.wrap}>
          <span className={styles.secNum}>13</span>
          <h2>Summary</h2>
          <div className={styles.block}>
            {`S(n)   = (1 − p)ⁿ                              fixed hazard, always → 0
S(∞)   = exp(−p₀H / ln 2)  >  0                declining hazard, converges
p(t)   = p_m(t) + p_e(t) + p_x                 three terms, three masters
s₀     = 10⁻⁹,  K = ln(1/s₀) = 20.72           phoenix rate
τ_v    = K / g                                 saturation time
I_e    = p_e0 (e^(dτ) − 1)/d                   error integral,  d = c − e
f_v    = (e·s₀)^R · exp(−I_e) · exp(−p_x τ_v)  R = p_m0/g
N_ℓ    = Ṅ · f_v / p_x                         transitioned civilizations extant
R*     = log(Ṅ/p_x) / log(1/(e·s₀)) = 0.700    moral threshold
d*     : I_e(d*, τ_v) = ln 2                   competence threshold`}
          </div>
          <p>
            Two conditions, coupled through <span className={styles.mono}>g</span>. Improve fast
            enough to outrun your own malice, and keep competence within a fraction of a percent per
            year of capability. Miss either and the count goes to zero.
          </p>
          <p>
            <strong>Both terms of the first ratio are ours. So is the second.</strong>
          </p>
        </div>
      </section>

      <footer className={`${styles.wrap} ${styles.colophon}`}>
        <p className={`${styles.footnote} ${styles.colophonLink}`}>
          <Link href={backHref}>Back to the essay</Link>
        </p>
        <p className={`${styles.footnote} ${styles.mono} ${styles.colophonLine}`}>
          Arete &nbsp;·&nbsp; working note &nbsp;·&nbsp; subject to revision
        </p>
      </footer>
    </main>
  )
}
