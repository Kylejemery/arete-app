# Appendix A. The model behind the Long Filter

This appendix lays out the arithmetic that the interactive page
(`/playground/the-long-filter`) computes, in the order the page computes it.
Each step is explained twice: first in plain words, then as the formula a
reviewer would want to check. Every constant the page uses is listed with
its status: measured, assumed, or left as a dial for the reader to move.

Nothing here is new physics. The model is a survival-analysis model, the kind
used for radioactive decay, insurance and epidemiology, pointed at a
civilization instead of an atom or a patient. Its one unusual ingredient is
the moral input in section A.4.

---

## A.1 Notation

| Symbol | Meaning | Value on the page | Status |
|---|---|---|---|
| p | Annual probability of self-destruction (a hazard rate) | dial, 10⁻¹ to 10⁻⁵ | free |
| n, t | Years elapsed | dial, 1 to 10⁹ | free |
| H | Halving period of the hazard, when it is set to decay | 1,000 yr | assumed |
| s₀ | The phoenix rate: fraction of people who are sages before anyone cultivates it deliberately | 10⁻⁹ | measured (one source, order of magnitude) |
| K | ln(1/s₀), the "log distance" to a fully sage population | 20.72 | derived |
| g | Annual growth rate of the sage fraction | dial, 0.01% to 3.16% | free |
| τ_v | Duration of the transition, K/g | derived | derived |
| p_m0 | Annual malice hazard at the start of the transition | dial, 0.01% to 3.16% | free |
| R | The moral ratio, p_m0 / g | derived | derived |
| p_e0 | Annual error hazard at the start of the transition | 10⁻⁵ | assumed, unmeasured |
| c, e | Growth rate of capability, and of competence per unit capability | not separately set | free |
| d | The capability gap, c − e | dial, −0.2% to +0.4% | free |
| I_e | Accumulated error hazard across the transition | derived | derived |
| p_x | Irreducible external hazard (impacts, bursts, the star) | 10⁻⁸ | assumed |
| L_ℓ | Expected lifetime of a transitioned civilization, 1/p_x | 10⁸ yr | derived |
| Ṅ | Technological civilizations arising in the galaxy per year | 0.01 | assumed |
| f_v | Fraction of arising civilizations that survive the transition | derived | derived |
| N | Transitioned civilizations expected to exist in the galaxy now | derived | output |
| R\* | The moral threshold: the largest R for which N ≥ 1 | 0.700 | derived |
| d\* | The competence threshold: the gap at which error alone halves the survivors | derived | derived |

"Hazard" throughout means the probability of ending in a given year, given
that you reached that year. All rates are per year.

---

## A.2 Odds do not forget: survival under a fixed hazard

**In plain words.** Imagine a civilization that, every single year, rolls a
die with a thousand faces. If it comes up 1, that is the end. The chance of
dying in any one year is tiny, one in a thousand. But the die is rolled every
year, forever, and it never remembers that you got lucky last year. So the
question is not "will it come up 1 this year?" but "will it come up 1 at
some point in the next million years?", and the answer to that is yes, nearly
certainly. A small risk taken enough times becomes a certainty. The only
thing a smaller risk buys you is more time before the certainty arrives.

**The formula.** If the years are independent and each carries probability
p of catastrophe, survival across n years is

    S(n) = (1 − p)ⁿ

This is the law of radioactive decay in discrete form. It has a half-life,
the year by which half of a starting population has gone dark:

    n½ = ln(0.5) / ln(1 − p) ≈ (ln 2) / p     for small p

| p (per year) | 1 in | Half-life | Survival after 1 million years |
|---|---|---|---|
| 10⁻² | 100 | 69 yr | 0 |
| 10⁻³ | 1,000 | 693 yr | 0 |
| 10⁻⁴ | 10,000 | 6,931 yr | 4 × 10⁻⁴⁴ |
| 10⁻⁵ | 100,000 | 69,315 yr | 4.5 × 10⁻⁵ |

