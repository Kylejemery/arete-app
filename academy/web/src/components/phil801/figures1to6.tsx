// PHIL 801 figures, sessions 1 to 6. Every claim here is taken from the
// session text it sits beside (academy/web/src/data/phil801_sessions_*.ts),
// with the same loci; nothing is added that the session does not say.

import type { ReactNode } from 'react';
import { Arrow, Box, Figure, Grid, TV, Tag, gold } from './kit';

export type FigureEntry = { part: string; render: () => ReactNode };

// ── session 1 ────────────────────────────────────────────────────────────────

const WITNESSES: [string, string, string, string][] = [
  ['c. 279 to 206 BC', 'Chrysippus', 'The author', 'Over a hundred logical books by the catalogue, DL 7.189 to 202; one papyrus, PHerc. 307; nothing else'],
  ['Uncertain, perhaps 1st c. BC', 'Diocles of Magnesia', 'Doxographer', 'The Epitome, lost; Diogenes follows it for 7.49 to 83 (DL 7.48)'],
  ['1st c. BC', 'Cicero', 'Academic, partisan; quotes to embarrass', 'Three views of the conditional, Acad. 2.143; the diviners, Fat. 12 to 15; the earliest witness by two centuries'],
  ['2nd c. AD', 'Apuleius (authorship questioned)', 'Latin handbook', 'The only wording of the first thema, De Int. 209.12 to 14; one premiss arguments, 200'],
  ['2nd c. AD', 'Galen', 'Trained outsider, hostile to Chrysippus', 'Antipater shortened analysis, PHP 2.3.18 to 19; Inst. Log. 6.5, 17 to 19; absent from the corpus'],
  ['Late 2nd c. AD', 'Sextus Empiricus', 'Pyrrhonist; needs an accurate target', 'Validity, PH 2.137; the four failures, PH 2.146 to 150; the five, M 8.223 to 227; the dialectical theorem, M 8.231'],
  ['c. 200 AD', 'Alexander of Aphrodisias', 'Peripatetic; makes Stoic rules look like Aristotle’s', 'Third thema, in An. Pr. 278.12 to 14; synthetic theorem, 284.10 to 17; second thema useless, 164.27 to 31'],
  ['3rd c. AD', 'Diogenes Laertius', 'Compiler; no wish to refute', 'DL 7.49 to 83, a summary of a summary; the five at 7.80 to 81, no themata'],
  ['3rd c. AD', 'Origen', 'Christian apologist; uses the form against Celsus', 'The theorem of two conditionals, Contra Celsum 7.15'],
  ['6th c. AD', 'Simplicius', 'Peripatetic commentator, reporting', 'A differently worded third thema, in De Caelo 237.2 to 4'],
];

function Fig1_1() {
  return (
    <Figure
      n="1.1"
      title="Ten witnesses in date order, with what each wanted"
      attested={['every locus as given in the row; Diogenes’ dependence on Diocles is his own statement, DL 7.48']}
      reconstructed={['dates are conventional modern estimates; the one line motives summarise this session’s reading of each witness, not anything the witness says of himself']}
    >
      <Grid
        head={['Date', 'Witness', 'Stance', 'What survives through them']}
        rows={WITNESSES.map(([d, w, s, c]) => [
          <span key="w" className="whitespace-nowrap font-mono text-[11px] text-academy-muted">{d}</span>,
          <span key="n" className="text-academy-text font-semibold">{w}</span>,
          s,
          c,
        ])}
        hot={[0]}
        caption="The fullest reports (Sextus, Galen, Alexander) are also the hostile ones."
      />
    </Figure>
  );
}

function Chip({ kind, name, sub }: { kind: 'a' | 'r'; name: string; sub?: string }) {
  return (
    <span
      className="inline-flex flex-col px-2.5 py-1.5"
      style={{
        border: `1px ${kind === 'a' ? 'solid' : 'dashed'} ${kind === 'a' ? gold(0.53) : gold(0.45)}`,
        background: kind === 'a' ? gold(0.06) : 'transparent',
        borderRadius: 2,
      }}
    >
      <span className="text-xs text-academy-text font-semibold leading-tight">{name}</span>
      {sub && <span className="text-[10px] text-academy-muted leading-tight mt-0.5">{sub}</span>}
    </span>
  );
}

type Route = { steps: { kind: 'a' | 'r'; name: string; sub?: string }[]; links: boolean[]; note: string };

