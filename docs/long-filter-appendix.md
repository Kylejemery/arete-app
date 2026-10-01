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
| p | Annual probability of self-destruction (a hazard rate), section I | dial, 10⁻¹ to 10⁻⁵ | free |
| n, t | Years elapsed | dial, 1 to 10⁹ | free |
| H | Halving period of the hazard, when it is set to decay | 1,000 yr | assumed |
| s | Share of moral progressors (prokoptontes) in the population | derived | derived |
| s₀ | Starting share, floored at the phoenix rate of sagehood | 10⁻⁹ | a floor (one source, order of magnitude) |
| s_max | Ceiling on the progressor share | dial, 0.90 to 1.00, default 0.99 | free |
| g | Growth rate of the progressor share | dial, 0.01% to 3.16% | free |
| τ_v | End of the transition: the year s reaches 99% of s_max | derived | definition |
| p_m0 | Annual malice hazard at the start of the transition | dial, 0.01% to 3.16% | free |
| R | The moral ratio, p_m0 / g | derived | derived |
| p_e0 | Annual error hazard at the start of the transition | dial; 0.7% realistic, 10⁻⁵ optimistic | assumed, unmeasured |
| φ | Share of error that depends on conflict, and so falls with s | dial, 0 to 1, default 0.7 | free |
| c, e | Growth rate of capability, and of competence per unit capability | not separately set | free |
| d | The capability gap, c − e, driving malice and error alike | dial, −0.5% to +0.3% | free, the open question |
| p_x | Irreducible external hazard (impacts, bursts, the star) | 10⁻⁸ | assumed |
| Ṅ | Technological civilizations arising in the galaxy per year | 0.01 | assumed |
| S(t) | Probability of surviving to year t | derived | derived |
| N | Civilizations past their transition, expected in the galaxy now | derived | output |
| R\* | The moral threshold: R at which malice alone, with d = 0, brings N to one | 0.304 at the defaults | derived |
| d₁ | The competence threshold: the gap at which N reaches one | −0.067% at the realistic defaults | derived |
| T_s | Date of interstellar settlement | 10⁴ yr | a hypothesis |

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

This is the strongest claim in the model, and the one the essay leads with.
Nothing in the record shows the total hazard falling, so on the course we are
on self-destruction is close to certain. Everything after A.3 describes what
survival would have to look like if it were to happen.

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

## A.4 Who is growing: progressors, from a phoenix floor

**In plain words.** The model needs a population whose growth lowers risk.
Sages, the Stoic ideal, are too rare to be that population; by definition
almost nobody is one. Moral progressors are: people the Stoics called
*prokoptontes*, not yet wise but making progress toward it. The model needs
how many there are at the start, how fast their share grows, and where it
stops.

For the start it borrows Seneca. He writes that the good man appears about
once every five hundred years, "like the phoenix". In the Roman world of his
day roughly fifty million people were alive at a time and lived about
twenty-five years, so about a billion lives were lived in five hundred
years: one sage per billion lives. That is the incidence of sages, and
progressors are far more common, so using it as the starting share of
progressors is a conservative floor. Any larger start shortens everything
that follows.

**Who counts.** The test has to be checkable, and it must not mention risk,
or the argument would be circular. The Stoic criteria serve: a progressor
treats externals (health, wealth, reputation, winning) as indifferent rather
than as goods, and acts from reason rather than from passion. Neither says
anything about catastrophe, and both show in conduct.

**The paradox.** The Stoics also held that all who are not wise are equally
far from virtue: a man an arm's length under the surface drowns as surely as
one five hundred fathoms down (Cicero, *De Finibus* 3.48). That is a claim
about states. Risk responds to actions, and progressors perform appropriate
actions (*kathēkonta*) more reliably than others. So every individual's
progress moves s, whether or not anyone arrives.

**The formula.**

    s₀ = 1 / (50 × 10⁶ people × 500 yr / 25 yr per life) = 10⁻⁹
    ds/dt = g s (1 − s/s_max)
    s(t)  = s_max / (1 + (s_max/s₀ − 1) e^(−g t))

The transition is said to end when the share reaches 99% of its ceiling:

    τ_v = [ ln(s_max/s₀ − 1) + ln 99 ] / g