The plate on the page draws a thousand marks and lights S(n) × 1,000 of them.
The conclusion of this section is simply that for **any** fixed p > 0,
S(n) → 0 as n grows. There is no value of p small enough. There are only
values that take longer.

*Reviewer's note.* For p ≪ 1, (1 − p)ⁿ ≈ e^(−pn), and the two forms agree to
better than one part in 10³ at every p the page allows. The page uses the
exact discrete form for the fixed case and the continuous form below for the
decaying case. Mixing the two is harmless at these p, and is noted here only
so nobody thinks it was accidental.

---

## A.3 The one escape: a hazard that falls

**In plain words.** The arithmetic above has exactly one loophole. It assumed
the die stays the same forever. Suppose instead the risk halves every
thousand years: the die gets more faces as time goes on. Then the total risk
you ever face, added up over all of eternity, is finite. The bathtub is
draining, but the tap is being turned off faster than the tub empties, and
the water level settles at a floor instead of reaching zero. Survival does
not require the risk to be zero. It requires the risk to be *falling*, and
falling fast enough.

**The formula.** Let the hazard decay as p(t) = p₀ · 2^(−t/H). Survival is
the exponential of the accumulated hazard:

    S(t) = exp( −∫₀ᵗ p(u) du ) = exp( −(p₀ H / ln 2) · (1 − 2^(−t/H)) )

As t → ∞ the bracket goes to 1 and the survival probability settles at a
floor:

    S(∞) = exp( −p₀ H / ln 2 )

| p₀ | H | Floor |
|---|---|---|
| 10⁻³ | 1,000 yr | 23.6% |
| 10⁻⁴ | 1,000 yr | 86.6% |

That floor is the whole point of the page's first section. The rest of the
model is an attempt to say what could make a civilization's hazard fall, and
how fast it would have to fall.

*Reviewer's note.* Any hazard whose integral converges gives a floor.
Halving every H years is a convenient choice, not a claim about the world.
The same conclusion follows from any p(t) that decays faster than 1/t.

---

## A.4 The one measured input: the phoenix rate

**In plain words.** The model needs a starting point: how rare is a truly
good person, a sage, before anyone is trying to produce them on purpose?
Seneca, writing about two thousand years ago, says such a person appears
about once every five hundred years, "like the phoenix". He meant it as a
figure of speech about rarity. We read it, deliberately, as a rate. In the
Roman world of his day roughly fifty million people were alive at a time and
lived about twenty-five years on average, so about a billion lives were
lived in five hundred years. One sage per billion lives.

**The formula.**

    s₀ ≈ 1 sage / (50 × 10⁶ people × 500 yr / 25 yr per life) = 1 / 10⁹ = 10⁻⁹

Now suppose the sage fraction grows exponentially at rate g per year once a
civilization begins cultivating it:

    s(t) = s₀ · e^(g t)

The transition is finished when s reaches 1, which takes

    τ_v = ln(1/s₀) / g = K / g,     with K = ln(10⁹) = 20.72

**Why the target barely matters.** One would expect that "half the population
are sages" and "everyone is a sage" are very different goals. In this model
they are not, because the distance is measured in logarithms. Reaching s =
0.5 takes ln(0.5/s₀)/g, reaching s = 1 takes ln(1/s₀)/g, and the ratio is

    1 − (ln 2)/K = 0.967

At g = 0.6% a year: 3,338 years to half, 3,454 years to all. Three percent
more time for double the target. So whether the threshold is "a civilization
of sages" or "a civilization governed by sages" changes nothing that follows.

*Reviewer's notes.*

1. s₀ rests on a single literary sentence and two demographic round numbers.
   It is an order of magnitude, not a measurement with an error bar. Section
   A.7 shows the results are unusually insensitive to it, which is the only
   reason it is tolerable as an input.
2. s₀ is a **floor**: it measures the incidence of sagehood in a population
   not cultivating it deliberately or at scale. If cultivation has any
   effect, the true starting point is higher and every transition is shorter.
