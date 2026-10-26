// PHIL 801 figures, sessions 7 to 12. As in figures1to6, every claim is
// taken from the session text beside it, with its loci. Derivations are the
// ones the session text works in full; quiz answers and the students' own
// deliverables (yourTask) are deliberately not drawn.

import type { ReactNode } from 'react';
import { BOBZIEN_RULES, DerivationTree, type DNode, type RuleKey } from './DerivationTree';
import { Box, Figure, Grid, Mark, TV, Tag, gold } from './kit';
import type { FigureEntry } from './figures1to6';

// ── session 7 ────────────────────────────────────────────────────────────────

function Fig7_1() {
  const yes = (t: string) => <Tag kind="a">{t}</Tag>;
  const no = <span className="text-academy-muted italic">lost</span>;
  return (
    <Figure
      n="7.1"
      title="What survives of each thema"
      attested={['Apuleius De Int. 209.12 to 14; Alexander in An. Pr. 164.27 to 31, 278.12 to 14, 284.10 to 17; Simplicius in De Caelo 237.2 to 4; DL 7.78; Galen Inst. Log. 6.5']}
      reconstructed={['none in this figure: it records only what the witnesses say, and where they say nothing']}
    >
      <Grid
        head={['Thema', 'Wording', 'Witness', 'Language, date', 'What else is said']}
        rows={[
          ['First', yes('once'), 'Apuleius, De Int. 209.12 to 14', 'Latin, 2nd c. AD', '“From two”: two premisses only; contrarium must mean the contradictory or the rule is unsound'],
          ['Second', no, 'Alexander, in An. Pr. 164.27 to 31', 'Greek, c. 200 AD', 'Named and called useless; grouped with the third and fourth under the synthetic theorem, 284.10 to 17'],
          ['Third', yes('twice, differently'), 'Alexander 278.12 to 14; Simplicius 237.2 to 4', 'Greek, c. 200 AD and 6th c.', 'Same opening clause, “from two a third”, then the two versions part (Figure 7.2)'],
          ['Fourth', no, 'Alexander 284.10 to 17 only', 'Greek, c. 200 AD', 'Nothing but the grouping'],
          ['The four together', '', 'DL 7.78; Galen Inst. Log. 6.5', 'Greek', 'Reduction is “by one or more of the themata”; Galen groups them'],
        ]}
        hot={[1, 3]}
      />
    </Figure>
  );
}

const SCHEMA_RULES: RuleKey = {
  given: { status: 'a', note: 'an argument taken as concluding, written schematically' },
  'T3 Simplicius': { status: 'a', note: 'in De Caelo 237.2 to 4: one external assumption joins the conclusion of the first argument' },
  'T3 Alexander': { status: 'a', note: 'in An. Pr. 278.12 to 14: externals, two or more, deduce one premiss of the argument that yields the conclusion' },
};

const SIMPLICIUS: DNode = {
  premisses: ['A1', 'A2', 'E'],
  conclusion: 'C',
  rule: 'T3 Simplicius',
  children: [
    { premisses: ['A1', 'A2'], conclusion: 'A3', rule: 'given' },
    { premisses: ['A3', 'E'], conclusion: 'C', rule: 'given' },
  ],
};

const ALEXANDER: DNode = {
  premisses: ['A2', 'E1', '…', 'En'],
  conclusion: 'C',
  rule: 'T3 Alexander',
  children: [
    { premisses: ['E1', '…', 'En'], conclusion: 'A1', rule: 'given' },
    { premisses: ['A1', 'A2'], conclusion: 'C', rule: 'given' },
  ],
};

function Fig7_2() {
  return (
    <Figure
      n="7.2"
      title="The third thema in its two versions"
      attested={['the two versions, Alexander in An. Pr. 278.12 to 14 and Simplicius in De Caelo 237.2 to 4, here in paraphrase after Bobzien’s translation (1996 p. 145, Greek at nn. 22 and 23); verify against Wallies and Heiberg before citing']}
      reconstructed={['the schematic letters and the tree layout are modern; Bobzien (1996 pp. 145 to 151) argues that Simplicius preserves the Stoic rule and Alexander adapted it to Aristotle’s synthesis']}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Box kind="a" label="Simplicius: the external joins the conclusion">
          <DerivationTree root={SIMPLICIUS} rules={SCHEMA_RULES} />
        </Box>
        <Box kind="a" label="Alexander: the externals deduce a premiss">
          <DerivationTree root={ALEXANDER} rules={SCHEMA_RULES} />
        </Box>
      </div>
      <p className="text-xs text-academy-muted mt-3 leading-relaxed">
        Simplicius’ rule always yields three premisses, and its output cannot be the first input again, since that
        must be “from two”. Bobzien adds an expanded version with several externals (T3+), or lets the lost second
        and fourth carry the load (p. 149, n. 32).
      </p>
    </Figure>
  );
}

