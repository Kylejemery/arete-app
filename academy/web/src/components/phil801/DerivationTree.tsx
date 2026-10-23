// A derivation tree for the PHIL 801 figures, drawn in the style of a modern
// proof tree: the arguments a step is built from stand above a rule line, the
// argument it yields stands below, and the root at the foot is the argument
// being reduced. Leaves are indemonstrables; inner nodes are themata (or, for
// the Themata laboratory, the project's encoded rules).
//
// Each rule label is tagged attested (its wording survives in a source) or
// reconstructed (supplied by a modern scholar or by the project), so the tree
// never presents a reconstructed rule as an ancient one. The figures write
// derivations forward, as the course text does; the Stoic analysis reads the
// same tree from the root upward.

import { Mark, Tag, gold, type Status } from './kit';

export type DNode = {
  /** Line number in the course text, when the text numbers its lines. */
  line?: string;
  premisses: string[];
  conclusion: string;
  rule: string;
  marks?: string[];
  children?: DNode[];
};

export type RuleKey = Record<string, { status: Status; note: string }>;

/** Rule statuses for derivations in Bobzien's T1 to T4 (1996, p. 153). */
export const BOBZIEN_RULES: RuleKey = {
  A1: { status: 'a', note: 'first indemonstrable, DL 7.80; M 8.224' },
  A2: { status: 'a', note: 'second indemonstrable, DL 7.80 to 81; M 8.223 to 227' },
  A3: { status: 'a', note: 'third indemonstrable, DL 7.80 to 81; M 8.223 to 227' },
  A4: { status: 'a', note: 'fourth indemonstrable, DL 7.81; M 8.223 to 227' },
  A5: { status: 'a', note: 'fifth indemonstrable, DL 7.81; M 8.223 to 227' },
  T1: { status: 'a', note: 'first thema for two premisses, worded in Apuleius, De Int. 209.12 to 14' },
  'T1+': { status: 'r', note: 'first thema for n premisses, Bobzien 1996 p. 153; the texts give only two' },
  T2: { status: 'r', note: 'second thema, lost; Bobzien 1996 p. 153' },
  T3: { status: 'a', note: 'third thema with one external, worded in Simplicius, in De Caelo 237.2 to 4; formal statement Bobzien 1996 p. 153' },
  'T3+': { status: 'r', note: 'third thema with several externals, Bobzien 1996 pp. 148, 153' },
  T4: { status: 'r', note: 'fourth thema, lost; Bobzien 1996 p. 153' },
};

function Sequent({ n }: { n: DNode }) {
  return (
    <span className="font-mono text-[12px] text-academy-text whitespace-nowrap">
      {n.line && <span className="text-academy-muted mr-1.5">{n.line}</span>}
      {n.premisses.join('; ')}
      <span className="text-academy-gold mx-1.5">⊢</span>
      {n.conclusion}
    </span>
  );
}

function Node({ n, rules }: { n: DNode; rules: RuleKey }) {
  const status = rules[n.rule]?.status ?? 'r';
  return (
    <div className="inline-flex flex-col items-stretch">
      {n.children && n.children.length > 0 && (
        <div className="flex items-end justify-center gap-8 px-2">
          {n.children.map((c, i) => (
            <Node key={i} n={c} rules={rules} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 mt-1">
        <span className="flex-1 min-w-[24px]" style={{ borderTop: `1px solid ${gold(0.7)}` }} />
        <Tag kind={status} title={rules[n.rule]?.note}>
          {n.rule}
        </Tag>
        {n.marks?.map(m => (
          <Mark key={m}>{m}</Mark>
        ))}
      </div>
      <div className="flex justify-center pt-1 pb-0.5 pr-2">
        <Sequent n={n} />
      </div>
    </div>
  );
}

export function DerivationTree({ root, rules, label }: { root: DNode; rules: RuleKey; label?: string }) {
  const used = new Set<string>();
  const walk = (n: DNode) => {
    used.add(n.rule);
    n.children?.forEach(walk);
  };
  walk(root);
  return (
    <div className="my-3">
      {label && <p className="text-academy-muted text-xs mb-2">{label}</p>}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="inline-block min-w-full text-center">
          <Node n={root} rules={rules} />
        </div>
      </div>
      <ul className="mt-2 space-y-1">
        {[...used].sort((a, b) => Object.keys(rules).indexOf(a) - Object.keys(rules).indexOf(b)).map(r => (
          <li key={r} className="flex items-start gap-2 text-[11px] text-academy-muted leading-snug">
            <Tag kind={rules[r]?.status ?? 'r'}>{r}</Tag>
            <span className="pt-0.5">{rules[r]?.note ?? 'rule not in the key'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