3. Exponential growth is an assumption, and the most consequential one in
   the model. If growth is logistic with a ceiling below 1, the transition
   never completes, and "rare" becomes "never". See A.10.

---

## A.5 Three hazards, and who governs each

**In plain words.** An earlier version of this model kept the annual risk
fixed while assuming the sage fraction was rising. Those cannot both be true
if goodness is what reduces the risk. So the risk has to be split into
parts, and each part asked: does it fall as the sage fraction rises, or not?
There turn out to be three parts.

1. **Malice.** Destruction someone chose, for gain, status or rivalry. This
   is the part goodness removes. But it removes it far more slowly than you
   would hope, because exponential growth spends almost all its time near
   zero: for most of the transition, nearly everyone is still not a sage.
2. **Error.** Accident, misjudgment, a design flaw nobody caught. Goodness
   does not fix this. Competence does. If a civilization's *capability*
   (what it can do) grows faster than its *competence* (how well it
   understands what it is doing), the error risk **compounds**, like
   interest on a debt, and it can swamp everything else.
3. **External.** An asteroid, a gamma-ray burst, the star ageing. Nobody
   governs this. It is negligible during the transition and, afterwards, it
   is the only thing left, so it is what sets how long a survivor survives.

**The formulas.** Survival through the transition is the exponential of the
total accumulated hazard, and the three hazards add:

    f_v = exp( −[ M + I_e + X ] )

*Malice.* Let the malice hazard be proportional to the non-sage fraction:
p_m(t) = p_m0 · (1 − s(t)). Integrating over the transition,

    M = p_m0 ∫₀^τ (1 − s₀ e^(g u)) du = p_m0 [ τ − (1 − s₀)/g ] ≈ p_m0 τ (1 − 1/K)

The bracket says that the entire mechanism of moral improvement removes only
a fraction 1/K = 4.8% of the malice exposure, because s(t) is close to zero
for almost all of τ. Substituting τ = K/g and writing R = p_m0/g:

    M = R (K − 1)
    exp(−M) = exp(−R ln(1/s₀) + R) = s₀^R · e^R = (e · s₀)^R

