import Link from "next/link";
import type { Perspective } from "@/content/perspectives";
import Reveal from "@/components/perspectives/Reveal";

/**
 * The Perspectives essay, rendered from a Perspective record. Extracted from
 * the original /perspectives/[slug] page so the same article can be shown
 * unchanged inside the Playground with the corpus discussion appended beneath.
 *
 * The essay/how-to/exercise prose is the frame that surrounds every paired-
 * document perspective; the per-day columns and canon cards come from content.
 */

const ESSAY = [
  "Socrates held that no one does wrong willingly. Not that wrongdoing is rare, and not that it is excusable, but that every action is aimed at something the agent takes to be good, so that when the aim is monstrous the failure lies in the taking. Vice is a defect of sight before it is a defect of will.",
  "This is the easiest doctrine in the school to agree with and the hardest to hold for longer than a paragraph. It survives contact with the careless driver and the difficult colleague. It collapses the moment you meet someone whose error has a body count, because at that point the mind reaches for a simpler instrument, which is the villain.",
  "What follows is built to make the doctrine difficult rather than comfortable. Two documents cover the same nine days of the same war. On the left, a father in east Tehran writes in the exercise book that came home in his nine year old daughter's school bag. On the right, the man who ordered the strike dictates his memoir into a recorder, in a room with no one in it who will contradict him.",
  "Neither man believes he is doing wrong. One of them is right about that.",
];

const HOWTO = [
  "Read across, not down. The pairing is the argument, and the dates are matched deliberately, so the entry that takes the father forty days of mourning is the entry in which the president grades his own performance on a tarmac at six in the morning.",
  "Between the two columns, at the foot of each day, the canon reads both men at once. It is the only voice on this page that can see both.",
];

const STEPS = [
  ["Write their account in the first person.", "Not a confession and not a satire. The version in which they are the reasonable party, the version they would recognize, containing the true grievances as well as the false ones."],
  ["Find the assent.", "Somewhere in what you have written there is a moment where a false impression was accepted as fact. Mark it. It is almost never at the dramatic point. It is usually early, small, and phrased as something obvious."],
  ["Name the good they were reaching for.", "Safety, standing, loyalty, the protection of someone. It will be a real good, aimed at badly. If you cannot find one you have not finished step one."],
  ["Find the same move in your own week.", "This is the step people skip, and it is the only one that changes anything."],
];

export default function PerspectiveArticle({ p }: { p: Perspective }) {
  return (
    <main className="pv">
      <header className="pv-hero">
        <span className="pv-seamline" aria-hidden="true" />
        <p className="pv-eyebrow">
          {p.series} <span aria-hidden="true">&middot;</span> Arete Academy
        </p>
        <h1>{p.title}</h1>
        <p className="pv-standfirst">{p.standfirst}</p>
      </header>

      <section className="pv-essay">
        <div className="pv-epigraph">
          <q>{p.epigraph.rendering}</q>
          <cite>
            {p.epigraph.work} <span aria-hidden="true">/</span> {p.epigraph.text_ref}
          </cite>
        </div>
        <div className="pv-essay-in">
          {ESSAY.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
          <div className="pv-howto">
            {HOWTO.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </div>
      </section>

      {p.entries.map((e, i) => (
        <section className="pv-band" key={e.date} aria-labelledby={`pv-d${i}`}>
          <div className="pv-band-head">
            <span className="pv-rule" aria-hidden="true" />
            <h2 id={`pv-d${i}`} className="pv-band-date">
              {e.date}
              <span className="pv-yr">{e.year}</span>
            </h2>
            <span className="pv-rule" aria-hidden="true" />
          </div>

          <div className="pv-cols">
            <div className="pv-col pv-col-paper">
              <p className="pv-col-tag">{p.left.label}</p>
              {e.notebook.map((t, j) => (
                <p className="pv-ink" key={j}>
                  {t}
                </p>
              ))}
            </div>
            <div className="pv-col pv-col-tape">
              <p className="pv-col-tag">{p.right.label}</p>
              {e.tape.map((t, j) => (
                <p className="pv-mono" key={j}>
                  {t}
                </p>
              ))}
            </div>
          </div>

          <Reveal className="pv-canon">
            <p className="pv-canon-ref">
              <span className="pv-dot" aria-hidden="true" />
              {e.canon.work}
              <span className="pv-sep">/</span>
              {e.canon.text_ref}
            </p>
            <blockquote className="pv-canon-q">{e.canon.rendering}</blockquote>
            {e.canon.note ? <p className="pv-canon-note">{e.canon.note}</p> : null}
          </Reveal>
        </section>
      ))}

      <section className="pv-close">
        <div className="pv-close-in">
          <h3>The exercise</h3>
          <p>
            Choose someone whose conduct you find indefensible. Not a stranger in the
            news. Someone whose actions have cost you something.
          </p>
          <ol>
            {STEPS.map(([head, body]) => (
              <li key={head}>
                <strong>{head}</strong> {body}
              </li>
            ))}
          </ol>
          <p className="pv-warn">
            A caution, since this exercise is regularly misunderstood as a route to
            forgiveness. It is not, and Marcus never claims it is. The father is
            explicit in his last entry that he does not forgive and hopes the
            responsible are made to look at what they did, by name, one child at a
            time. Understanding the mechanism of another person&rsquo;s error tells you
            what happened. It does not tell you what is owed. Those are separate
            questions and the school keeps them separate.
          </p>
          <Link className="pv-cta" href="/courses/phil-706">
            Study this in PHIL 706
          </Link>
        </div>
      </section>

      <footer className="pv-foot">
        <div className="pv-foot-in">
          <p>
            Both documents are fiction. The father, the president, their families and
            their staff are invented. The chronology of the war is drawn from the public
            record of 2026. Canon renderings are close paraphrase from public domain
            translations and carry the standard references so they can be read against
            any edition.
          </p>
        </div>
      </footer>
    </main>
  );
}