// ── session 8 ────────────────────────────────────────────────────────────────

function Fig8_1() {
  const ns = <span className="text-academy-muted italic">not stated here</span>;
  const none = <span className="text-academy-muted">none</span>;
  const lab = (s: string) => <span className="font-mono text-[11px]">{s}</span>;
  return (
    <Figure
      n="8.1"
      title="Reconstructions of the themata, rule by rule"
      attested={['only two rules have wording: the first (Apuleius 209.12 to 14) and the third (Alexander 278.12 to 14; Simplicius 237.2 to 4); the second and fourth are lost']}
      reconstructed={[
        'every row: Mates 1953; Kneale 1962; Becker 1957, Mueller 1979, Mignucci 1993; Frede 1974; Bobzien 1996 sec. 3 p. 153; the Themata candidates (results/candidates.md, unreviewed)',
        '“not stated here” means this course does not report the point, not that the scholar is silent on it',
      ]}
    >
      <Grid
        head={[
          'Reconstruction',
          <Tag key="1" kind="a">T1 worded</Tag>,
          <Tag key="2" kind="r">T2 lost</Tag>,
          <Tag key="3" kind="a">T3 worded twice</Tag>,
          <Tag key="4" kind="r">T4 lost</Tag>,
          'Added rules',
          'Direction',
          'Conditional',
        ]}
        rows={[
          ['Mates 1953', 'contraposition of either premiss', 'not supplied; conjectured the dialectical theorem (M 8.231)', 'Alexander’s chaining', 'not supplied', 'none; the shortfall noted', 'forward, on schemata', 'truth-functional, Philo'],
          ['Kneale 1962', ns, ns, 'Alexander’s', ns, 'what completeness required', 'forward, natural deduction', ns],
          ['Becker, Mueller, Mignucci', 'first thema', ns, 'Alexander’s', ns, 'reflexivity, monotonicity, contraction, and-elimination, or-introduction', 'forward', 'classical consequence'],
          ['Frede 1974', 'Apuleius’ contraposition', 'contraction: delete a repeated premiss', 'Alexander’s chaining', 'a chaining rule for what the third leaves', none, 'forward', ns],
          ['Bobzien 1996', 'contraposition; T1+ for n premisses', 'chain, reusing a premiss', 'Simplicius’ one external; T3+ several', 'chain, reuse and externals', none, 'backward: analysis', 'Chrysippean, connection'],
          ['Themata: Attested', none, none, lab('cut[two,first]'), none, 'premiss view is a parameter', 'forward search', 'a parameter; never changes derivability'],
          ['Themata: Mates', lab('contrapose[either,two]'), none, lab('cut[two,any]'), none, 'premiss view is a parameter', 'forward search', 'as above'],
          ['Themata: Mates with the dialectical theorem', lab('contrapose[either,two]'), none, lab('cut[two,any]'), none, <span key="m">{lab('cut[any,any,merge]')}, the project’s reading of M 8.231</span>, 'forward search', 'as above'],
        ]}
        hot={[4]}
        caption="Themata fits, provisional: Attested fits nowhere (S020 needs the first thema); Mates fits under the set view only; Mates with the theorem under set and multiset. No Bobzien or Frede candidate has been run."
      />
    </Figure>
  );
}