| g | Midpoint, s = s_max/2 | τ_v |
|---|---|---|
| 0.1% | 20,713 yr | 25,308 yr |
| 0.3% | 6,904 yr | 8,436 yr |
| 0.6% | 3,452 yr | 4,218 yr |
| 1.0% | 2,071 yr | 2,531 yr |
| 2.0% | 1,036 yr | 1,265 yr |

(All at s_max = 0.99.)

**Protection arrives late.** Logistic growth from one in a billion spends
most of the transition near zero. At g = 0.6% the share passes 1% only in
year 2,688 of 4,218, and by then about four fifths of all the malice the
transition will see has been spent:

| Share exceeds | Only in the final |
|---|---|
| 10⁻⁶ | 72.7% of the transition |
| 10⁻⁴ | 54.5% |
| 10⁻² | 36.3% |
| 10⁻¹ | 26.8% |
| 0.5 | 18.1% |

**Why people say no.** Chrysippus gave two causes for the distortion of
reason: the persuasiveness of external things and the teaching of those
around us (Diogenes Laertius 7.89). Nature gives starting points (*aphormai*)
that are uncorrupted; what corrupts them is what is prized and taught. So
culture sets g and s_max, and the ceiling is not human nature. The target is
the values, treating externals as goods, not markets as such. European
homicide fell about 0.6% a year for six centuries (Eisner), the source of the
default g. The decline of war between states is contested: Cirillo and Taleb
argue the data cannot tell a falling rate from a quiet stretch under a
heavy-tailed constant risk. The recent wars fit the model: a quiet stretch
under constant risk is a lull, not a falling hazard (A.2).

*Reviewer's notes.*

1. s₀ rests on a single literary sentence and two demographic round numbers.
   It is an order of magnitude, used only as a floor.
2. τ_v is a definition. Put it at the half or the 90% point instead and,
   wherever d < 0, N changes by less than one part in a thousand (A.7).
3. Teaching raises g. The essay is a small part of the mechanism it
   describes, which is worth saying once and not leaning on.

---

## A.5 Three hazards, one gap

**In plain words.** The risk is split into three parts, and one quantity
drives the first two: the gap d between how fast capability grows and how
fast the understanding of it grows. When capability runs ahead, each new
power arrives before anyone knows how to hold it, and both the chance that
someone uses it and the chance that it fails grow with the gap. No part
switches off when the transition ends.

1. **Malice.** Destruction someone chose, for gain, status or rivalry. It
   falls as progressors spread and with the gap. With a ceiling below one it
   never reaches zero by virtue alone.
2. **Error.** Accident, misjudgment, a flaw nobody caught. A share φ of it
   comes from conflict (haste, secrecy, racing) and falls as progressors
   spread. The rest is accident that virtue does not prevent; only the gap
   shrinks it. Castle Bravo (1954) is the clearest case of the conflict
   share: its yield was calculated honestly, the calculation missed a
   reaction, and the device came in at 15 megatons instead of 6. The mistake
   was ordinary; a test of that size, at that pace, existed only because of
   the arms race (Martin and Rowland, DNA 6035F, 1982).
3. **External.** An asteroid, a gamma-ray burst, the star ageing. Nobody
   governs it. Once everything else is retired, it sets how long a survivor
   survives.

**The formulas.**

    p_m(t) = p_m0 (1 − s(t)) e^(d t)
    p_e(t) = p_e0 [ φ (1 − s(t)) + (1 − φ) ] e^(d t)
    h(t)   = p_m(t) + p_e(t) + p_x                    for all t ≥ 0
    S(t)   = exp( −∫₀ᵗ h(u) du )

There is no closed form. Before the transition s < s_max·e⁻¹² and ∫h is
exact; across it the hazard is integrated numerically; after it s = s_max and
the remaining lifetime is exact in the exponential integrals (A.11).

**What a negative gap does.** With d < 0 every reducible term shrinks
geometrically, and its total over all time is finite: once s = s_max the
remainder is A/|d|, where A is the reducible hazard left at that moment.
Survival has a floor, exactly as in A.3, and a survivor then lives about
1/p_x = 10⁸ years. **A hazard you keep shrinking cannot eventually catch
you; only one you leave standing can.** With d = 0 the error virtue does not
touch, p_e0(1 − φ) = 0.21%/yr at the realistic baseline, stays for good;
with the ceiling's share of malice and conflict error the hazard left
standing is 0.22%/yr, and survivors of the transition last about 460 years.
Finishing the transition buys centuries, not epochs, unless hazards keep
being retired.

