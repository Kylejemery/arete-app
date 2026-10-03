# The Math of the Long Filter: A Walkthrough

## How to read this guide

The whole Long Filter model answers one question: how many civilizations should be alive in the galaxy at any moment, given that each one carries some yearly chance of destroying itself? Everything below is a step toward that number.

You need three tools, and each is explained when it first appears:

- The exponential function, e to some power, written e^x. It describes anything that grows or shrinks by a fixed percentage per unit of time.
- The natural logarithm, ln, which undoes e. If e^x = y, then ln(y) = x.
- The integral, which here always means "add up a quantity over time." You never need to compute one by hand. You only need to know what it is adding.

The guide moves in seven steps. Steps 1 and 2 show why survival depends on whether risk is shrinking, not on how big it is. Step 3 models how moral progressors spread. Step 4 builds the risk from three sources. Steps 5 and 6 turn risk into a lifetime and then into a count of survivors. Step 7 asks what the model is really testing. A full worked example follows.

The numbers in this guide are teaching values chosen to make the arithmetic visible. They are not the presets on the Long Filter page. The structure is the same as the page's model; the outputs will differ.

## Step 1: A constant risk always wins

If a civilization faces the same chance of self destruction every year, it will eventually die, no matter how small that chance is. This is the mathematical form of "time evens all playing fields."

Call the yearly chance of catastrophe p. Economists and actuaries call this a hazard rate. If p = 0.001, there is a 1 in 1,000 chance of catastrophe in any given year.

The chance of surviving one year is 1 minus p. To survive two years you must survive the first and then the second, so you multiply: (1 minus p) times (1 minus p). After t years:

```latex
S(t) = (1 - p)^t \approx e^{-pt}
```

S(t) is the survival probability, the chance of still being alive at year t. The approximation with e is extremely close whenever p is small, and it is easier to work with, so the model uses it everywhere.

Here is what that formula does with p = 0.001:

| Years elapsed | Exponent p × t | Chance of still being alive |
| --- | --- | --- |
| 100 | 0.1 | 90% |
| 1,000 | 1 | 37% |
| 10,000 | 10 | 0.005% |
| 1,000,000 | 1,000 | about 1 in 10^434 |

Now try a far safer civilization, p = 1 in a million per year. Over a billion years the exponent is 1,000, and survival is again about 1 in 10^434. Making the risk a thousand times smaller only delays the end. It does not prevent it.

One more useful fact. With a constant hazard, the average lifetime is simply 1 divided by p. A 1 in 1,000 risk gives an average life of 1,000 years. Hold onto this, because Step 6 uses it to count civilizations.

The takeaway: over deep time, the size of a constant risk barely matters. Survival requires a risk that changes.

## Step 2: A shrinking risk can be survived forever

A risk that keeps shrinking by a steady percentage adds up to a finite total, so a civilization facing it keeps a fixed chance of surviving forever. This is the escape route the whole argument depends on.

First, generalize Step 1. When the hazard changes over time, write it as h(t), the risk in year t. Survival becomes:

```latex
S(t) = e^{-H(t)}, \qquad H(t) = \int_0^t h(u)\,du
```

H(t) is the cumulative hazard: the total risk you have been exposed to, added up year by year from the start until year t. That is all the integral means here. In Step 1 the hazard was the constant p, so the total after t years was just p × t, which is why we got e^(minus pt).

Now let the hazard shrink by a fixed percentage each year:

```latex
h(t) = p_0\, e^{d t}, \qquad d < 0
```

p₀ is the starting risk. d is the yearly rate of change. A negative d means shrinking; d = minus 0.001 means the risk falls by about 0.1% each year, halving roughly every 693 years (the halving time is ln 2 divided by the size of d, and ln 2 is about 0.693).

Add up this shrinking risk over all future time and you get a finite number:

```latex
H(\infty) = \int_0^\infty p_0\, e^{d t}\, dt = \frac{p_0}{|d|}
```

So survival never falls below a floor:

```latex
S_{\text{floor}} = e^{-p_0 / |d|}
```

With p₀ = 0.001, compare different shrink rates:

| Yearly change d | Total exposure p₀ / abs(d) | Chance of surviving forever |
| --- | --- | --- |
| minus 0.01 (1% a year) | 0.1 | 90% |
| minus 0.001 (0.1% a year) | 1 | 37% |
| minus 0.0001 (0.01% a year) | 10 | 0.005% |
| 0 (no shrinking) | infinite | 0% |