const DILEMMA: DNode = {
  line: '7',
  premisses: ['if r, q', 'either p or r', 'if p, q'],
  conclusion: 'q',
  rule: 'T1+',
  children: [
    {
      line: '6',
      premisses: ['if r, q', 'not q', 'either p or r'],
      conclusion: 'not (if p, q)',
      rule: 'T4',
      children: [
        { line: '5', premisses: ['if r, q', 'not q'], conclusion: 'not r', rule: 'A2' },
        {
          line: '4',
          premisses: ['either p or r', 'not r', 'not q'],
          conclusion: 'not (if p, q)',
          rule: 'T3',
          children: [
            { line: '3', premisses: ['either p or r', 'not r'], conclusion: 'p', rule: 'A5' },
            {
              line: '2',
              premisses: ['p', 'not q'],
              conclusion: 'not (if p, q)',
              rule: 'T1',
              children: [{ line: '1', premisses: ['if p, q', 'p'], conclusion: 'q', rule: 'A1' }],
            },
          ],
        },
      ],
    },
  ],
};

const FOUR_A: DNode = {
  line: '5',
  premisses: ['if q, r', 'not r', 'if p, q', 'either p or s'],
  conclusion: 's',
  rule: 'T3+',
  marks: ['two externals'],
  children: [
    { line: '4', premisses: ['if q, r', 'not r'], conclusion: 'not q', rule: 'A2' },
    {
      line: '3',
      premisses: ['if p, q', 'not q', 'either p or s'],
      conclusion: 's',
      rule: 'T3',
      children: [
        { line: '1', premisses: ['if p, q', 'not q'], conclusion: 'not p', rule: 'A2' },
        { line: '2', premisses: ['not p', 'either p or s'], conclusion: 's', rule: 'A5' },
      ],
    },
  ],
};

const FOUR_B: DNode = {
  line: '7',
  premisses: ['if p, (if p, q)', 'p', 'if q, r', 'if r, s'],
  conclusion: 's',
  rule: 'T4',
  marks: ['p reused'],
  children: [
    { line: '1', premisses: ['if p, (if p, q)', 'p'], conclusion: 'if p, q', rule: 'A1' },
    {
      line: '6',
      premisses: ['if p, q', 'p', 'if q, r', 'if r, s'],
      conclusion: 's',
      rule: 'T3+',
      marks: ['two externals'],
      children: [
        { line: '2', premisses: ['if p, q', 'p'], conclusion: 'q', rule: 'A1' },
        {
          line: '5',
          premisses: ['if q, r', 'q', 'if r, s'],
          conclusion: 's',
          rule: 'T3',
          children: [
            { line: '3', premisses: ['if q, r', 'q'], conclusion: 'r', rule: 'A1' },
            { line: '4', premisses: ['if r, s', 'r'], conclusion: 's', rule: 'A1' },
          ],
        },
      ],
    },
  ],
};

const T_RECON = 'T1+, T2, T3+ and T4 as stated by Bobzien 1996 p. 153; the line numbers are this session’s';
const T_ATT = 'the indemonstrables, DL 7.80 to 81 and M 8.223 to 227; the first thema for two premisses, Apuleius De Int. 209.12 to 14; the third with one external, Simplicius in De Caelo 237.2 to 4';

function Fig8_2() {
  return (
    <Figure
      n="8.2"
      title="Exercise 1: the simple constructive dilemma"
      attested={[T_ATT]}
      reconstructed={[T_RECON, 'the dilemma’s reduction is Bobzien’s, 1996 pp. 154 to 155 and 169 to 170; the final permutation of premisses is not drawn']}
    >
      <DerivationTree root={DILEMMA} rules={BOBZIEN_RULES} label="Written forward, leaves at the top. The Stoic analysis reads it from the foot upward." />
      <p className="text-xs text-academy-muted mt-1 leading-relaxed">
        No two premisses of the dilemma form an indemonstrable, so the analysis can only open with T1+. At line 6 the
        remainder reuses “not q” and takes the external disjunction: that is T4, and nothing else does it.
      </p>
    </Figure>
  );
}

function Fig8_3() {
  return (
    <Figure
      n="8.3"
      title="Exercise 2: two four-premiss arguments"
      attested={[T_ATT]}
      reconstructed={[T_RECON, 'the session labels the two-external steps “T3”; drawn here as T3+, Bobzien’s expanded rule, since the basic rule allows one external']}
    >
      <DerivationTree root={FOUR_A} rules={BOBZIEN_RULES} label="If q, r; not r; if p, q; either p or s; therefore s." />
      <div className="my-4 border-t border-academy-border" />
      <DerivationTree root={FOUR_B} rules={BOBZIEN_RULES} label="If p, (if p, q); p; if q, r; if r, s; therefore s." />
      <p className="text-xs text-academy-muted mt-1 leading-relaxed">
        Without the two outer conditionals the second is S012, reduced by T2 from lines 1 and 2; Sextus does the same
        at M 8.232 with the dialectical theorem in place of T2.
      </p>
    </Figure>
  );
}