const ROUTES: Route[] = [
  {
    steps: [
      { kind: 'a', name: 'Chrysippus’ books', sub: 'lost' },
      { kind: 'a', name: 'Diocles, Epitome', sub: 'lost' },
      { kind: 'a', name: 'Diogenes Laertius', sub: '7.49 to 83' },
    ],
    links: [false, false],
    note: 'Stated by Diogenes himself at 7.48. Whether the examples are Chrysippus’ or Diocles’ is not recoverable.',
  },
  {
    steps: [
      { kind: 'a', name: 'Chrysippus' },
      { kind: 'r', name: 'Later school handbooks', sub: 'unknown' },
      { kind: 'a', name: 'Sextus', sub: 'PH 2, M 8' },
    ],
    links: [true, true],
    note: 'Sextus reports the state of the art of his own handbooks, not Chrysippus; the route is inferred.',
  },
  {
    steps: [
      { kind: 'a', name: 'Chrysippus’ analyses', sub: 'through the themata' },
      { kind: 'a', name: 'Antipater', sub: 'shortened them' },
      { kind: 'r', name: 'The dialectical theorem?', sub: 'M 8.231' },
    ],
    links: [false, true],
    note: 'Galen, PHP 2.3.18 to 19, reports the shortening. That M 8.231 is that shortening is a conjecture.',
  },
  {
    steps: [
      { kind: 'a', name: 'The third thema' },
      { kind: 'r', name: 'Alexander’s lost De Caelo commentary, or a handbook' },
      { kind: 'a', name: 'Simplicius', sub: 'in De Caelo 237.2 to 4' },
    ],
    links: [true, true],
    note: 'Simplicius cites “the ancients”; his source is not named.',
  },
  {
    steps: [
      { kind: 'a', name: 'A Stoic school example' },
      { kind: 'a', name: 'Origen', sub: 'Contra Celsum 7.15' },
    ],
    links: [false],
    note: 'Origen attributes the example to the Stoics. The general schema in the edition rests on an emendation.',
  },
];