Two lessons come out of this table. First, survival depends on the direction of the risk, not its size: any negative d gives a floor above zero, while d = 0 gives certain death. Second, the floor is extremely sensitive to how fast the risk shrinks. Going from 0.1% a year to 0.01% a year cuts the survival chance from 37% to 0.005%.

This is the precise meaning of the line: "A hazard you keep shrinking can't eventually catch you; only one you leave standing can."

## Step 3: How progressors spread

The share of moral progressors (prokoptontes) grows along an S shaped curve: almost invisible for most of the transition, then a fast rise, then a level ceiling. That shape is why virtue's protection arrives late.

Let s(t) be the fraction of the population who are progressors at year t. It runs from 0 (nobody) to 1 (everybody). The model says it changes according to the logistic equation:

```latex
\frac{ds}{dt} = g\, s \left(1 - \frac{s}{s_{\max}}\right)
```

Read it piece by piece. The left side, ds/dt, is how fast the share is changing this year. On the right:

- g is the growth rate. With g = 0.01, the progressor share grows by about 1% of itself each year while it is small. Think of it as how readily one person's practice draws in another.
- The factor s means growth is proportional to how many progressors already exist. Few progressors means few people to teach, model, or persuade others.
- The factor (1 minus s / s_max) is a brake. When s is tiny, this is almost exactly 1 and does nothing. As s approaches s_max, it approaches 0 and growth stops.
- s_max is the ceiling, the largest share the culture will ever reach. The model's default is 0.99, meaning 1% of people never take up the practice. On the Long Filter page, g and s_max are set by culture, which is the point of the "Why people say no" section.

This equation has an exact solution:

```latex
s(t) = \frac{s_{\max}}{1 + \dfrac{s_{\max} - s_0}{s_0}\, e^{-g t}}
```

Here s₀ is the starting share. The model uses Seneca's estimate of a sage appearing perhaps once in five hundred years as a conservative floor: s₀ = 10^(minus 9), one in a billion.

The most useful number to pull out of this is the time to reach half the ceiling:

```latex
t_{1/2} = \frac{1}{g} \ln\!\left(\frac{s_{\max} - s_0}{s_0}\right)
```

With g = 0.01 and s₀ = one in a billion, that is 100 × ln(990,000,000), or about 2,070 years. The logarithm is what makes the small starting share so costly: each factor of ten in s₀ adds about 230 years at this growth rate.

<!-- CHART: progressor-s-curve -->

Look at the shape. After 1,000 years the share is still about 0.002%, or two people in a hundred thousand. Half the climb happens in the last few centuries before the midpoint. Steps 4 and 5 show what that means for risk: the civilization spends most of the transition exposed at nearly full strength.

## Step 4: The three hazards and the gap d

The total yearly risk is the sum of three parts: malice, error, and external events. Virtue shrinks the first two only partly; the gap d decides whether what remains keeps shrinking.

```latex
h(t) = p_m(t) + p_e(t) + p_x
```

### Malice

```latex
p_m(t) = p_{m0}\,\bigl(1 - s(t)\bigr)\, e^{d t}
```

Malice is deliberate harm: someone choosing to use civilization ending power. p_m0 is its starting yearly rate. The factor (1 minus s) says only non progressors contribute. If 40% of people are progressors, malice is 60% of what it was.

### Error

```latex
p_e(t) = p_{e0}\,\bigl[\varphi\,(1 - s(t)) + (1 - \varphi)\bigr]\, e^{d t}
```

Error is catastrophe nobody intended: a false alarm, an accident, a system that fails. The Greek letter φ (phi) splits it in two.

- The share φ is error that comes from conflict: arms races, haste, secrecy, hair trigger postures. It shrinks as progressors spread, just like malice, so it gets the (1 minus s) factor.
- The share (1 minus φ) is error that would happen even in a world of perfect goodwill: honest mistakes and hard engineering. Virtue does not touch it. It stays at full strength forever.

The default φ = 0.7 says 70% of catastrophic error is conflict driven.

### External

p_x is risk from outside: asteroids, nearby supernovae, and the like. It is constant and unaffected by anyone's character. It is tiny, but Step 1 tells you a constant risk eventually wins, so it caps how long anything can last.

### The gap d

Both malice and error carry the factor e^(dt). This is the term the argument now turns on. Think of d as:

- the rate at which destructive capability grows,
- minus the rate at which competence grows (understanding, safeguards, the habit of not building what you cannot yet control).