function Fig8_4() {
  return (
    <Figure
      n="8.4"
      title="Exercise 3: the row that no derivation can reach"
      attested={['the forms of the indemonstrables, DL 7.80 to 81; that such an argument is unmethodically concluding, on the evidence of Alexander in An. Pr. 345 and Galen Inst. Log. 17 to 18']}
      reconstructed={['irreducibility of the target, Bobzien 1996 p. 174; the invariant (“p and q” read as “p if and only if q”) is this session’s proof']}
    >
      <p className="text-xs text-academy-muted mb-2">
        Target: if not (p and q), r; not p; therefore r. Read the conditional as Philo’s, the disjunction as exclusive,
        and “p and q” as “p if and only if q”. Under that reading every indemonstrable holds and every thema preserves
        holding. Now take p, q and r all false.
      </p>
      <Grid
        head={['Assertible', 'Value']}
        rows={[
          [<span key="a" className="font-mono">p, q, r</span>, <span key="v"><TV v="F" />, <TV v="F" />, <TV v="F" /></span>],
          [<span key="a" className="font-mono">p and q, read as p iff q</span>, <TV key="v" v="T" />],
          [<span key="a" className="font-mono">not (p and q)</span>, <TV key="v" v="F" />],
          [<span key="a" className="font-mono">if not (p and q), r</span>, <span key="v"><TV v="T" /> <span className="text-academy-muted">premiss</span></span>],
          [<span key="a" className="font-mono">not p</span>, <span key="v"><TV v="T" /> <span className="text-academy-muted">premiss</span></span>],
          [<span key="a" className="font-mono">r</span>, <span key="v"><TV v="F" /> <span className="text-academy-muted">conclusion</span></span>],
        ]}
        hot={[5]}
        caption="Premisses true, conclusion false: so no rule set of the five and T1 to T4 derives it. Valid by the criterion, not a syllogism; the gap is and-elimination."
      />
    </Figure>
  );
}

// ── session 9 ────────────────────────────────────────────────────────────────

const AND_INTRO: DNode = {
  premisses: ['p', 'q'],
  conclusion: 'both p and q',
  rule: 'T1',
  marks: ['toggle'],
  children: [{ premisses: ['not both p and q', 'p'], conclusion: 'not q', rule: 'A3' }],
};

function Fig9_1() {
  const has = <Tag kind="r">has</Tag>;
  const lacks = <span className="text-academy-gold font-semibold">lacks</span>;
  return (
    <Figure
      n="9.1"
      title="Which connective rules the reconstructed system has"
      attested={['A1 to A5, DL 7.80 to 81; the first thema, Apuleius 209.12 to 14; one premiss arguments rejected by Chrysippus, M 8.443, Alexander in An. Pr. 17 to 18; the wholly hypothetical argument valid but not syllogistic, Alexander in An. Pr. 262.28 to 31']}
      reconstructed={['the inventory is Bobzien’s, 1996 sec. 5 pp. 181 to 188; “both p and q” as the contradictory of “not both p and q” assumes the toggle reading']}
    >
      <Grid
        head={['Rule', 'System', 'Ground']}
        rows={[
          ['and-introduction', has, 'T1 on the third indemonstrable, drawn below'],
          ['if-elimination', has, 'the first and second indemonstrables'],
          ['or-elimination', has, 'the fourth and fifth indemonstrables'],
          ['and-elimination', lacks, '“p and q; therefore p” has one premiss, so it is no argument'],
          ['if-introduction', lacks, 'no thema yields a conditional from premisses that lack one'],
          ['or-introduction', lacks, 'weakening of the conclusion, the relevance defect of redundancy'],
        ]}
        hot={[3, 4, 5]}
      />
      <DerivationTree root={AND_INTRO} rules={BOBZIEN_RULES} label="Keep p, add the contradictory of “not q”, conclude the contradictory of the leading premiss." />
    </Figure>
  );
}

