import type { Metadata } from "next";

import { situations } from "@/content/playground/situations";
import SituationsGame from "@/components/playground/SituationsGame";

export const metadata: Metadata = {
  title: "The Situations Game — Playground | Arete Academy",
  description:
    "Everyday situations, each with the response the tradition would give — then argue the verdict with the corpus.",
};

// Back to the app rather than the Playground index, which is gated. See the
// note on the Scale of Happiness page.
export default function SituationsPage() {
  return (
    <main className="pg">
      <div className="pg-sit">
        <a className="pg-back" href="https://app.pursuearete.com">
          ← Back to Arete
        </a>

        <header className="pg-sit-intro">
          <p className="pg-eyebrow" style={{ marginBottom: "1rem" }}>
            The Situations Game
          </p>
          <h1 className="pg-sit-h1">What would the school say?</h1>
          <p>
            Ordinary moments, and the response the tradition would actually give
            — not a platitude, but the move it would make. Pick a situation, read
            the verdict, then decide whether you buy it. Agree, disagree, or push
            back, and the corpus will answer.
          </p>
        </header>

        <SituationsGame situations={situations} />

        <p className="pg-sit-note">
          Canon renderings are close paraphrase from public-domain translations
          and carry standard references so they can be read against any edition.
        </p>
      </div>
    </main>
  );
}