If d is positive, capability is outrunning understanding and both hazards inflate over time. If d is negative, understanding is pulling ahead and both hazards deflate. Step 2 already showed what each case means.

### Why the gap matters more than the virtue

Suppose the transition finishes with s at its ceiling of 0.99, and suppose d = 0. Using p_m0 = p_e0 = 0.001 and φ = 0.7, the leftover risk is:

| Source | Calculation | Leftover yearly risk |
| --- | --- | --- |
| Malice | 0.001 × 0.01 | 0.00001 |
| Error | 0.001 × (0.7 × 0.01 + 0.3) | 0.000307 |
| Total | | about 1 in 3,150 |

Two things stand out. First, malice is the easy term: near universal practice nearly removes it. About 97% of what remains is the conflict independent error. Second, that leftover risk is constant, and Step 1 says a constant risk is a death sentence. A civilization of progressors with d = 0 still lasts only a few thousand years after its transition. Virtue alone does not get you through. What gets you through is virtue that keeps d negative, which is the essay's claim that virtue makes caution affordable.

## Step 5: From risk to survival and lifetime

Once you have the total hazard h(t), two formulas turn it into everything else: the survival curve, and the expected lifetime, which is the area under that curve.

The survival curve is the Step 2 formula, now applied to the full three part hazard:

```latex
S(t) = \exp\!\left(-\int_0^t \bigl[p_m(u) + p_e(u) + p_x\bigr]\, du\right)
```

(exp(x) is just another way of writing e^x.)

The expected lifetime is:

```latex
L = \int_0^\infty S(t)\, dt
```

Why is the average lifetime the area under the survival curve? Picture a thousand identical civilizations starting together. In each year, S(t) tells you what fraction are still alive. Adding up "fraction alive" over every year gives the average number of years each one lived. Check it against Step 1: with a constant hazard p, the area under e^(minus pt) is exactly 1/p, the lifetime you already met.

The model cannot solve these integrals with a neat formula, because s(t), e^(dt), and the constant p_x are all tangled together. So the computer does what the integral sign literally describes: it slices time into thin strips, computes the hazard in each, and adds them up. Nothing more mysterious is going on. This is what the appendix means by numerically integrating survival.

### A shortcut that shows the race: s₀^(p/g)

An earlier version of the appendix had a closed form result, f = s₀^(p/g). It is worth understanding because it shows the core race in one line, and it falls out of the current model as a special case.

Take the simplest setup: no ceiling (s_max = 1), all error is conflict driven (φ = 1), no gap (d = 0), and a combined malice plus error rate p. Then the hazard is p × (1 minus s). Because s stays near zero for almost the whole climb (Step 3), the civilization faces nearly the full hazard p until about the midpoint, t½ ≈ ln(1/s₀)/g, and very little after. So the total exposure is roughly p × t½:

```latex
H \approx p \cdot \frac{\ln(1/s_0)}{g} \quad\Longrightarrow\quad S \approx e^{-\frac{p}{g}\ln(1/s_0)} = s_0^{\,p/g}
```

The last step uses a rule of logarithms: e raised to (k × ln x) equals x raised to the power k.

With p = 0.002 and g = 0.01, p/g = 0.2, and s₀^0.2 = (10^(minus 9))^0.2 = 10^(minus 1.8), about 1.6%. A full numerical run of the model with those settings gives 1.58%. The shortcut works.

What it teaches: the outcome depends on the ratio p/g, how fast risk kills compared with how fast virtue spreads. Halve the risk or double the growth and you get the same improvement.

Why the model moved past it: the shortcut assumes the hazard disappears once everyone is a progressor. Step 4 showed that with a ceiling below 1 and some error that virtue cannot touch, the hazard never disappears. So the current model tracks survival through the transition and after it, and lets d decide the long run.

## Step 6: Counting survivors in the galaxy

The number of civilizations alive at any moment equals how often new ones appear times how long each one lasts on average.

```latex
N = \dot{N} \times L
```

Ṅ (read "N dot") is the birth rate: how many new technological civilizations appear in the galaxy per year. L is the expected lifetime from Step 5. N is the count you would find if you surveyed the galaxy today.

The intuition is a bathtub. Water flows in at a steady rate, and each drop stays for a while before draining. Once things settle, the amount in the tub is the inflow rate times the average stay. Queueing theorists call this Little's law. If one customer enters a café per minute and each stays 30 minutes, there are about 30 customers inside.