function Fig9_2() {
  const inv = <Tag kind="r">inverted, do not cite</Tag>;
  return (
    <Figure
      n="9.2"
      title="Two structural rules, three accounts"
      attested={['redundancy invalidates, Sextus PH 2.146 to 150, M 8.429 to 434; the items behind contraction, S011 (Alexander in Top. 10.7 to 12) and S012 (Sextus M 8.229 to 233)']}
      reconstructed={['all three columns are modern: Bobzien 1996 sec. 5; the corpus Mode 2 summary in rules.yaml R03, an AI paraphrase that reverses her; the Themata laboratory, FINDINGS.md sec. 5, unreviewed']}
    >
      <Grid
        head={['Rule', 'Bobzien 1996, the paper', 'Corpus summary (R03)', 'Themata laboratory']}
        rows={[
          ['Monotonicity (weakening)', 'fails, because of redundancy', <span key="s">holds {inv}</span>, 'no fitting candidate has it; S016 underivable everywhere (Sugihara model)'],
          ['Contraction', 'holds partly, through T2’s reuse of a premiss', <span key="s">fails {inv}</span>, 'every fit needs it, from the set view or the merging cut'],
        ]}
        caption="On monotonicity the paper and the laboratory agree; the reported clash came from the summary. On contraction the open question is whether T2’s local reuse and the laboratory’s global set view are one mechanism."
      />
    </Figure>
  );
}

// ── session 10 ───────────────────────────────────────────────────────────────

function Fig10_1() {
  const yes = <span className="text-academy-text font-semibold">yes</span>;
  return (
    <Figure
      n="10.1"
      title="The parameter space, and which settings change a derivation"
      attested={['single premiss arguments, M 8.443, PH 2.167, Alexander in An. Pr. 17 to 18; the hyper-negation, DL 7.69; the conditional dispute, PH 2.110 to 112; redundancy, PH 2.146 to 150']}
      reconstructed={['the parameters and their values are the Themata project’s (Params.lean); the Chrysippean conditional is modelled after Mates as strict implication, a modern gloss; the premiss view has no ancient ground at all']}
    >
      <Grid
        head={['Parameter', 'Values', 'Changes what a candidate derives?', 'Where the question comes from']}
        rows={[
          ['Single-premiss policy', 'Chrysippus, Antipater', yes, 'M 8.443; PH 2.167'],
          ['Contradictory', 'toggle, negate', yes, 'DL 7.69'],
          ['Premiss view', 'list, multiset, set', yes, 'nothing in the corpus'],
          ['Conditional reading', 'Philonian, Diodorean, Chrysippean, containment', 'no: only what the validity criterion calls conclusive', 'PH 2.110 to 112'],
          ['Redundancy', 'strict, narrow', 'no: only the semantic table', 'finding F1'],
        ]}
        hot={[0, 1, 2]}
        caption="Two by two by three: twelve proof settings. The themata as encoded never look at truth conditions, which is why the conditional reading cannot change a derivation."
      />
    </Figure>
  );
}

const THEMATA_RULES: RuleKey = {
  A1: BOBZIEN_RULES.A1,
  'contrapose[either,two]': { status: 'r', note: 'the project’s encoding of the first thema, after Mates: keep either premiss of a two-premiss argument' },
  'cut[two,any]': { status: 'r', note: 'the project’s encoding of the third thema: replace an assertible anywhere in a two-premiss argument by the premisses that yield it' },
  'set view': { status: 'r', note: 'a parameter of the project: a repeated premiss counts once' },
};

const S020: DNode = {
  line: '6',
  premisses: ['if p, q', 'if p, not q'],
  conclusion: 'not p',
  rule: 'contrapose[either,two]',
  marks: ['toggle'],
  children: [
    {
      line: '5',
      premisses: ['if p, q', 'p'],
      conclusion: 'not (if p, not q)',
      rule: 'set view',
      marks: ['contraction'],
      children: [
        {
          line: '4',
          premisses: ['p', 'if p, q', 'p'],
          conclusion: 'not (if p, not q)',
          rule: 'cut[two,any]',
          children: [
            { line: '1', premisses: ['if p, q', 'p'], conclusion: 'q', rule: 'A1' },
            {
              line: '3',
              premisses: ['p', 'q'],
              conclusion: 'not (if p, not q)',
              rule: 'contrapose[either,two]',
              marks: ['toggle'],
              children: [{ line: '2', premisses: ['if p, not q', 'p'], conclusion: 'not q', rule: 'A1' }],
            },
          ],
        },
      ],
    },
  ],
};