**Institutions.** What raises e is the machinery of error correction: open
criticism, replication, audit, a press nobody owns. Those institutions work
only while the people inside them will not game them. Progressors rise into
government and business gradually and change institutions from within; that
is how a minority lowers risk before it is a majority, and why the
transition is a movement of the whole civilization, beginning with
understanding and then choice.

*Reviewer's notes.*

1. Adding hazards and multiplying survivals is exact for independent
   competing risks. Correlated failure (an error that provokes a war) would
   raise the total above the sum.
2. The shared factor e^(dt) is the model's one structural bet. If malice
   ignored the gap, R\* would again be a necessary condition (A.7).
3. p_e0 is unmeasured. d₁ is roughly proportional to it (A.7). This is the
   softest number in the model.
4. All three terms treat a civilization as a single target until the
   transition ends. Dispersal counts only for a settlement that could rebuild
   technological civilization on its own. Within one system, settlements are
   days to months apart: that decorrelates p_x, but barely touches p_m or
   p_e, since weapons and pathogens cross the distance, every settlement
   builds from the same designs, and each brings its own malice and error.
   Across interstellar distance the hazards decouple, and the civilization
   survives if any colony does, S = 1 − ∏(1 − Sᵢ). But the power to destroy
   yourself arrives long before the power to leave, so dispersal comes after
   the filter, not instead of it (A.9, items 13 and 14).

---

## A.6 The count: Drake, counted past the transition

**In plain words.** The Drake equation multiplies the rate at which
civilizations appear by how long they last. Almost every civilization dies
young, and a few, if any, last for epochs, so one average lifetime hides
everything. The count here is only the civilizations still alive past the
end of their transition. The whole expected lifetime would not do: at a 1%
annual hazard the ones that die young contribute about one civilization's
worth on their own (Ṅ/h₀ = 0.01/0.01), whatever happens later, and would
drown the signal.