Ṅ is unknown. This guide uses a teaching value of one new civilization per million years, Ṅ = 10^(minus 6). Notice that N scales directly with Ṅ, so if you think civilizations are ten times rarer, divide every count by ten. The shape of the result does not change.

When p_x is very small, a helpful approximation for survivors is that L is roughly the survival floor from the transition divided by p_x. A civilization that clears its own hazards then lives until the universe gets it, about 1/p_x years. That is why p_x, the smallest term in the model, ends up setting the scale of the count.

What the count means for the Fermi question:

- N well below 1: the galaxy is usually empty. The silence is absence.
- N well above 1: there should be others. If we still hear nothing, the silence needs another explanation, which is where the essay's restraint argument (contact as a vice, eulabeia) comes in.

The model's job is to say which side of 1 we land on and what decides it. The next step answers that.

## Step 7: Thresholds, and what the model is really asking

The model's answer comes down to one number: how negative d must be for the galaxy to hold at least one survivor. That number is the competence threshold, written d₁.

Holding every other setting fixed at this guide's teaching values (listed in the worked example below), here is the count N for different values of d:

| Yearly change d | Count N in the galaxy | Reading |
| --- | --- | --- |
| 0 | 0.0005 | Empty |
| minus 0.001% | 0.0005 | Empty |
| minus 0.003% | 0.009 | Empty |
| minus 0.005% | 0.6 | Near the edge |
| minus 0.01% | 18 | A few survivors |
| minus 0.02% | 120 | Dozens |
| minus 0.06% | 800 | Hundreds |
| minus 0.2% | 3,700 | Thousands |

The count crosses 1 at about d = minus 0.0054% a year. That is d₁ for these teaching values.

Notice the cliff. Between minus 0.003% and minus 0.01% the count jumps by a factor of about 2,000. The reason is the floor formula from Step 2. After the transition the leftover risk r, about 0.0003 a year, shrinks at rate d, so the total remaining exposure is about r divided by the size of d, and the survival floor is e raised to minus that. When d is near zero, r divided by d is enormous and the floor collapses; once d is large enough that r divided by d falls to single digits, the floor jumps up. A small change in the input produces an enormous change in the output, which is why the threshold is so sharp.

The Long Filter page computes d₁ at its own presets. The value here is different because the teaching inputs are different. The meaning is the same: d₁ tells you how much faster competence must grow than destructive capability, sustained across the transition and after it.

The appendix also defines a moral threshold, R*. It plays the same role on the virtue side that d₁ plays on the competence side: a line the inputs must cross for the count to clear one. See the appendix for its exact definition.

This turns the Long Filter into a conditional claim. It does not say survivors exist. It says: if competence can outpace capability by about d₁ a year for the length of the transition and keep doing so afterward, the galaxy should hold survivors. Whether real civilizations can do that is the open empirical question. The near miss proxy on the page (near misses per unit of destructive capacity in the nuclear era) is a first crude attempt to measure it.

## Worked example, start to finish

One civilization, two futures: with d = 0 the galaxy holds about 0.0005 survivors, and with d = minus 0.06% a year it holds about 800. Everything else is identical.

### The inputs

| Symbol | Meaning | Teaching value |
| --- | --- | --- |
| s₀ | Starting progressor share | 10^(minus 9) |
| g | Growth rate of progressors | 0.01 per year |
| s_max | Ceiling on progressor share | 0.99 |
| p_m0 | Starting malice risk | 0.001 per year |
| p_e0 | Starting error risk | 0.001 per year |
| φ | Share of error driven by conflict | 0.7 |
| p_x | External risk | 10^(minus 10) per year |
| Ṅ | New civilizations per year in the galaxy | 10^(minus 6) |
| d | Capability growth minus competence growth | 0, then minus 0.0006 |

### 1. When does virtue arrive?

From Step 3, the midpoint of the transition is 100 × ln(990,000,000), about 2,070 years. By year 2,500 the share is 97.7%, and by year 3,000 it has reached the 0.99 ceiling.

### 2. How dangerous is the start?

At year 0, s is one in a billion, so the hazard is essentially 0.001 + 0.001 = 0.002, a 1 in 500 yearly risk. Under that risk alone, a civilization has a 37% chance of lasting 500 years.

### 3. Surviving the transition

| | d = 0 | d = minus 0.06% a year |
| --- | --- | --- |
| Alive at year 2,070 (midpoint) | 1.8% | 9.7% |
| Alive at year 3,000 (transition done) | 1.2% | 8.8% |