function Fig1_2() {
  return (
    <Figure
      n="1.2"
      title="Routes of transmission: stated and inferred"
      attested={['DL 7.48 (Diocles); Galen PHP 2.3.18 to 19 (Antipater); Simplicius in De Caelo 237.2 to 4; Origen Contra Celsum 7.15']}
      reconstructed={['dashed boxes and links are modern inferences: the handbooks behind Sextus; M 8.231 as Antipater’s shortening (this course, after Galen’s report); Simplicius’ source (session 7)']}
    >
      <div className="space-y-4">
        {ROUTES.map((r, i) => (
          <div key={i}>
            <div className="flex flex-wrap items-center gap-y-2">
              {r.steps.map((s, j) => (
                <span key={j} className="inline-flex items-center">
                  <Chip kind={s.kind} name={s.name} sub={s.sub} />
                  {j < r.links.length && <Arrow dashed={r.links[j]} />}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-academy-muted mt-1.5 leading-snug">{r.note}</p>
          </div>
        ))}
      </div>
    </Figure>
  );
}

// ── session 2 ────────────────────────────────────────────────────────────────

function Fig2_1() {
  const rows: ReactNode[][] = [
    ['Negation', '“not: it is day”, the particle before the whole', 'DL 7.69', 'M 8.89 to 90'],
    ['Hyper-negation', '“not: not: it is day”', 'DL 7.69 (the second negative is supplied by editors)', 'not in the passages read'],
    ['Denial', '“no one is walking”', 'DL 7.69', 'not in the passages read'],
    ['Privation', '“this man is unkind”', 'DL 7.69', 'not in the passages read'],
    ['Predicative', 'named in the list', 'DL 7.68 to 69', 'not in the passages read'],
    ['Definite', '“this one is walking”, with a pointing', 'DL 7.70', 'M 8.96 to 100; the fundamental case'],
    ['Middle, intermediate', '“a man is sitting”; Sextus adds “Socrates is walking”', 'DL 7.70', 'M 8.96 to 100, one class for a name and a common noun'],
    ['Indefinite', '“someone is walking”', 'DL 7.70', 'M 8.96 to 100; true when a definite instance is (8.98)'],
  ];
  return (
    <Figure
      n="2.1"
      title="Simple assertibles in Diogenes and in Sextus"
      attested={['DL 7.68 to 70 (Hicks 1925); Sextus M 8.89 to 90, 8.96 to 100 (paraphrased)']}
      reconstructed={['lining the two classifications up row by row is this course’s; so is the reading that DL 7.70 does not file a proper name and a common noun together, which should be checked against the Greek']}
    >
      <Grid head={['Kind', 'Example', 'Diogenes', 'Sextus']} rows={rows} hot={[6]} />
      <p className="text-xs text-academy-muted mt-3 leading-relaxed">
        Non-simple, DL 7.71 to 74: the conditional, the sub-conditional (“since”), the conjunction, the
        disjunction, the causal and the comparative. Diogenes and Sextus overlap here but are not one list,
        and DL 7.68 to 70 is Diocles’ epitome of several Stoic authorities.
      </p>
    </Figure>
  );
}

// ── session 3 ────────────────────────────────────────────────────────────────

function Fig3_1() {
  return (
    <Figure
      n="3.1"
      title="Philo’s conditional is a truth table; the connection criterion is not"
      attested={['Philo: Sextus PH 2.110, M 8.113 to 117; connection: DL 7.73, PH 2.111, with both examples']}
      reconstructed={['what “conflict” is: no text defines it; reading it as incompatibility given the natures of things is an interpretation (this session, reading ii)']}
    >
      <p className="text-xs text-academy-muted mb-2">Philo: false in one case only.</p>
      <Grid
        mono
        head={['first', 'second', 'if the first, the second']}
        rows={[
          [<TV key="a" v="T" />, <TV key="b" v="T" />, <TV key="c" v="T" />],
          [<TV key="a" v="T" />, <TV key="b" v="F" />, <TV key="c" v="F" />],
          [<TV key="a" v="F" />, <TV key="b" v="T" />, <TV key="c" v="T" />],
          [<TV key="a" v="F" />, <TV key="b" v="F" />, <TV key="c" v="T" />],
        ]}
        hot={[1]}
      />
      <p className="text-xs text-academy-muted mt-4 mb-2">
        Connection: two conditionals on the same row of values, by day while Dion walks. Philo calls both true.
      </p>
      <Grid
        head={['Conditional', 'Values', 'Philo', 'Connection']}
        rows={[
          ['If it is day, it is light', <span key="v" className="font-mono">T, T</span>, <TV key="p" v="T" />, <span key="c"><TV v="T" />: “not: it is light” conflicts with “it is day”</span>],
          ['If it is day, Dion is walking', <span key="v" className="font-mono">T, T</span>, <TV key="p" v="T" />, <span key="c"><TV v="F" />: “not: Dion is walking” does not conflict with “it is day”</span>],
        ]}
        hot={[1]}
        caption="Same values, different verdicts: the connection criterion reads a relation between the parts, not their values."
      />
    </Figure>
  );
}

function Fig3_2() {
  const rows: ReactNode[][] = [
    ['Now', 'day', 'conversing', <TV key="p" v="T" />],
    ['Later', 'day', 'not conversing', <TV key="p" v="F" />],
    ['Night', 'night', 'not conversing', <TV key="p" v="T" />],
  ];
  return (
    <Figure
      n="3.2"
      title="Diodorus: Philo’s test run over all times"
      attested={['Diodorus’ criterion and the example, Sextus PH 2.110 to 111, M 8.115 to 117']}
      reconstructed={['the three times are an illustration; “the Philonian conditional quantified over all times” is this course’s gloss']}
    >
      <p className="text-xs text-academy-muted mb-2">“If it is day, I am conversing”, checked at each time.</p>
      <Grid head={['Time', 'First', 'Second', 'Philo at that time']} rows={rows} hot={[1]} />
      <div className="mt-3 flex flex-wrap gap-3">
        <Box kind="a" label="Philo, now">True: it is day and I am conversing.</Box>
        <Box kind="a" label="Diodorus, now">
          False, even now: at a later time it begins with a truth and ends in a falsehood.
        </Box>
      </div>
    </Figure>
  );
}

function Fig3_3() {
  return (
    <Figure
      n="3.3"
      title="The Stoic disjunction against the modern inclusive one"
      attested={['exclusive: DL 7.72 (the connective announces that one disjunct is false); Gellius NA 16.8.13 (one true, the rest false)']}
      reconstructed={['the inclusive column is modern; whether Chrysippus also required that both could not be false is not settled by DL 7.72']}
    >
      <Grid
        head={['first', 'second', 'Stoic “either ... or”', 'Inclusive “or”']}
        rows={[
          [<TV key="a" v="T" />, <TV key="b" v="T" />, <TV key="c" v="F" />, <TV key="d" v="T" />],
          [<TV key="a" v="T" />, <TV key="b" v="F" />, <TV key="c" v="T" />, <TV key="d" v="T" />],
          [<TV key="a" v="F" />, <TV key="b" v="T" />, <TV key="c" v="T" />, <TV key="d" v="T" />],
          [
            <TV key="a" v="F" />,
            <TV key="b" v="F" />,
            <span key="c"><TV v="F" /> <span className="text-academy-muted">in Gellius; DL 7.72 does not say</span></span>,
            <TV key="d" v="F" />,
          ],
        ]}
        hot={[0]}
        caption="The first row is why the fourth indemonstrable is valid for the Stoics and invalid under the inclusive reading."
      />
    </Figure>
  );
}

function Fig3_4() {
  return (
    <Figure
      n="3.4"
      title="One relation doing two jobs"
      attested={['DL 7.73 and PH 2.111 (the conditional); PH 2.137, M 8.415 to 417 and DL 7.77 (validity); Sextus says the two are judged by the same criterion']}
      reconstructed={['Bobzien, CHHP 1999 pp. 121 to 125 and 1996 sec. 5: one primitive relation; the objection that this is circular or trivial is set out by this session']}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Box kind="a" label="A true conditional">
          The contradictory of the consequent conflicts with the antecedent. DL 7.73.
        </Box>
        <Box kind="a" label="A valid argument">
          The conditional from the conjoined premisses to the conclusion is sound, PH 2.137; the contradictory of the
          conclusion is incompatible with the premisses, DL 7.77.
        </Box>
      </div>
      <div className="flex justify-center my-2 text-academy-gold text-xs">▾ both rest on ▾</div>
      <Box kind="a" label="Conflict (μάχη)" className="text-center">
        The word is from combat, not logic. No surviving text defines it.
      </Box>
      <div className="grid gap-3 sm:grid-cols-2 mt-3">
        <Box kind="r" label="Bobzien">
          One primitive, a feature: it must be a relation a redundant premiss can spoil, so it is not classical
          incompatibility.
        </Box>
        <Box kind="r" label="The objector">
          Circular (validity rests on a conditional resting on conflict), or trivial (if conflict is classical, the
          Stoic refusals are unmotivated).
        </Box>
      </div>
    </Figure>
  );
}

// ── session 4 ────────────────────────────────────────────────────────────────

function Fig4_1() {
  const nest = (kind: 'a' | 'r', label: string, def: string, children: ReactNode) => (
    <div
      className="p-3 pt-2"
      style={{ border: `1px ${kind === 'a' ? 'solid' : 'dashed'} ${gold(0.5)}`, background: gold(0.04), borderRadius: 2 }}
    >
      <p className="text-academy-gold text-[10px] font-bold uppercase tracking-[0.15em]">{label}</p>
      <p className="text-[11px] text-academy-muted mb-2">{def}</p>
      {children}
    </div>
  );
  const ex = (text: string) => (
    <p className="text-xs text-academy-text mb-2 pl-2" style={{ borderLeft: `2px solid ${gold(0.5)}` }}>
      {text}
    </p>
  );
  return (
    <Figure
      n="4.1"
      title="Three definitions of the possible, nested"
      attested={[
        'Philo: Alexander in An. Pr. 184, Simplicius in Cat. 196.1',
        'Diodorus: Boethius in Int. 234 to 235, Cicero Fat. 13, 17, Epictetus 2.19.1',
        'Chrysippus: DL 7.75, Boethius 234 to 235, Plutarch Stoic. Rep. 1055d to f; the chaff hindered by water, Alexander in An. Pr. 185',
      ]}
      reconstructed={[
        'the nesting and the formalisation are Bobzien’s (1993, pp. 80 to 83, Scheme 2); Diodorean inside Chrysippean holds only on the assumption that nothing actually true is hindered',
      ]}
    >
      {nest(
        'a',
        'Philonian',
        'admits of truth by its own nature',
        <>
          {ex('Chaff at the bottom of the ocean burns: combustible by nature, hindered by the water.')}
          {nest(
            'a',
            'Chrysippean',
            'admits of truth, and nothing external prevents it at some time from now on',
            <>
              {ex('A jewel that could be broken, is not prevented, and never breaks.')}
              {nest('a', 'Diodorean', 'is or will be true', ex('“Diocles is alive”, while he lives (DL 7.75).'))}
            </>,
          )}
        </>,
      )}
    </Figure>
  );
}

function Fig4_2() {
  const k = <span className="text-academy-text">keeps</span>;
  const d = <Tag kind="a">denies</Tag>;
  return (
    <Figure
      n="4.2"
      title="The Master Argument: three propositions and three escapes"
      attested={['the three propositions and who kept which, Epictetus 2.19.1 to 5; Chrysippus’ counterexample, Alexander in An. Pr. 177.25 to 178.4']}
      reconstructed={['Prior, “Diodoran Modalities” 1955 and Past, Present and Future 1967 ch. 2, supplies the two premisses in the dashed box; Bobzien’s own reconstruction is in CHHP pp. 86 to 92, which the course does not hold']}
    >
      <Grid
        head={['Proposition', 'Diodorus', 'Cleanthes, with Antipater', 'Chrysippus']}
        rows={[
          ['1. Every past truth is necessary', k, d, k],
          ['2. The impossible does not follow from the possible', k, k, d],
          ['3. Something is possible which neither is nor will be true', d, k, k],
        ]}
      />
      <p className="text-xs text-academy-muted mt-2">
        Chrysippus’ counterexample to 2: “if Dion is dead, this one is dead”; the consequent is destroyed, not
        falsified.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 mt-3">
        <Box kind="a" label="What Epictetus gives">
          Three propositions, their mutual conflict, and the verdicts. No steps. As stated, the three are consistent.
        </Box>
        <Box kind="r" label="Prior’s added premisses">
          (a) Whatever is the case has always been going to be the case. (b) What follows from the possible is
          possible. With these, Diodorus’ conclusion follows, at the price of a strong determinism.
        </Box>
      </div>
    </Figure>
  );
}

// ── session 5 ────────────────────────────────────────────────────────────────

function Fig5_1() {
  return (
    <Figure
      n="5.1"
      title="The four ways of failing, run against the criterion"
      attested={['the four failures and their examples, Sextus PH 2.146 to 150 and M 8.429 to 434 (“the dialecticians”); the criterion, PH 2.137']}
      reconstructed={['the right hand column is this session’s analysis; that S016 passes the criterion under every encoded reading is a Themata check, FINDINGS.md sec. 4 item 6, provisional']}
    >
      <Grid
        head={['Failure', 'Sextus’ example', 'Caught by the criterion?']}
        rows={[
          ['Disconnection', 'If it is day, it is light; wheat is sold in the market; therefore Dion is walking', 'Yes: false on any reading'],
          ['Redundancy', 'If it is day, it is light; but it is day, and Dion is walking too; therefore it is light', <span key="r" className="text-academy-text">No: true on Philo’s, Diodorus’ and Chrysippus’ readings</span>],
          ['Bad form', 'If it is day, it is light; it is not day; therefore it is not light', 'Yes: false when it is night and lit'],
          ['Deficiency', 'Wealth is either good or bad; it is not bad; therefore it is good', 'Strained: the fault is a disjunction that omits a third option'],
        ]}
        hot={[1]}
        caption="If the redundant argument is invalid, invalidity by redundancy is a second condition laid on top of the criterion."
      />
    </Figure>
  );
}

function Fig5_2() {
  const ok = <span className="text-academy-text">agrees</span>;
  const no = <Tag kind="r">conflicts</Tag>;
  return (
    <Figure
      n="5.2"
      title="Finding F1: three ledger items under two readings of parelkon"
      attested={['S016: Sextus PH 2.147, M 8.431; S009: Cicero Acad. 2.96; S011: Alexander in Top. 10.7 to 12, where adiaphorōs is Prantl’s emendation']}
      reconstructed={['the verdicts are the Themata ledger’s modern rulings; strict and narrow are the project’s parameters (Params.lean); all unreviewed by a specialist']}
    >
      <Grid
        head={['Item', 'Argument', 'Ledger verdict', 'Strict: any idle premiss', 'Narrow: indifferently concluding exempt']}
        rows={[
          ['S016', <span key="a" className="font-mono">if p, q; p; r ⊢ q</span>, 'invalid', <span key="s">redundant, {ok}</span>, <span key="n">redundant, {ok}</span>],
          ['S009', <span key="a" className="font-mono">if p, p; p ⊢ p</span>, 'valid, signed off', <span key="s">redundant, {no}</span>, <span key="n">not redundant, {ok}</span>],
          ['S011', <span key="a" className="font-mono">either p or q; p ⊢ p</span>, 'valid, not signed off', <span key="s">redundant, {no}</span>, <span key="n">exempt, {ok}</span>],
        ]}
        hot={[1, 2]}
        caption="The ledger is consistent only on the narrow reading. That is a constraint derived from the ledger, not a reading of the Greek."
      />
    </Figure>
  );
}

// ── session 6 ────────────────────────────────────────────────────────────────

function Fig6_1() {
  const ind = (l: string, c: string) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Tag kind="a">{l}</Tag>
      <span className="font-mono text-academy-text">{c}</span>
    </span>
  );
  const bad = (why: string) => <span className="text-academy-muted italic">{why}</span>;
  return (
    <Figure
      n="6.1"
      title="Five indemonstrables as the valid moves from one connective"
      attested={['the five and their modes, DL 7.80 to 81 and Sextus M 8.223 to 227; exclusive disjunction, Gellius 16.8.13 to 14; a single premiss is no argument for Chrysippus, M 8.443, Alexander in An. Pr. 17 to 18']}
      reconstructed={['that these are all the valid moves of this shape, so that the connectives fix the five, is this session’s reconstruction of the rationale; the sources give the list, not the reason']}
    >
      <Grid
        head={['Leading premiss', 'Co-assumption affirms the first', 'denies the first', 'affirms the second', 'denies the second']}
        rows={[
          ['if p, q', ind('A1', 'q'), bad('invalid: denying the antecedent'), bad('invalid: affirming the consequent'), ind('A2', 'not p')],
          ['not both p and q', ind('A3', 'not q'), bad('invalid (Cicero’s sixth, Top. 53 to 57)'), ind('A3', 'not p'), bad('invalid (Cicero’s seventh)')],
          ['either p or q', ind('A4', 'not q'), ind('A5', 'q'), ind('A4', 'not p'), ind('A5', 'p')],
          ['p and q', bad('no co-assumption is needed to reach a conjunct, and one premiss is no argument'), '', '', ''],
        ]}
        caption="A4 depends on exclusivity: under inclusive disjunction “either p or q; p; therefore not q” fails."
      />
    </Figure>
  );
}

function Fig6_2() {
  const rows: [string, string, string, string, string][] = [
    ['T', 'T', 'T', 'F', 'T'],
    ['T', 'T', 'F', 'F', 'F'],
    ['T', 'F', 'T', 'F', 'F'],
    ['T', 'F', 'F', 'T', 'T'],
    ['F', 'T', 'T', 'F', 'F'],
    ['F', 'T', 'F', 'T', 'T'],
    ['F', 'F', 'T', 'T', 'T'],
    ['F', 'F', 'F', 'F', 'F'],
  ];
  return (
    <Figure
      n="6.2"
      title="A three way disjunction is not two nested two way ones"
      attested={['exactly one disjunct true, Gellius NA 16.8.13 to 14; Chrysippus’ dog and the fifth with several disjuncts, Sextus PH 1.69']}
      reconstructed={['that the multi-disjunct fifth does not reduce to the two-disjunct form is the course fact sheet’s; Bobzien 1996 does not discuss PH 1.69']}
    >
      <Grid
        mono
        head={['p', 'q', 'r', 'either p or q or r (exactly one)', 'either p or (either q or r)']}
        rows={rows.map(r => r.map((v, i) => <TV key={i} v={v} />))}
        hot={[0]}
        caption="They part on one row: all three true. The inner disjunction is then false, so the outer has exactly one true disjunct."
      />
    </Figure>
  );
}

export const FIGURES_1_TO_6: Record<number, FigureEntry[]> = {
  1: [
    { part: 'The witnesses, by what they wanted', render: () => <Fig1_1 /> },
    { part: 'The witnesses, by what they wanted', render: () => <Fig1_2 /> },
  ],
  2: [{ part: 'The texts', render: () => <Fig2_1 /> }],
  3: [
    { part: 'Four criteria for one connective', render: () => <Fig3_1 /> },
    { part: 'Four criteria for one connective', render: () => <Fig3_2 /> },
    { part: 'The texts', render: () => <Fig3_3 /> },
    { part: 'One relation or two: validity through the conditional', render: () => <Fig3_4 /> },
  ],
  4: [
    { part: 'Three definitions, formalised', render: () => <Fig4_1 /> },
    { part: "The missing premisses: Prior's reconstruction against the ancient report", render: () => <Fig4_2 /> },
  ],
  5: [
    { part: 'The criterion and the four ways of failing', render: () => <Fig5_1 /> },
    { part: 'Finding F1: the ledger is consistent under one reading only', render: () => <Fig5_2 /> },
  ],
  6: [
    { part: 'Why five, and why these', render: () => <Fig6_1 /> },
    { part: 'Why five, and why these', render: () => <Fig6_2 /> },
  ],
};
