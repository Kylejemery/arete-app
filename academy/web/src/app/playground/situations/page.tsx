import type { Metadata } from "next";
import Link from "next/link";

import { situations } from "@/content/playground/situations";
import SituationsGame from "@/components/playground/SituationsGame";

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