**The formula.** In a galaxy in steady state (Little's law):

    N = Ṅ ∫_τ^∞ S(t) dt

The hazards run on unchanged across τ_v; τ_v only decides who is counted.
Detectability is not in N; the silence is taken up in A.8.

*Reviewer's note.* Little's law needs the arrival rate to have been roughly
steady over a survivor's lifetime, about 10⁸ years. The galaxy is ~10¹⁰
years old, so the assumption is reasonable, though Ṅ itself is an unknown
that absorbs the first five Drake terms.

---

## A.7 Two thresholds

**In plain words.** The question "should the galaxy hold survivors?" is
N ≥ 1. Two thresholds describe where that line sits.

- The **moral threshold** R\*: the ratio p_m0/g at which malice alone, with
  no error and no gap, brings N to one. It is now a marker rather than a
  wall: malice carries the gap too, so a lead in competence can carry a
  civilization over R\*.
- The **competence threshold** d₁: the gap at which N reaches one with every
  hazard included. **At the realistic baseline it is about −0.07% a year:
  competence has to outpace capability, not keep pace with it, through the
  transition and after it.**

**The moral threshold.** R\* comes from bisection and depends on g and s_max,
because a ceiling below one leaves malice standing:

| | g = 0.3% | 0.6% | 1.0% |
|---|---|---|---|
| s_max = 0.90 | 0.235 | 0.208 | 0.188 |
| 0.95 | 0.265 | 0.237 | 0.217 |
| 0.99 | 0.333 | **0.304** | 0.283 |
| 0.999 | 0.432 | 0.402 | 0.380 |
| 1.00 | 0.667 | 0.667 | 0.667 |

At s_max = 1 it is 0.667 at every g, close to the earlier closed form.
At Hellman's 1% (R = 1.67, far over R\*) and the optimistic error baseline,
N is 9 × 10⁻¹⁴ at d = 0, 0.47 at d = −0.06% and 62 at d = −0.10%.

**The competence threshold.** At the realistic baseline (p_m0 0.3%, p_e0 0.7%,
g 0.6%), the cumulative hazard through the transition and the count:

| d (per year) | Malice to τ | Error to τ | N |
|---|---|---|---|
| +0.05% | 28.2 | 76.5 | 2 × 10⁻⁴⁶ |
| 0 | 10.4 | 25.8 | 9 × 10⁻¹⁶ |
| −0.03% | 6.44 | 15.6 | 4 × 10⁻⁵ |
| −0.05% | 4.92 | 11.7 | 0.03 |
| **−0.067% = d₁** | 4.04 | 9.57 | **1** |
| −0.10% | 2.90 | 6.81 | 59 |
| −0.20% | 1.50 | 3.50 | 6,770 |

A cliff, not a slope: between −0.05% and −0.10% the count moves by more
than three orders of magnitude.

d₁ barely moves with s_max (−0.0672% to −0.0665% from 0.90 to 1.00) or φ
(−0.0645% to −0.0705% from 1 to 0), and by less than a factor of three with
g across a twenty-fold range (−0.072% at 0.1%, −0.032% at 2%). It is roughly
proportional to the baseline error rate:

| p_e0 | 10⁻⁵ | 10⁻⁴ | 10⁻³ | 3 × 10⁻³ | 7 × 10⁻³ | 10⁻² | 2 × 10⁻² |
|---|---|---|---|---|---|---|---|
| d₁ | −0.001% | −0.002% | −0.011% | −0.031% | **−0.067%** | −0.091% | −0.166% |

**Where the line sits does not depend on where τ_v is put.** At d = −0.06%,
counting from the 50%, 90% or 99% point gives N = 0.30690 each time.

**Worked examples.** p_x = 10⁻⁸, Ṅ = 0.01, s_max 0.99, φ 0.7.

| p_m0 | p_e0 | g | d | R | τ_v (yr) | N |
|---|---|---|---|---|---|---|
| 1.0% | 10⁻⁵ | 0.6% | 0 | 1.67 | 4,218 | 9 × 10⁻¹⁴ |
| 0.3% | 10⁻⁵ | 0.6% | 0 | 0.50 | 4,218 | 0.009 |
| 0.4% | 10⁻⁵ | 0.6% | +0.10% | 0.67 | 4,218 | 1 × 10⁻⁵⁶ |
| 0.4% | 10⁻⁵ | 0.6% | −0.07% | 0.67 | 4,218 | 5,454 |
| 0.3% | 0.7% | 0.6% | 0 | 0.50 | 4,218 | 9 × 10⁻¹⁶ |
| 0.3% | 0.7% | 0.6% | −0.07% | 0.50 | 4,218 | 1.7 |
| 0.3% | 0.7% | 0.6% | −0.20% | 0.50 | 4,218 | 6,770 |
| 1.0% | 0.7% | 0.6% | −0.10% | 1.67 | 4,218 | 0.07 |

Every surviving row has a negative gap. None with d ≥ 0 survives at the
realistic baseline.

**A first, crude estimate of d.** The one proxy with any history is near
misses per unit of destructive capacity in the nuclear era. The Chatham House
catalogue lists thirteen cases of near nuclear use between 1962 and 2002,
about one every three years, while arsenals peaked near 70,000 warheads in
1986 and then fell by more than half. Thirteen events cannot resolve a trend
in their rate much finer than a couple of percent a year over forty years,
so the proxy rules out a large gap in either direction and cannot tell
−0.07% from zero. It is one technology, the catalogue is not a census, and
warheads are a poor measure of capability. Crude, and labelled so.

---

## A.8 The conclusions

**The negative result comes first.** On the course we are on, a hazard left
standing, however small, makes self-destruction close to certain (A.2).
Nothing in the record shows the total hazard falling. This is the strongest
claim, and it needs the fewest assumptions.

**The surviving path is a conditional.** If a civilization were to survive,
it would have to look like this: **if competence can outpace capability by
about 0.07% a year for the length of the transition, and keep that lead
afterwards, the galaxy should hold survivors.** d is the open question, and
A.7 gives the only crude estimate there is.

**Virtue is chosen for its own sake.** The payoff lies thousands of years
out, and no instrumental motive survives that discount. The filter spares
civilizations that stopped treating survival, wealth and winning as goods;
it does not reward wanting to survive. This appendix, like the essay, is an
illumination of the default path, not a sales pitch for virtue.

**After the transition.** Survivors keep retiring hazards and never build
capability ahead of understanding, so d stays negative and the remaining
risk shrinks to a finite total. Nuclear decommissioning (about 70,000
warheads in 1986, about 12,000 now) is the small example on the record;
declining to race for superintelligence would be the same move made in
advance. Races are what force capability ahead of understanding, so virtue is
what makes caution affordable.

**The residue.** A civilization does not need everyone to choose virtue, only
enough that the rest never get access to civilization-ending power. That
access is denied by retiring hazards, not by policing people.

**Coercion is not a substitute.** A surveillance state of the kind Bostrom
describes concentrates malice in the controllers rather than removing it. A
hazard left standing ends in certain extinction (A.2), so coercion survives
only if the controllers are reliably good, which is virtue again.

**If the gap stays below d₁, the galaxy is crowded and quiet.** Even a filter
that removes 99.99% of arising civilizations leaves about a hundred alive,
because each survivor lasts about 10⁸ years. The silence then cannot be
explained by the filter, and has to rest on restraint. The cosmopolitan
objection is that Stoic sages owe help to everyone, so why would they not
teach? Because virtue must be chosen (Epictetus, *Discourses* 1.1.23), and
instruction from a vastly superior civilization would land as authority, not
as an offer the hearer could freely assess. This rests on a premise from
Stoic physics, named so a reader can accept or reject it: reason (*logos*) is
universal, so rational survivors of any species reach the same conclusions in
different words, and humans are born with starting points toward virtue
(*aphormai*), not the virtues.

**If any hazard is left standing, the galaxy is empty.** There is no paradox
left to solve. The sky is quiet because nobody is in it, and we are early
rather than overlooked.

**The asymmetry.** The empty branch needs only one hazard left standing. The
crowded branch needs the gap kept negative indefinitely.

---

## A.9 Assumptions, stated in one place

A reviewer should be able to attack each of these individually.

1. **Memorylessness.** Each year's hazard is independent of previous years,
   given the current rates.
2. **Additive hazards.** Malice, error and external hazards are independent
   competing risks. Correlated failure would make the model optimistic.
3. **Logistic growth of the progressor share** to a ceiling s_max set by
   culture. A lower ceiling moves R\* a great deal and d₁ hardly at all.
4. **Malice and conflict error proportional to the non-progressor share.**
   The share is near zero for most of the transition, so the form matters
   only near the end.
5. **One gap drives malice and error, and keeps its value afterwards.** The
   model has no feedback from error to competence and no drift in d after
   τ_v.
6. **Constant external hazard** p_x = 10⁻⁸ per year, of the order of the
   interval between major impacts and nearby gamma-ray bursts.
7. **Steady state** in the galaxy over ~10⁸ years.
8. **Ṅ = 0.01 per year.** Absorbs the astrophysical and biological terms of
   the Drake equation.
9. **s₀ = 10⁻⁹** from one sentence of Seneca and two round numbers, used only
   as a floor.
10. **p_e0 = 0.7% realistic, 10⁻⁵ optimistic.** Unmeasured. d₁ is roughly
    proportional to it.
11. **"Exists" means N ≥ 1**, a galactic expectation value. It says nothing
    about distance or reachability.
12. **Progressors are identified without reference to risk**, by treating
    externals as indifferent and acting from reason. Otherwise the argument
    is circular.
13. **A single target until the transition ends.** One catastrophe ends the
    whole civilization. Dispersal within a system does not relax this for
    p_m or p_e (A.5, note 4). This is the formal counterpart of A2 on the
    formalism page.
14. **Interstellar settlement arrives after the transition**, T_s > τ_v, with
    T_s = 10⁴ years taken as a hypothesis (A12 on the formalism page). It
    holds while g exceeds about 0.25% a year.
15. **Logos is universal, and people are born with starting points toward
    virtue.** A premise from Stoic physics. Only the explanation of the
    silence depends on it (A13 on the formalism page).

---

## A.10 What would move the result

- **Measuring d.** The near-miss proxy in A.7 is the first attempt and far
  too coarse. Accident and near-miss records per unit of destructive
  capacity, across more than one technology, are the single most valuable
  input the model lacks.
- **Bounding p_e0.** d₁ is roughly proportional to it; a factor-of-ten bound
  would fix d₁ to within a factor of ten.
- **Measuring g and s_max.** Any long-run series closer to the Stoic
  criteria than homicide would do. The ceiling is cultural, so it can move.
- **Dating interstellar settlement.** T_s is a hypothesis. The crossing
  g_s at which τ_v = T_s is about 2.5% at 10³ years and 0.025% at 10⁵ years.
  Modelling what dispersal does to N once it arrives, rather than only
  flagging it, is the natural extension.
- **Dispersal as a branching process.** Not built into the model. Treat
  self-sufficient interstellar settlements as a linear birth–death process:
  each founds new ones at rate b and ends at its own total hazard μ,
  independently. The lineage survives with positive probability if and only
  if b > μ, and then with probability 1 − μ/b (checked by Monte Carlo).
  Take b, as a hypothesis like T_s, to be one daughter settlement every
  1,000 to 10,000 years (10⁻³ to 10⁻⁴ a year).

  | Where μ comes from | μ | Lifetime | Lineage survives at b = 10⁻³, 10⁻⁴ |
  |---|---|---|---|
  | Before the transition (h₀) | 10⁻² /yr | 100 yr | no, no |
  | After it, realistic defaults, d = 0 | 2.2 × 10⁻³ /yr | 460 yr | no, no |
  | After it, malice alone at R\* | 1.8 × 10⁻⁵ /yr | 55,000 yr | 98%, 82% |

  The home civilization must also be alive when settlement becomes possible.
  At the pre-transition hazard, lasting the ten thousand years to T_s has a
  chance of about 10⁻⁴⁴. After the transition, the wait is the remaining
  T_s − τ_v ≈ 5,800 years, survived with probability 3 × 10⁻⁶ when the
  residue gives a 460-year life and 0.90 when it gives 55,000. So dispersal cannot replace the transition
  (the ordering argument), and after it rescues only a civilization whose
  leftover risk is already small: it is a rival to retiring hazards, not to
  the thesis. It is the generous case: shared culture and designs correlate
  the settlements' hazards and raise the effective μ, and with d > 0 every
  μ eventually passes b. A lineage that survives this way must keep
  spreading, and would be the loud population the sky does not show.
- **Malice that needs silent bystanders.** A possible extension, not built
  into the model. If an attack needs both a malicious person and silence
  from the people around them, malice falls faster than the non-progressor
  share, perhaps with its square: p_m = p_m0 (1 − s)² e^(dt). The reason to
  take it seriously is the Safe School Initiative (US Secret Service and US
  Department of Education, 2002): before most of the 37 incidents it
  studied, other people knew of the attacker's idea or plan. Checked by
  brute-force integration at the defaults, the squared form raises R\* from
  0.30 to 0.52, because the malice left standing after the transition falls
  from 1% to 0.01% of p_m0. It barely moves the count where the gap is
  negative (0.31 to 0.33 at d = −0.06%), because most malice is spent early,
  while s is near zero and the two forms agree. So it would make the moral
  threshold easier to clear while barely moving d₁.

---

## A.11 Reproduction

The page's model is implemented in
`academy/web/src/components/playground/long-filter-model.ts`, used by
`academy/web/src/components/playground/LongFilter.tsx`, with the constants and
presets in `academy/web/src/content/playground/long-filter.ts`. The following
mirrors the model step for step and reproduces its numbers:

```python
from math import log, exp, expm1, inf

s0, Ndot, px = 1e-9, 0.01, 1e-8      # s0: Seneca's phoenix rate, a floor for progressors
EDGE, TAU_F = 12, 0.99               # logistic margin in 1/g; tau = 99% of the ceiling

def share(t, g, sm):                 # ds/dt = g s (1 - s/sm), s(0) = s0
    return sm if -g * t < -700 else sm / (1 + (sm / s0 - 1) * exp(-g * t))

def t_frac(f, g, sm):
    return (log(sm / s0 - 1) + log(f / (1 - f))) / g

def E1x(c):                          # e^c E1(c)
    if c < 1:
        s, term = 0.0, 1.0
        for k in range(1, 40):
            term *= -c / k; s += term / k
        return exp(c) * (-0.5772156649015329 - log(c) - s)
    b, cc, dd = c + 1, 1e300, 1 / (c + 1); h = dd
    for i in range(1, 200):
        a = -i * i; b += 2
        dd = 1 / (a * dd + b); cc = b + a / cc
        h *= cc * dd
        if abs(cc * dd - 1) < 1e-14: break
    return h

def Einx(c):                         # e^-c Ein(c)
    if c < 40:
        s, term = 0.0, 1.0
        for k in range(1, 200):
            term *= c / k; s += term / k
            if term / k < s * 1e-16: break
        return exp(-c) * s
    r = 1 / c
    return r * (1 + r + 2 * r**2 + 6 * r**3 + 24 * r**4)

def tail(c, d):                      # further lifetime once s = s_max
    if c <= 0: return 1 / px
    if d == 0: return 1 / (c + px)
    if d < 0: return exp(-c / -d) / px + Einx(c / -d) / -d
    j = E1x(c / d) / d
    return j / (1 + px * j)

def N(pm0, pe0, g, d, sm=0.99, phi=0.7):
    """Ndot x expected lifetime past the transition; hazards never switch off:
    p_m = pm0 (1-s) e^(dt),  p_e = pe0 [phi (1-s) + 1 - phi] e^(dt),  + px."""
    tau = t_frac(TAU_F, g, sm)
    mid = log(sm / s0 - 1) / g
    t1, t_end = max(0.0, mid - EDGE / g), mid + EDGE / g
    H = (pm0 + pe0) * (t1 if abs(d * t1) < 1e-9 else expm1(d * t1) / d) + px * t1
    if H >= 745: return 0.0
    steps = min(6000, max(200, int(-(-(t_end - t1) * max(g, abs(d)) // 0.05))))
    grid = [t1 + i * (t_end - t1) / steps for i in range(steps + 1)]
    grid = sorted(set(grid + [tau]))
    h = lambda t: (pm0 * (1 - share(t, g, sm))
                   + pe0 * (phi * (1 - share(t, g, sm)) + 1 - phi)) * exp(d * t) + px
    post, prev = 0.0, h(grid[0])
    for a, b in zip(grid, grid[1:]):
        cur = h(b); dH = 0.5 * (prev + cur) * (b - a)
        if a >= tau:
            post += exp(-H) * (b - a) * (-expm1(-dH) / dH if dH > 1e-12 else 1)
        H += dH; prev = cur
        if H >= 745: return 0.0
    c = (pm0 * (1 - sm) + pe0 * (phi * (1 - sm) + 1 - phi)) * exp(d * grid[-1])
    return Ndot * (post + exp(-H) * tail(c, d))

def bisect(f, lo, hi, geometric=False):
    for _ in range(60):
        m = (lo * hi) ** 0.5 if geometric else (lo + hi) / 2
        lo, hi = (m, hi) if f(m) >= 1 else (lo, m)
    return lo

d1 = lambda pm0, pe0, g, sm=0.99, phi=0.7: bisect(lambda d: N(pm0, pe0, g, d, sm, phi), -0.05, 0.02)
R_star = lambda g, sm=0.99: bisect(lambda R: N(R * g, 0, g, 0, sm, 1), 1e-4, 50, True)

print(N(0.003, 0.007, 0.006, 0))         # realistic, d = 0          8.8e-16
print(N(0.003, 0.007, 0.006, -0.0006))   # realistic, d = -0.06%     0.307
print(d1(0.003, 0.007, 0.006))           # competence threshold     -0.000666
print(R_star(0.006))                     # moral threshold           0.304
print(t_frac(TAU_F, 0.006, 0.99))        # transition length         4,218 yr
```

The plate in section A.2 draws 1,000 marks from a fixed linear congruential
seed so that the field is stable across redraws; only the number lit changes.
The phase diagram in A.7 evaluates N on a grid of (R, d), log-spaced in R
from 0.01 to 10 and linear in d from −0.5% to +0.3%, and colours cells by
whether N ≥ 1.