Most of the loss happens before the midpoint, while progressors are still too few to matter. A negative d helps even here, because both hazards are deflating while virtue is still catching up.

### 4. After the transition, with d = 0

The leftover risk is constant at about 1 in 3,150 a year (Step 4). By Step 1, that is certain death. The survivors from year 3,000 last a few thousand more years on average. Across all runs the expected lifetime L is about 540 years, and N = 10^(minus 6) × 540 ≈ 0.0005. The galaxy is almost always empty.

### 5. After the transition, with d = minus 0.06% a year

Now the leftover risk keeps shrinking, so its future total is finite (Step 2). About 8% of civilizations clear their own hazards entirely. Those then face only p_x and last on the order of 1/p_x = 10 billion years. The expected lifetime works out to about 800 million years, and N = 10^(minus 6) × 800,000,000 ≈ 800. At the billion year mark, about 7% of all civilizations that ever started are still alive.

### Check yourself

Work these by hand, then compare with the answers in brackets.

1. A constant risk of 1 in 10,000 a year. What is the chance of lasting 100,000 years? (e^(minus 10), about 0.005%)
2. A risk that starts at 0.002 and shrinks at d = minus 0.002. What is the chance of surviving forever? (Total exposure 0.002 / 0.002 = 1, so e^(minus 1), about 37%)
3. Double the growth rate to g = 0.02. When is the midpoint of the transition? (About 1,036 years, half of 2,070)
4. Using the shortcut s₀^(p/g) with p = 0.001 and g = 0.01, what fraction survives the transition? (10^(minus 0.9), about 12.6%)
5. If you believe civilizations arise ten times less often than this guide assumes, what is N for d = minus 0.06%? (About 80)

## What the math shows, and what it does not

The math proves structural claims with confidence; it does not measure the inputs, and it does not by itself prove that virtue is the only route to a shrinking hazard.

What holds regardless of the numbers you plug in:

- A constant risk of any size ends every civilization over deep time (Step 1).
- Survival depends on whether risk is shrinking, not on how small it is (Step 2).
- Virtue's protection arrives late, because the S curve stays flat for most of the transition (Step 3).
- Malice is the easy term; leftover error and the gap d decide the long run (Step 4).
- The outcome flips sharply at a threshold, so small differences in d separate an empty galaxy from a crowded one (Step 7).

What the math cannot settle:

- The input values. Ṅ, p_m0, p_e0, g, and especially d are unknown, some by many orders of magnitude. The model organizes that ignorance; it does not remove it.
- Whether any real civilization can sustain a negative d. That is the empirical question the near miss proxy starts to address.
- Why d should depend on virtue at all. In the equations, d is just a parameter. The claim that only a civilization that does not want to win can afford to keep capability behind understanding is a philosophical argument made in the essay (races force capability ahead; virtue makes caution affordable). It is the thesis, and it carries the weight the math cannot.

## Glossary of symbols

| Symbol | Name | Meaning | First appears |
| --- | --- | --- | --- |
| p | Hazard rate | Yearly chance of catastrophe | Step 1 |
| S(t) | Survival | Chance of still being alive at year t | Step 1 |
| h(t) | Hazard at time t | Yearly risk when it changes over time | Step 2 |
| H(t) | Cumulative hazard | Total risk added up from year 0 to year t | Step 2 |
| d | Gap | Capability growth minus competence growth; negative means risk shrinks | Step 2 |
| s(t) | Progressor share | Fraction of people practicing virtue at year t | Step 3 |
| s₀ | Starting share | Progressor share at year 0 | Step 3 |
| g | Growth rate | How fast progressors spread while rare | Step 3 |
| s_max | Ceiling | Largest share the culture will reach | Step 3 |
| t½ | Midpoint | Years to reach half the ceiling | Step 3 |
| p_m0 | Malice rate | Starting yearly risk from deliberate harm | Step 4 |
| p_e0 | Error rate | Starting yearly risk from accidents | Step 4 |
| φ | Conflict share | Fraction of error caused by conflict | Step 4 |
| p_x | External rate | Constant risk from outside, such as asteroids | Step 4 |
| L | Expected lifetime | Average years a civilization lasts | Step 5 |
| Ṅ | Birth rate | New civilizations per year in the galaxy | Step 6 |
| N | Count | Civilizations alive at any moment | Step 6 |
| d₁ | Competence threshold | Value of d where N reaches 1 | Step 7 |
