import Link from 'next/link'
import {
  ASSUMPTIONS,
  COMPETENCE_THRESHOLD,
  COSTS,
  DECLINING_FLOOR,
  ERROR_SWEEP,
  EXPECTED_COUNT,
  FALSIFIERS,
  FIXED_HAZARD,
  FORK,
  GAINS,
  GAP_CLIFF,
  MALICE_GAP,
  MALICE_SPLIT,
  NOTATION,
  PARAMETERS,
  PHOENIX_FRAMES,
  PROGRESSOR_SHARE,
  REQUIRED_GROWTH,
  THRESHOLD_SWEEP,
  TRANSITION_TIME,
  type Table,
} from '@/content/playground/long-filter-formalism'
import { BYLINE, REFERENCES, REVISED } from '@/content/playground/long-filter'
import styles from './LongFilterFormalism.module.css'

/**
 * A table from the companion note. `numeric` sets the whole grid in mono and
 * tabular figures, for the ones meant to be read down a column; the prose
 * tables keep the book face and only mono the key. A table with `links` gets a
 * last column that opens each row's setting in the essay's phase diagram.
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
            {table.links && <th scope="col" aria-label="Try it" />}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
              {table.links && (
                <td>
                  <Link href={table.links[i]} className={styles.tryIt}>
                    try it ↗
                  </Link>
                </td>
              )}
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
        <p className={styles.byline}>
          {BYLINE} &nbsp;·&nbsp; {REVISED}
        </p>
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
          <p>
            Second revision: the realistic error baseline of §5.7, p_e0 ≈ 0.7%/yr, is now the
            headline. The original 10⁻⁵ is kept beside it in every table as the optimistic case, and
            the two give opposite answers, so §8 reports both. Rows marked &ldquo;try it&rdquo; open
            that setting in the essay&rsquo;s phase diagram.
          </p>
          <p>
            Third revision: the growing population is moral progressors rather than sages, growing
            logistically to a ceiling. One gap drives malice and error alike, no hazard switches off
            after the transition, and the count is taken from the expected lifetime past the
            transition&rsquo;s end. The closed forms are gone; §5.2 says what replaces them. The
            strongest claim is still §1.4, and every surviving path below is a conditional.
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
            Incidence of sagehood in a population making no systematic attempt to produce it. The
            model follows progressors, who are far more common than sages, and uses s₀ only as a
            conservative floor for their starting share.
          </p>
        </Sub>
      </Section>

      <Section num="4" title="The transition">
        <Sub title="4.1 Statement">
          <p>
            The growing population is moral progressors (<em>prokoptontes</em>), not sages. Their
            share starts at the phoenix floor and grows logistically to a ceiling:
          </p>
          <div className={styles.block}>
            {`ds/dt = g s (1 − s/s_max)        s(0) = s₀ = 10⁻⁹
s(t)  = s_max / (1 + (s_max/s₀ − 1) e^(−gt))
τ_v   : s(τ_v) = 0.99 s_max   ⇒   τ_v = [ ln(s_max/s₀ − 1) + ln 99 ] / g`}
          </div>
          <p>
            The transition is said to end when the share reaches 99% of its ceiling. That is a
            definition, not a finding, and §6.4 shows the count barely depends on it.
          </p>
        </Sub>

        <Sub title="4.2 Numerical values">
          <Grid table={TRANSITION_TIME} numeric />
        </Sub>

        <Sub title="4.3 Who counts as a progressor">
          <p>
            The test must be checkable and must not mention risk, or the argument is circular. The
            Stoic criteria serve: treating externals (health, wealth, reputation, winning) as
            indifferent rather than as goods, and acting from reason rather than from passion. The
            Stoics also held that all non-sages are equally far from virtue (Cicero,{' '}
            <em>De Finibus</em> 3.48). That is a claim about states. Risk responds to actions, and
            progressors perform the appropriate actions (<em>kathēkonta</em>) more reliably, so
            every individual&rsquo;s progress moves <span className={styles.mono}>s</span>.
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
            series measures progress toward virtue. Both measure something in its vicinity, and
            both are logistic in shape, which is why the model is.
          </p>
        </Sub>
      </Section>

      <Section num="5" title="Decomposition of the hazard">
        <Sub title="5.1 Statement">
          <div className={styles.block}>
            {`p_m(t) = p_m0 (1 − s) e^(dt)
p_e(t) = p_e0 [φ(1 − s) + (1 − φ)] e^(dt)
h(t)   = p_m + p_e + p_x                      for all t ≥ 0`}
          </div>
          <p>
            One gap <span className={styles.mono}>d = c − e</span> drives both reducible terms: the
            danger in a capability is the distance between having it and understanding it.{' '}
            <span className={styles.mono}>φ</span> is the share of error that depends on conflict
            (haste, secrecy, racing) and so falls as progressors spread. No term switches off when
            the transition ends, and <span className={styles.mono}>d</span> keeps its value.
          </p>
        </Sub>

        <Sub title="5.2 Survival">
          <div className={styles.block}>
            {`S(t) = exp( −∫₀ᵗ h(u) du )`}
          </div>
          <p>
            There is no closed form. Before the transition{' '}
            <span className={styles.mono}>s &lt; s_max·e⁻¹²</span> and the integral is exact; across
            it the hazard is integrated numerically; after it{' '}
            <span className={styles.mono}>s = s_max</span> and the remaining lifetime is exact in
            the exponential integrals. The page and Appendix A.11 implement the same scheme, and
            agree with brute-force integration to 0.2%.
          </p>
        </Sub>

        <Sub title="5.3 Why virtue's protection arrives late">
          <p>
            Logistic growth from one in a billion spends most of the transition near zero:
          </p>
          <Grid table={PROGRESSOR_SHARE} numeric />
          <p className={styles.caption}>
            At g = 0.6%/yr, progressors pass 1% only in year 2,688 of 4,218, by which time about four
            fifths of the transition&rsquo;s malice has been spent.
          </p>
        </Sub>

        <Sub title="5.4 What a negative gap does">
          <p>
            With <span className={styles.mono}>d &lt; 0</span> every reducible term shrinks
            geometrically, and its total over all time is finite: once{' '}
            <span className={styles.mono}>s = s_max</span> the remainder is{' '}
            <span className={styles.mono}>A/|d|</span>, where{' '}
            <span className={styles.mono}>A</span> is the reducible hazard left at that moment.
            Survival then has a floor, exactly as in §2, and a survivor lives about{' '}
            <span className={styles.mono}>1/p_x = 10⁸</span> years.{' '}
            <strong>
              A hazard you keep shrinking cannot eventually catch you; only one you leave standing
              can.
            </strong>{' '}
            With <span className={styles.mono}>d = 0</span> the residue{' '}
            <span className={styles.mono}>p_e0(1 − φ)</span> stays at 0.21%/yr for good, and
            survivors last a few centuries.
          </p>
        </Sub>

        <Sub title="5.5 The external term">
          <p>
            <span className={styles.mono}>p_x</span> does no work during the transition (
            <span className={styles.mono}>exp(−p_x τ_v) = 0.99996</span> at g = 0.6%/yr) and all its
            work afterward, once everything else has been retired. One parameter, two roles.
          </p>
        </Sub>

        <Sub title="5.6 The gap">
          <p>
            At the realistic baseline (<span className={styles.mono}>p_m0</span> 0.3%,{' '}
            <span className={styles.mono}>p_e0</span> 0.7%, g 0.6%), cumulative hazard through the
            transition and the count:
          </p>
          <Grid table={GAP_CLIFF} numeric />
          <p>
            <strong>This is a cliff, not a slope.</strong> Between d = −0.05% and −0.10% the count
            moves by more than three orders of magnitude, and at d = 0 it is fifteen orders short.
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
            The historical record leans against the borrowing. The documented near misses (Petrov
            1983, the NORAD training tape in 1979, Able Archer, B-59 in 1962) were overwhelmingly
            false alarms and misjudgment rather than decisions to attack. If that record is
            representative, malice is the minority share of the published totals. Splitting a 1
            percent total between the two terms, at g = 0.6%/yr:
          </p>
          <Grid table={MALICE_SPLIT} numeric />
          <p>
            <strong>d₁ is nearly invariant to the split.</strong> Both hazards carry the same gap,
            so it is the total that the gap has to shrink.
          </p>
        </Sub>

        <Sub title="5.8 Malice carries the gap too">
          <p>
            Because malice carries <span className={styles.mono}>e^(dt)</span>, a lead in competence
            shrinks it as well as error. At Hellman&rsquo;s 1%, far over the moral threshold, with the
            optimistic error baseline:
          </p>
          <Grid table={MALICE_GAP} numeric />
          <p>
            So <span className={styles.mono}>R &lt; R*</span> is no longer necessary. What R* still
            marks is how far a civilization is leaning on competence rather than character. The
            older objection that malice should grow with capability is absorbed here: it grows with
            the <em>gap</em>, which is capability not yet understood, and a negative gap shrinks it.
          </p>
        </Sub>

        <Sub title="5.9 The ceiling and the residue">
          <p>
            Chrysippus gave two causes for the distortion of reason: the persuasiveness of external
            things and the teaching of those around us (Diogenes Laertius 7.89). Culture therefore
            sets <span className={styles.mono}>g</span> and{' '}
            <span className={styles.mono}>s_max</span>; the ceiling is not human nature. A ceiling
            below one leaves <span className={styles.mono}>(1 − s_max)</span> of malice and conflict
            error standing for good. A civilization does not need everyone, only that the rest never
            get access to civilization-ending power, and that access is denied by retiring hazards
            (a negative gap), not by policing people.
          </p>
        </Sub>
      </Section>

      <Section num="6" title="The count">
        <Sub title="6.1 Counting past the transition">
          <div className={styles.result}>N = Ṅ ∫_τ^∞ S(t) dt</div>
          <p>
            The civilizations still alive past the end of their transition, by Little&rsquo;s law.
            The whole expected lifetime, <span className={styles.mono}>Ṅ ∫₀^∞ S dt</span>, will not
            do: at a 1% annual hazard the civilizations that die young contribute{' '}
            <span className={styles.mono}>Ṅ/h₀ ≈ 1</span> on their own, whatever happens later, so it
            cannot separate a crowded galaxy from an empty one.
          </p>
        </Sub>

        <Sub title="6.2 The first five Drake terms">
          <p>
            Absorbed into <span className={styles.mono}>Ṅ</span>. Nothing is claimed about them
            here. Detectability is left out of N and taken up in §9.
          </p>
        </Sub>

        <Sub title="6.3 Parameters">
          <Grid table={PARAMETERS} />
        </Sub>

        <Sub title="6.4 Expected count">
          <Grid table={EXPECTED_COUNT} numeric />
          <p className={styles.caption}>
            Where τ_v is put hardly matters: at d = −0.06% the 50%, 90% and 99% points give N =
            0.30690, 0.30690 and 0.30690.
          </p>
        </Sub>
      </Section>

      <Section num="7" title="Two thresholds">
        <Sub title="7.1 The moral threshold">
          <p>
            <span className={styles.mono}>R*</span> is the ratio{' '}
            <span className={styles.mono}>p_m0/g</span> at which malice alone, with no error and{' '}
            <span className={styles.mono}>d = 0</span>, brings N to one. It now depends on{' '}
            <span className={styles.mono}>g</span> and{' '}
            <span className={styles.mono}>s_max</span>, because a ceiling below one leaves malice
            standing:
          </p>
          <Grid table={THRESHOLD_SWEEP} numeric />
          <p>
            At s_max = 1 it is 0.667 at every g, close to the earlier closed form. At the default
            0.99 it is 0.304. By §5.8 it is a marker, not a wall.
          </p>
        </Sub>

        <Sub title="7.2 The competence threshold">
          <p>
            <span className={styles.mono}>d₁</span> is the gap at which N reaches one, every hazard
            included:
          </p>
          <Grid table={COMPETENCE_THRESHOLD} numeric />
          <p>
            <strong>
              At the realistic baseline competence must outpace capability by about 0.07% a year,
            </strong>{' '}
            through the transition and after it, at any plausible g. At the optimistic baseline a
            level gap is nearly enough.
          </p>
        </Sub>

        <Sub title="7.3 The coupling">
          <p>
            <span className={styles.mono}>g</span> still appears in both conditions. A slower
            transition means more years exposed before progressors arrive, so a low{' '}
            <span className={styles.mono}>g</span> tightens <span className={styles.mono}>d₁</span>{' '}
            slightly as well as raising <span className={styles.mono}>R</span>. But the gap now does
            most of the work, and <span className={styles.mono}>g</span> moves{' '}
            <span className={styles.mono}>d₁</span> by less than a factor of three across a twenty-fold
            range.
          </p>
        </Sub>

        <Sub title="7.4 Sensitivity of d₁">
          <p>
            d₁ barely moves with s_max (−0.0672% to −0.0665% from 0.90 to 1.00) or φ (−0.0645% to
            −0.0705% from 1 to 0). It is roughly proportional to the baseline error rate:
          </p>
          <Grid table={ERROR_SWEEP} numeric />
          <p>
            <strong>d₁ has no robustness to p_e0</strong>, and p_e0 is close to unmeasured. That is
            the honest state of the second threshold.
          </p>
        </Sub>
      </Section>

      <Section num="8" title="Where we sit">
        <p>
          <strong>The default path.</strong> Nothing in the record shows the total hazard falling, so
          §1.4 applies: on the current course self-destruction is close to certain. Every
          surviving setting below is a conditional.
        </p>
        <Sub title="8.1 At the optimistic error baseline, p_e0 = 10⁻⁵">
          <div className={styles.block}>
            {`p_m0 = 1%,   d = 0:        R = 1.67        N ≈ 9×10⁻¹⁴
p_m0 = 0.3%, d = 0:        R = 0.50        N ≈ 0.009
p_m0 = 0.3%, d = −0.07%:   R = 0.50        N ≈ 20,000`}
          </div>
        </Sub>
        <Sub title="8.2 At the realistic error baseline, p_e0 = 0.7%">
          <div className={styles.block}>
            {`p_m0 = 0.3%, d = 0:        R = 0.50        N ≈ 9×10⁻¹⁶
p_m0 = 0.3%, d = −0.07%:   R = 0.50        N ≈ 1.7
p_m0 = 0.3%, d = −0.20%:   R = 0.50        N ≈ 6,770`}
          </div>
          <p>
            <strong>If competence can outpace capability by about 0.07% a year for the length of
            the transition, and keep that lead afterwards, the galaxy should hold survivors.</strong>{' '}
            Otherwise it should not.
          </p>
        </Sub>
        <Sub title="8.3 A first, crude estimate of d">
          <p>
            The one proxy with any history is near misses per unit of destructive capacity in the
            nuclear era. The Chatham House catalogue lists thirteen cases of near nuclear use between
            1962 and 2002, about one every three years, while arsenals peaked near 70,000 warheads in
            1986 and then fell by more than half. Thirteen events cannot resolve a trend in their rate
            much finer than a couple of percent a year over forty years, so the proxy rules out a
            large gap in either direction and cannot tell −0.07% from zero. It is one technology, the
            catalogue is not a census, and warheads are a poor measure of capability.{' '}
            <strong>Crude, and labelled so.</strong>
          </p>
        </Sub>
        <p>Malice alone, with no lead in competence, would demand:</p>
        <Grid table={REQUIRED_GROWTH} numeric />
        <p>
          Rates far above either historical anchor. With a lead in competence the demand on{' '}
          <span className={styles.mono}>g</span> falls away (§5.8).
        </p>
      </Section>

      <Section num="9" title="The two-population result">
        <Sub title="9.1 The two populations">
          <p>
            Civilizations that leave a hazard standing live centuries; those that keep the gap
            negative live about 10⁸ years. The count in §6 is the second population alone.
          </p>
        </Sub>

        <Sub title="9.2 Consequence">
          <p>
            Where the gap stays below d₁ the long-lived population can number hundreds or
            thousands, and <strong>the filter cannot explain the silence</strong>: the explanatory
            burden falls on detectability, which needs an independent argument about restraint.
            Where any hazard is left standing there is nobody to detect.
          </p>
        </Sub>

        <Sub title="9.3 The fork">
          <Grid table={FORK} />
          <p className={styles.caption}>
            Note the asymmetry: the empty branch needs only one hazard left standing, the crowded
            one needs the gap kept negative indefinitely.
          </p>
        </Sub>

        <Sub title="9.4 Restraint, and the premise it needs">
          <p>
            The cosmopolitan objection: Stoic sages owe help to all, so why would they not teach?
            Because virtue must be chosen. Epictetus has Zeus admit that not even he can overpower a
            person&rsquo;s moral choice (<em>Discourses</em> 1.1.23). Instruction from a vastly
            superior civilization would land as authority, not as an offer the hearer could freely
            assess. This rests on a premise from Stoic physics (A13): reason (<em>logos</em>) is
            universal, so rational survivors of any species reach the same conclusion in different
            words; and humans are born with starting points toward virtue (<em>aphormai</em>), not
            the virtues. Accept it or reject it; the crowded branch stands or falls with it.
          </p>
        </Sub>
      </Section>

      <Section num="10" title="What the revision bought">
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
          <strong>A8 deserves the most attention and receives the least.</strong> It is not wrong so
          much as unmeasured, and d₁ is roughly proportional to it. §8.3 is the only attempt at a
          measurement, and it is crude.
        </p>
        <p>
          <strong>A note on A2 and institutions.</strong> A2 is not a claim that individual
          saintliness does the work instead of institutions. Error-correcting institutions (open
          criticism, transparency, reciprocal accountability) are the obvious way a hazard actually
          falls, and they enter the model as <span className={styles.mono}>e</span>. The claim is
          about what sustains them. Every such institution can be gamed by the people inside it, and
          it holds only while most of them will not game it. Progressors rise into government and
          business gradually and change institutions from within, which is how a minority lowers
          risk before it is a majority. A2 fails if institutions can be made self-enforcing among
          people who would game them given the chance.
        </p>
        <p>
          <strong>A note on A2 and coercion.</strong> The obvious alternative to character is
          control: a surveillance state of the kind Bostrom describes. It concentrates malice in the
          controllers rather than removing it. A hazard left standing ends in certain extinction
          (§1.4), so coercion survives only if the controllers are reliably good, which is A2 again,
          asked of the few with the most power to abuse.
        </p>
        <p>
          <strong>A note on A2 and dispersal.</strong> §1 counts one trial a year, which holds only
          if one catastrophe is total. Dispersal relaxes that only for a settlement that could
          rebuild technological civilization on its own. Within one system, settlements are days to
          months of transit apart: that decorrelates <span className={styles.mono}>p_x</span> but
          barely touches <span className={styles.mono}>p_m</span> or{' '}
          <span className={styles.mono}>p_e</span>, since weapons and pathogens cross the distance
          and every settlement builds from the same designs, and each brings its own malice and
          error. Across interstellar distance the hazards decouple and the civilization survives if
          any colony does, <span className={styles.mono}>S = 1 − ∏(1 − Sᵢ)</span>. But the ordering
          runs the wrong way: the power to destroy yourself arrives long before the power to leave,
          so dispersal comes after the filter, not instead of it. A12 makes that a hypothesis: with{' '}
          <span className={styles.mono}>T_s</span> = 10⁴ years the transition finishes first while{' '}
          <span className={styles.mono}>g</span> exceeds about 0.25% a year. Because τ_v grows as g
          falls, the escape is most available exactly where the model is bleakest. A civilization
          that escaped by dispersal without transitioning would carry its expansion with it, and
          would be the loud population the sky does not show.
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
            {`S(n)   = (1 − p)ⁿ                                  fixed hazard, always → 0
S(∞)   = exp(−p₀H / ln 2)  >  0                    declining hazard, converges
ds/dt  = g s (1 − s/s_max),  s₀ = 10⁻⁹              progressors, from a phoenix floor
p_m    = p_m0 (1 − s) e^(dt)                        malice
p_e    = p_e0 [φ(1 − s) + 1 − φ] e^(dt)             error
h      = p_m + p_e + p_x                            for all time
τ_v    : s(τ_v) = 0.99 s_max                        4,218 yr at g = 0.6%
N      = Ṅ ∫_τ^∞ S dt                               civilizations past the transition
R*     : N = 1 with p_e0 = 0, d = 0                 0.304 at the defaults
d₁     : N = 1                                      −0.067%/yr at the realistic baseline
T_s    = 10⁴ yr, a hypothesis                       τ_v < T_s requires g > 0.25%`}
          </div>
          <p>
            On the current course, a hazard left standing makes self-destruction close to certain.
            If a civilization were to survive, it would have to look like this: competence kept
            ahead of capability by about 0.07% a year, through the transition and after it, so
            that every hazard keeps shrinking.
          </p>
          <p>
            <strong>Nobody has measured the lead. Every term in it is ours.</strong>
          </p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.wrap}`}>
        <span className={styles.secNum}>14</span>
        <h2>References</h2>
        <ol className={styles.references}>
          {REFERENCES.map((r) => (
            <li key={r.cite}>
              {r.href ? (
                <a href={r.href} target="_blank" rel="noopener noreferrer">
                  {r.cite}
                </a>
              ) : (
                r.cite
              )}
            </li>
          ))}
        </ol>
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