function Fig10_2() {
  return (
    <Figure
      n="10.2"
      title="Exercise (a): S020 under the Mates candidate, set view"
      attested={['the form and the Stoic example, Origen Contra Celsum 7.15 (the general schema rests on an emendation; the example does not); the first indemonstrable, DL 7.80']}
      reconstructed={['every rule label except A1 is the Themata project’s encoding; the derivation is the harness’s shallowest one, not an ancient analysis']}
    >
      <DerivationTree root={S020} rules={THEMATA_RULES} label="Contraction enters at step 5 and only there. Under the list or multiset view step 4 keeps three premisses and the last contraposition cannot apply." />
    </Figure>
  );
}

function Fig10_3() {
  const v = (n: string) => <span className="font-mono text-academy-text">{n}</span>;
  return (
    <Figure
      n="10.3"
      title="Exercise (c): the Sugihara countermodel to S016"
      attested={['the redundant argument and its invalidity, Sextus PH 2.147 and M 8.431 (ledger S016)']}
      reconstructed={['the Sugihara matrix for the relevance logic RM, Sugihara.lean in the Themata project; a device for proving underivability, not a claim that the Stoics held RM']}
    >
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <Box kind="r" label="The matrix">
          Values are integers; designated when at least 0; negation is additive inverse. Implication: if a ≤ b, the
          larger of −a and b, otherwise the smaller. Fusion: if a + b ≤ 0, the smaller of a and b, otherwise the larger.
          An argument holds when its premisses fuse to at most its conclusion.
        </Box>
        <Box kind="r" label="The valuation">
          p = 0, q = 0, r = 1. Then “if p, q” is 0, since 0 ≤ 0 and the larger of 0 and 0 is 0.
        </Box>
      </div>
      <Grid
        head={['Argument', 'Premiss values', 'Fused', 'Conclusion q', 'Holds?']}
        rows={[
          ['S016: if p, q; p; r ⊢ q', v('0, 0, 1'), v('1'), v('0'), <span key="h" className="text-academy-gold font-semibold">no: 1 exceeds 0</span>],
          ['Control, A1: if p, q; p ⊢ q', v('0, 0'), v('0'), v('0'), 'yes: 0 ≤ 0'],
        ]}
        hot={[0]}
        caption="The idle premiss, valued 1, lifts the fusion above the conclusion. Classically the three premisses still entail q, so no classical countermodel could do this."
      />
    </Figure>
  );
}

// ── session 11 ───────────────────────────────────────────────────────────────

function Fig11_1() {
  const node = (kind: 'a' | 'r', label: string, body: ReactNode, children?: ReactNode) => (
    <div className="mt-2">
      <Box kind={kind} label={label}>
        {body}
      </Box>
      {children && (
        <div className="ml-4 pl-3" style={{ borderLeft: `1px solid ${gold(0.35)}` }}>
          {children}
        </div>
      )}
    </div>
  );
  return (
    <Figure
      n="11.1"
      title="Where the syllogistic ends"
      attested={[
        'DL 7.77 to 78 (conclusive, inconclusive; syllogistic; conclusive in the specific sense, with S008)',
        'subsyllogistic: Alexander in An. Pr. 84.12 to 19, 373.29 to 35, Galen Inst. Log. 19.6; unmethodical: Alexander 21.28 to 22.23 and 345.13 to 346.6, Galen 17 to 18; the Alexander numbers are Bobzien’s and unverified against Wallies, and Galen is absent from the corpus',
        'the indefinite conditional for a universal, Sextus M 11.8 to 11',
      ]}
      reconstructed={['placing the subsyllogistic and unmethodical arguments inside the class of DL 7.78, rather than as a later subdivision, is not established and is drawn dashed; the analysis of Barbara is this session’s, after Bobzien 1996 n. 115']}
    >
      {node(
        'a',
        'Conclusive arguments',
        'DL 7.77 to 78. The inconclusive ones (e.g. “if it is day, it is light; but it is day; therefore Dion walks”) are set aside.',
        <>
          {node('a', 'Syllogistic', 'An indemonstrable, or reduced to the indemonstrables by one or more themata.')}
          {node(
            'a',
            'Conclusive in the specific sense',
            '“It is false that it is both day and night; it is day; therefore it is not night.” Asserted falsity is not the negated conjunction the third indemonstrable needs.',
            <>
              {node('r', 'Subsyllogistic', '“It is light follows from its being day; it is day; therefore it is light.” A syllogism but for the wording of the leading premiss.')}
              {node('r', 'Unmethodically concluding', '“Dion says it is day; Dion speaks truly; therefore it is day.” Valid, nothing idle, no connective to reduce by.')}
            </>,
          )}
        </>,
      )}
      <div className="mt-4">
        <Box kind="r" label="Outside: Aristotle’s categorical syllogisms">
          Regimented as indefinite conditionals, Barbara reaches the instance (“this one is mortal”), never the universal.
          The universal would need if-introduction; the instance needs a step from indefinite to definite that no thema supplies.
        </Box>
      </div>
    </Figure>
  );
}