So the malice term keeps a closed form: it is exactly what a fixed hazard
p_m0 would give over the transition, with s₀ replaced by e·s₀ (e here is
Euler's number, 2.718…, not the competence rate). The page notes that this
moves the moral threshold from 0.667 to 0.700 and nothing else.

*Error.* Let the error hazard compound at the capability gap d = c − e:
p_e(t) = p_e0 · e^(d t). Then

    I_e = p_e0 ∫₀^τ e^(d u) du = p_e0 (e^(d τ) − 1) / d

At d = 0 this is the removable limit p_e0 τ. For d > 0 it grows exponentially
in d τ, and for d < 0 it saturates at p_e0/|d|.

*External.* Constant p_x, so X = p_x τ. For the page's numbers, p_x τ ≈
3 × 10⁻⁵, which is negligible. After the transition, p_x is the only hazard
left, so a survivor's expected lifetime is the mean of an exponential:

    L_ℓ = 1 / p_x = 10⁸ years

Putting the three together:

    f_v = (e · s₀)^R · exp(−I_e) · exp(−p_x τ_v)

*Reviewer's notes.*

1. Adding hazards and multiplying survivals is exact for independent
   competing risks. The model assumes malice, error and external events are
   independent within a year. Correlated failure (an error that provokes a
   war) would raise the total hazard above the sum.
2. The linear form p_m(t) ∝ (1 − s) is the simplest choice. Any form in
   which malice falls only as the sage fraction rises gives the same
   qualitative result, because s is near zero for most of τ regardless.
3. p_e0 = 10⁻⁵ is a placeholder. No one has measured it. Because I_e is
   exponential in d τ, the *shape* of the competence condition is robust but
   its *location* is not. This is the softest number in the model.

---

## A.6 The count: Drake, split in two

**In plain words.** The Drake equation multiplies the rate at which
civilizations appear by how long they last. It uses one average lifetime.
That average hides the whole problem, because there are two very different
populations: civilizations that never complete the transition, which last
maybe a hundred years, and civilizations that do, which last a hundred
million. Averaging a hundred with a hundred million tells you nothing about
either. So we split the equation into a doomed branch and a surviving one,
and separately ask whether a survivor would be *detectable*.

**The formula.** In a galaxy in steady state, the number of civilizations
present at any moment is arrival rate × fraction surviving × lifetime
(Little's law). Splitting by branch and multiplying each by its detectability
f_c:

    N_obs = Ṅ × [ (1 − f_v) · f_c,s · L_s  +  f_v · f_c,ℓ · L_ℓ ]

The page's headline number is the second branch, before detectability:

    N = Ṅ · f_v · L_ℓ = Ṅ · f_v / p_x

The first branch has L_s of order 1/p_m0 ≈ 100 years, seven orders of
magnitude below L_ℓ, and is dropped from the count.

*Reviewer's note.* Little's law needs the arrival rate to have been roughly
steady over at least one lifetime L_ℓ = 10⁸ years. The galaxy is ~10¹⁰ years
old and has been producing metal-rich stars for most of that, so the
assumption is reasonable, though Ṅ itself is an unknown that absorbs the
first five Drake terms. Ṅ = 0.01 per year is an assumption. Section A.7
shows the threshold depends on it only through a logarithm.

---

## A.7 Two conditions, not one

**In plain words.** The question "does at least one transitioned
civilization exist in the galaxy?" is N ≥ 1. Because N is a product of three
survival factors, it fails if *any one* of them is small enough. Two of them
depend on us, and they give two separate tests that cannot be traded against
each other.

- The **moral condition**: improvement has to outrun malice. Specifically
  the ratio R = p_m0 / g has to be below a threshold R\* ≈ 0.70. If your
  annual malice risk is more than about seven tenths of your annual moral
  improvement rate, the transition takes too long and the dice win.
- The **competence condition**: capability cannot outrun competence by more
  than a small margin d\* for the length of the transition, or the error
  term compounds and removes everyone regardless of how good they have
  become.

**The moral threshold.** Set d = 0 and neglect p_x τ. Then N ≥ 1 becomes

    (e · s₀)^R · Ṅ / p_x ≥ 1
    R ≤ R* = ln(Ṅ / p_x) / ln(1 / (e · s₀)) = ln(10⁶) / ln(3.68 × 10⁸) = 0.700

R\* is a ratio of two logarithms, which is why it barely moves when the badly
known inputs move. Sweeping each input over four orders of magnitude while
holding the other fixed:

| s₀ | R\* | | Ṅ / p_x | R\* |
|---|---|---|---|---|
| 10⁻⁷ | 0.914 | | 10⁴ | 0.467 |
| 10⁻⁸ | 0.793 | | 10⁵ | 0.584 |
| 10⁻⁹ | **0.700** | | 10⁶ | **0.700** |
| 10⁻¹⁰ | 0.627 | | 10⁷ | 0.817 |
| 10⁻¹¹ | 0.568 | | 10⁸ | 0.934 |

Getting s₀ wrong by a factor of ten thousand in either direction, or the
galaxy's civilization rate wrong by the same factor, changes R\* by less than
a factor of two. Whatever else is uncertain, "malice must be well under the
improvement rate" survives.

**The competence threshold.** The page defines d\* as the gap at which the
error term alone would halve the survivors:

    I_e(d*, τ_v) = ln 2

solved numerically by bisection, since I_e is monotone in d. It is a marker
on the diagram, not a hard boundary; the coloured region on the page is the
true joint condition N ≥ 1. The reason for the marker is to show how sharp
the cliff is. At g = 0.6% a year (τ_v = 3,454 years) and p_e0 = 10⁻⁵:

| d (per year) | e^(d τ) | I_e | exp(−I_e) |
|---|---|---|---|
| 0 | 1 | 0.035 | 0.966 |
| +0.05% | 5.6 | 0.092 | 0.912 |
| +0.10% | 32 | 0.31 | 0.74 |
| +0.13% = d\* | 89 | 0.69 | 0.50 |
| +0.20% | 1,000 | 5.0 | 0.007 |
| +0.30% | 31,600 | 105 | 10⁻⁴⁶ |

Doubling the gap from 0.1% to 0.2% costs a factor of a hundred. Tripling it
costs everything. That is what "exponential in an unmeasured rate" means in
practice, and it is why the page calls the second threshold soft.

**The two conditions are coupled.** τ_v = K/g appears inside I_e. A slower
moral improvement rate lengthens the transition, which means more years
exposed to compounding capability, which tightens d\*. Halving g from 0.6%
to 0.3% doubles R (for the same p_m0) *and* shrinks d\* from 0.131% to
0.052%. Moral slowness is punished twice, and no amount of competence buys
back a failed moral condition, or vice versa.

**Worked examples.** All at p_e0 = 10⁻⁵, p_x = 10⁻⁸, Ṅ = 0.01.

| p_m0 | g | d | R | τ_v (yr) | moral | competence | N |
|---|---|---|---|---|---|---|---|
| 1.0% | 0.6% | +0.10% | 1.67 | 3,454 | fail | pass | 4 × 10⁻⁹ |
| 0.4% | 0.6% | +0.10% | 0.67 | 3,454 | pass | pass | 1.4 |
| 0.4% | 0.6% | 0 | 0.67 | 3,454 | pass | pass | 1.9 |
| 0.4% | 0.6% | +0.20% | 0.67 | 3,454 | pass | fail | 0.013 |
| 0.2% | 0.3% | +0.05% | 0.67 | 6,908 | pass | pass | 1.1 |

The first row is where the page's dials start. The second and fourth differ
only in d, and the count moves by two orders of magnitude.

---

## A.8 The conclusions

The model does not resolve the Fermi question. It says the question has two
possible answers and that two measurable ratios pick between them.

**If both conditions are cleared, the galaxy is crowded and quiet.** Even a
filter that removes 99.99% of arising civilizations (f_v = 10⁻⁴) leaves
N = 0.01 × 10⁻⁴ / 10⁻⁸ = 100 transitioned civilizations alive at any time,
because each survivor lasts a hundred million years. The silence then cannot
be explained by the filter. It has to be explained by detectability, f_c,ℓ,
being near zero, and the paper's argument is that the reason is restraint:
survivors who reason from shared premises would independently conclude that
contact forecloses the free choosing of virtue, which is the one thing that
would have made contact worthwhile. This is a zoo hypothesis with one
property the others lack: the convergence on silence is not a sociological
coincidence that a single defector could break, but what correct reasoning
from a shared value premise produces. (The empirical premise is not shared,
so some survivors may have got it wrong.)

**If either condition is missed, the galaxy is empty.** Nothing clears the
filter. There is no paradox left to solve. The sky is quiet because nobody
is in it, and we are early rather than overlooked.

**The asymmetry.** Reaching the first branch requires clearing *both*
conditions. Reaching the second requires missing *either*.

**What is ours.** R = p_m0/g and d = c − e. All four terms are properties of
the civilization doing the reasoning, not of the galaxy. Which branch we are
on is not written anywhere.

---

## A.9 Assumptions, stated in one place

A reviewer should be able to attack each of these individually.

1. **Memorylessness.** Each year's hazard is independent of previous years,
   given the current rates. This is the standard survival-analysis
   assumption and is what makes the exponential forms exact.
2. **Additive hazards.** Malice, error and external hazards are independent
   competing risks, so total hazard is their sum. Correlated failure would
   make the model optimistic.
3. **Exponential growth of the sage fraction**, s(t) = s₀ e^(gt), all the
   way to s = 1. This is the load-bearing assumption. Logistic growth with a
   ceiling below 1 leaves a permanent non-sage residue, a permanent malice
   floor, and (by A.2) eventual certain extinction. The model is a best case
   in this respect.
4. **Malice proportional to the non-sage fraction.** Linear, with no
   threshold effects in either direction (a sage minority might suppress
   malice disproportionately through institutions, or a malicious minority
   might retain disproportionate destructive capacity).
5. **Error hazard exponential in the capability gap**, with d constant over
   the transition. A civilization that noticed the gap and closed it would
   face a time-varying d; the model has no feedback from error to
   competence.
6. **Constant external hazard** p_x = 10⁻⁸ per year, giving L_ℓ = 10⁸ years.
   This is of the order of the interval between major impact events and
   nearby gamma-ray bursts in current estimates, but it is a choice.
7. **Steady state** in the galaxy over ~10⁸ years, so that N = Ṅ f_v L_ℓ.
8. **Ṅ = 0.01 per year.** Absorbs the astrophysical and biological terms of
   the Drake equation. Enters R\* only through a logarithm.
9. **s₀ = 10⁻⁹** from one sentence of Seneca and two round demographic
   numbers. Order-of-magnitude at best; enters R\* only through a logarithm.
10. **p_e0 = 10⁻⁵ per year.** Unmeasured. Enters the competence condition
    linearly inside I_e, and thereby sets the *location* of d\*, though not
    its shape.
11. **"Exists" means N ≥ 1**, a galactic expectation value. It says nothing
    about distance or reachability.
12. **The transition ends at saturation** (s = 1) and the hazard afterwards
    is p_x alone. Post-transition malice and error are taken as zero.

---

## A.10 What would move the result

- **Measuring g.** Is the fraction of people who meet a defensible standard
  of sagehood growing at all, and at what rate? Any historical or
  cross-cultural estimate, however rough, is the single most valuable input
  the model lacks.
- **Measuring d.** Rates of capability growth are easier to estimate than
  competence, but there are proxies: the frequency of near-miss catastrophic
  errors per unit of destructive capacity over time.
- **Bounding p_e0.** Even a factor-of-ten bound would fix the location of
  d\* to within a fraction of a percent per year.
- **Replacing the exponential growth assumption** with a logistic one and
  asking what ceiling on s is compatible with survival. This is the
  extension most likely to change the qualitative conclusion.

---

## A.11 Reproduction

The page's arithmetic is implemented in
`academy/web/src/components/playground/LongFilter.tsx`, with the constants in
`academy/web/src/content/playground/long-filter.ts`. The following is
sufficient to reproduce every number in this appendix:

```python
from math import log, exp, e

s0, Ndot, px, pe0 = 1e-9, 0.01, 1e-8, 1e-5
K = log(1 / s0)                                   # 20.72
R_star = log(Ndot / px) / log(1 / (e * s0))       # 0.700

def I_e(d, tau):
    if abs(d) < 1e-12:
        return pe0 * tau
    return pe0 * (exp(d * tau) - 1) / d

def N(pm0, g, d):
    tau = K / g
    M = pm0 * (1 - 1 / K) * tau                    # = R (K - 1) = -ln (e s0)^R
    return Ndot * exp(-(M + I_e(d, tau) + px * tau)) / px

def d_star(tau, lo=-0.02, hi=0.05):
    for _ in range(80):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if I_e(mid, tau) < log(2) else (lo, mid)
    return lo

print(N(0.004, 0.006, 0.001))   # 1.43
print(d_star(K / 0.006))        # 0.00131
```

The plate in section A.2 draws 1,000 marks from a fixed linear congruential
seed so that the field is stable across redraws; only the number lit changes.
The phase diagram in A.7 evaluates N on a grid of (R, d), log-spaced in R
from 0.02 to 2.5 and linear in d from −0.2% to +0.4%, and colours cells by
whether N ≥ 1.
