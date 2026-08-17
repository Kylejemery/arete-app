import type { Metadata } from "next";
import Link from "next/link";

import { situations } from "@/content/playground/situations";
import CorpusDiscussion from "@/components/playground/CorpusDiscussion";

export const metadata: Metadata = {
  title: "The Situations Game — Playground | Arete Academy",
  description:
    "Everyday situations, each with the response the tradition would give — then argue the verdict with the corpus.",
};

export default function SituationsPage() {
  return (
    <main className="pg">
      <div className="pg-sit">
        <Link className="pg-back" href="/playground">
          ← The Playground
        </Link>

        <header className="pg-sit-intro">
          <p className="pg-eyebrow" style={{ marginBottom: "1rem" }}>
            The Situations Game
          </p>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontVariationSettings: "'WONK' 1",
              fontWeight: 400,
              fontSize: "clamp(2.2rem, 6vw, 3.4rem)",
              lineHeight: 1.02,
              margin: 0,
              color: "var(--paper)",
            }}
          >
            What would the school say?
          </h1>
          <p>
            Ordinary moments, and the response the tradition would actually give
            — not a platitude, but the move it would make. Read the verdict, then
            decide whether you buy it. Agree, disagree, or push back, and the
            corpus will answer.
          </p>
        </header>

        {situations.map((s) => (
          <article className="pg-situation" key={s.id} id={s.id}>
            <div className="pg-situation-head">
              <p className="pg-sit-tag">{s.tag}</p>
              <h2>{s.title}</h2>
              <p className="pg-sit-scene">{s.scene}</p>
            </div>

            <div className="pg-sit-response">
              <p className="pg-sit-response-ref">
                <span className="pg-diamond" aria-hidden="true" />
                {s.ref.work}
                <span style={{ opacity: 0.45 }}>/</span>
                {s.ref.text_ref}
              </p>
              <p className="pg-sit-verdict">{s.verdict}</p>
              <p className="pg-sit-reason">{s.reason}</p>
            </div>

            <CorpusDiscussion
              threadKey={`situation:${s.id}`}
              context={
                `A situation from the Situations Game — "${s.title}" (${s.tag}). ` +
                `The scene: ${s.scene} ` +
                `The tradition's verdict, resting on ${s.ref.work} ${s.ref.text_ref}: ` +
                `"${s.verdict}" Reasoning: ${s.reason} ` +
                `The reader is agreeing or disagreeing with this verdict.`
              }
              heading="Do you buy the verdict?"
              placeholder="Agree, disagree, or complicate it — the corpus will answer."
            />
          </article>
        ))}

        <p
          style={{
            fontFamily: "var(--util)",
            fontSize: "0.82rem",
            color: "var(--bone-dim)",
            lineHeight: 1.6,
            borderTop: "1px solid var(--tape-rule)",
            paddingTop: "1.6rem",
            marginTop: "1rem",
          }}
        >
          Canon renderings are close paraphrase from public-domain translations
          and carry standard references so they can be read against any edition.
        </p>
      </div>
    </main>
  );
}
