import type { Metadata } from "next";
import StoicQCA from "./StoicQCA";
import { ANCHORS, CASES } from "./data";
import styles from "./stoic-qca.module.css";

export const metadata: Metadata = {
  title: "Who Lived What They Taught? A Qualitative Comparative Analysis of the Stoics",
  description:
    "A fuzzy-set QCA of ancient Stoics asking which combinations of power, wealth, adversity, lineage, vocation, and court service go with living consistently with the doctrine.",
};

const FILES = [
  { href: "/research/stoic-qca/stoic_qca_codebook.xlsx", label: "Codebook and scores", kind: "Excel" },
  { href: "/research/stoic-qca/stoic_qca_analysis.R", label: "Analysis script", kind: "R" },
  { href: "/research/stoic-qca/stoic_qca_results.txt", label: "Full output of the published run", kind: "Text" },
];

export default function Page() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Research · Working paper</p>
        <h1>Who lived what they taught?</h1>
        <p className={styles.dek}>
          A qualitative comparative analysis of {CASES.length} Stoics, from Zeno to Marcus Aurelius
        </p>
      </header>

      <article className={styles.prose}>
        <h2>Why this method fits this school</h2>
        <p>
          Qualitative comparative analysis, developed by the sociologist Charles Ragin, treats causes as
          combinations. Instead of asking how much one variable moves an outcome on average, it asks which
          configurations of conditions are necessary or sufficient for it, and it allows more than one road to
          the same place. It works best with a few dozen well-known cases, which is roughly how many Stoics we
          know well enough to say anything about.
        </p>
        <p>
          The Stoics already reasoned in this shape. The claim that virtue is sufficient for happiness is a
          sufficiency claim in the strict sense. The unity of the virtues says the conditions only work together.
          And the school&apos;s famous division of humanity into sages and fools is a crisp set: a man drowning an
          inch below the surface drowns as surely as one a fathom down. Yet the doctrine of moral progress,
          prokopē, admits degrees. Fuzzy-set QCA, where membership runs from 0 to 1, is in a sense the
          progressor&apos;s view of the world.
        </p>

        <h2>The question</h2>
        <p>
          Which combinations of life circumstances go with a Stoic being remembered as living consistently with
          what he taught? The outcome is judged from the ancient testimony, not from anyone&apos;s modern reputation.
          Seneca and Dionysius the Renegade matter as much as Epictetus here, because a method that only studies
          successes can&apos;t tell you what separates them from failures.
        </p>

        <h2>How each set is scored</h2>
        <dl className={styles.anchors}>
          {ANCHORS.map((a) => (
            <div key={a.set}>
              <dt>
                <code>{a.set}</code> {a.label}
              </dt>
              <dd>{a.anchors}</dd>
            </div>
          ))}
        </dl>
        <p>
          COURT was not in the first design. It was added after the first truth table put Persaeus and Seneca in
          the same row as Cato and Rutilius Rufus, with opposite outcomes. A contradictory row means a condition
          is missing, and what the two failures share is that both served at the pleasure of a king.
        </p>
      </article>

      <StoicQCA />

      <article className={styles.prose}>
        <h2>What the published run found</h2>
        <p>
          These results come from the R QCA package on the published scores. Edits you make above change the
          tables but not this summary.
        </p>
        <p>
          <strong>Adding COURT resolves the contradiction.</strong> Rutilius, Cato, and Marcus land in a row with
          consistency 1.00. Persaeus and Seneca fall to 0.49.
        </p>
        <p>
          <strong>Adversity outside a court is the strongest single path.</strong> ADV × ~COURT reaches 0.93
          consistency and covers 0.68 of the outcome. The school&apos;s strongest witnesses, from Cleanthes drawing
          water at night to Epictetus enslaved and lame to Rutilius in exile, faced hardship without a throne to answer
          to. The narrower statesman&apos;s path, POW × ADV × ~COURT × ~PROF, is perfectly consistent but covers only
          0.32.
        </p>
        <p>
          <strong>The recipe for failure is not the mirror image of the recipe for success.</strong> Analyzed on
          its own, inconsistency comes through ADV × COURT (0.80), adversity while serving an autocrat, and
          through a missing Stoic lineage without adversity, which is Egnatius Celer&apos;s row alone.
        </p>
        <p>
          <strong>Being a trained professional philosopher is weaker evidence than it first looked.</strong> In
          the crisp version, TEACH × PROF seemed nearly sufficient. In fuzzy sets it reaches only 0.71, because
          most teachers of the school score 0.67 rather than 1 on the outcome. Their lives were rarely put to a
          public test, so the sources give us less to judge.
        </p>
        <p>
          <strong>Nothing is necessary on its own.</strong> Not being a courtier scores 0.92 as a necessary
          condition, but its relevance is low (0.42), since almost no one in the sample was a courtier. It is a
          trivial necessity, not a finding.
        </p>

        <h2>What this can&apos;t show</h2>
        <p>
          <strong>Observability.</strong> Consistency is hardest to see when nothing tests it, so the outcome
          partly depends on one of the conditions. A check restricted to cases whose conduct under a specific
          pressure is recorded gives nearly the same fit for ADV (0.84 against 0.85), which is reassuring but not
          decisive.
        </p>
        <p>
          <strong>Survivorship.</strong> The ancient sources remember remarkable lives. Obscure Stoics who lived
          well or badly in private are invisible to this design.
        </p>
        <p>
          <strong>Too few cases for the space.</strong> Six conditions define 64 possible combinations and the
          sample fills 10 of them. The parsimonious solution comes out as three equally good models, which is a
          sign to treat these as hypotheses rather than conclusions.
        </p>
        <p>
          <strong>Boundary cases and judgment calls.</strong> Thrasea Paetus and Helvidius Priscus are Stoics
          partly by later attribution. Dropping them leaves ADV × ~COURT in the solution set. Several scores,
          including Egnatius Celer&apos;s wealth and Athenodorus&apos;s court service, are judgment calls, and each case
          lists its sources so the scoring can be argued with.
        </p>

        <h2>Data and code</h2>
        <p>
          Everything needed to reproduce or dispute the analysis is here. The R script reads the Scores sheet of
          the workbook directly.
        </p>
        <ul className={styles.files}>
          {FILES.map((f) => (
            <li key={f.href}>
              <a href={f.href} download>
                {f.label}
              </a>{" "}
              <span className={styles.fileKind}>{f.kind}</span>
            </li>
          ))}
        </ul>
        <p className={styles.help}>
          Method reference: Charles Ragin, <em>Redesigning Social Inquiry: Fuzzy Sets and Beyond</em> (2008);
          Adrian Duşa, <em>QCA with R</em> (2019).
        </p>
      </article>
    </main>
  );
}