// ── session 12 ───────────────────────────────────────────────────────────────

function Fig12_1() {
  const claim = (n: string, text: string, verdict: ReactNode, why: string) => (
    <div className="flex gap-3 items-start py-2 border-b" style={{ borderColor: 'rgba(30,50,88,0.6)' }}>
      <span className="font-mono text-academy-gold text-xs w-6 flex-shrink-0 pt-0.5">{n}</span>
      <div className="flex-1">
        <p className="text-xs text-academy-text">{text}</p>
        <p className="text-[11px] text-academy-muted mt-1 leading-snug">{why}</p>
      </div>
      <span className="flex-shrink-0">{verdict}</span>
    </div>
  );
  return (
    <Figure
      n="12.1"
      title="Williamson’s inference from bivalence, and where Bobzien cuts it"
      attested={['bivalence, Cicero Fat. 20 to 21, 38; declaratives without a proposition, Sextus M 7.244 to 246, Alexander in An. Pr. 177.25 to 178.4, Cicero Acad. 2.95 to 97 (the Liar)']}
      reconstructed={['the inference is Williamson’s, Vagueness 1994 pp. 12 to 13; setting it out as four claims and the verdicts are Bobzien’s, 2002 sec. II']}
    >
      {claim('(i)', 'Every proposition, including those in sophisms, is true or false.', <Tag kind="a">granted</Tag>, 'Chrysippus held bivalence for propositions.')}
      {claim('(ii)', 'Whoever utters a declarative sentence asserts something.', <Tag kind="r">denied</Tag>, 'The Stoics admitted declaratives that are neither true nor false, M 7.244 to 246.')}
      {claim('(iii)', 'Every declarative sentence expresses a proposition.', <Tag kind="r">denied</Tag>, 'Athens and Megara; “this one is dead”; the Liar, on her preferred reading (n. 18).')}
      {claim('(iv)', 'For every question-sentence there is a proposition.', <Tag kind="r">denied</Tag>, 'Falls with (iii).')}
      <div className="mt-3">
        <Box kind="r" label="Williamson’s conclusion">
          Every step of a Sorites has a right answer; the respondent who falls silent is ignorant of it. Bobzien:
          bivalence for propositions does not reach a sentence unless the sentence expresses one.
        </Box>
      </div>
    </Figure>
  );
}

type Seg = { label: string; obscure?: boolean; grow: number };

function Strip({ segs, sharp }: { segs: Seg[]; sharp: boolean }) {
  return (
    <div className="flex w-full" role="img" aria-label={segs.map(s => s.label).join(', ')}>
      {segs.map((s, i) => (
        <div key={i} className="flex flex-col" style={{ flexGrow: s.grow, flexBasis: 0, minWidth: 0 }}>
          <div
            className="h-7"
            style={{
              background: s.obscure ? gold(0.08) : gold(s.label.startsWith('clear yes') ? 0.4 : s.label.startsWith('clear no') ? 0.15 : 0.25),
              border: s.obscure ? `1px dashed ${gold(0.6)}` : 'none',
              borderLeft: i > 0 && sharp ? `2px solid ${gold(1)}` : s.obscure ? `1px dashed ${gold(0.6)}` : 'none',
            }}
          />
          <span className="text-[10px] text-academy-muted leading-tight mt-1 pr-1">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function Fig12_2() {
  const models: { n: string; segs: Seg[]; sharp: boolean; verdict: string }[] = [
    { n: 'Model 1', sharp: true, segs: [{ label: 'clear yes', grow: 1 }, { label: 'clear no', grow: 1 }], verdict: 'Excluded: Acad. 2.94 speaks of obscure cases.' },
    { n: 'Model 2', sharp: false, segs: [{ label: 'clear yes', grow: 2 }, { label: 'obscure between yes and no', obscure: true, grow: 1.6 }, { label: 'clear no', grow: 2 }], verdict: 'Cicero’s “the obscure cases” favours model 4 or higher over this.' },
    { n: 'Model 3', sharp: true, segs: [{ label: 'clear yes', grow: 2 }, { label: 'clearly obscure', grow: 1.6 }, { label: 'clear no', grow: 2 }], verdict: 'Excluded if the first obscure case cannot be known, for then neither can the last clear one.' },
    {
      n: 'Model 4',
      sharp: false,
      segs: [
        { label: 'clear yes', grow: 2 },
        { label: 'obscure between yes and clearly obscure', obscure: true, grow: 1.4 },
        { label: 'clearly obscure', grow: 1.2 },
        { label: 'obscure between clearly obscure and no', obscure: true, grow: 1.4 },
        { label: 'clear no', grow: 2 },
      ],
      verdict: 'Favoured, on a supposition n. 54 calls unproven.',
    },
  ];
  return (
    <Figure
      n="12.2"
      title="Bobzien’s models of higher-order obscurity"
      attested={['stopping before the obscure cases, Cicero Acad. 2.93 to 94']}
      reconstructed={['the models are Bobzien’s, 2002 p. 231 (models 5 and 6 at n. 51); the argument for model 4 is hers, p. 233, and rests on the supposition of n. 54']}
    >
      <p className="text-xs text-academy-muted mb-3">
        A Sorites series runs left to right under one question. Solid lines are sharp, clearly placed boundaries; dashed
        areas are obscure as to which side they fall. Obscurity here is epistemic; the strips say nothing about truth values.
      </p>
      <div className="space-y-5">
        {models.map(m => (
          <div key={m.n}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="text-academy-gold text-[10px] font-bold uppercase tracking-[0.15em]">{m.n}</span>
              <Mark>{m.sharp ? 'sharp' : 'obscure margins'}</Mark>
            </div>
            <Strip segs={m.segs} sharp={m.sharp} />
            <p className="text-[11px] text-academy-text mt-1.5">{m.verdict}</p>
          </div>
        ))}
      </div>
    </Figure>
  );
}

export const FIGURES_7_TO_12: Record<number, FigureEntry[]> = {
  7: [
    { part: 'What a thema is and what survives', render: () => <Fig7_1 /> },
    { part: 'The Greek', render: () => <Fig7_2 /> },
  ],
  8: [
    { part: 'Three reconstructions', render: () => <Fig8_1 /> },
    { part: 'Three exercises worked', render: () => <Fig8_2 /> },
    { part: 'Three exercises worked', render: () => <Fig8_3 /> },
    { part: 'Three exercises worked', render: () => <Fig8_4 /> },
  ],
  9: [
    { part: 'The structural profile, rule by rule', render: () => <Fig9_1 /> },
    { part: 'Dispute: completeness and the rules the Stoics did not have', render: () => <Fig9_2 /> },
  ],
  10: [
    { part: 'The parameter space and the findings, with their caveats', render: () => <Fig10_1 /> },
    { part: 'The exercises, worked', render: () => <Fig10_2 /> },
    { part: 'The exercises, worked', render: () => <Fig10_3 /> },
  ],
  11: [{ part: 'Subsyllogistic, unmethodical, and Barbara in Stoic dress', render: () => <Fig11_1 /> }],
  12: [
    { part: "Williamson's case and Bobzien's replies", render: () => <Fig12_1 /> },
    { part: 'Higher-order obscurity: the four models and the exercise', render: () => <Fig12_2 /> },
  ],
};
