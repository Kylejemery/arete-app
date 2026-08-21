import type { Metadata } from "next";
import Link from "next/link";

import KosmopolisWorld from "@/components/playground/KosmopolisWorld";

export const metadata: Metadata = {
  title: "Kosmopolis — Playground | Arete Academy",
  description:
    "A simulated world built like ours on one different law: here the physics reward virtue. Seed souls, watch them evolve, and spend the Oracle to awaken one to reason.",
};

export default function KosmopolisPage() {
  return (
    <main className="pg">
      <div className="pg-sit">
        <Link className="pg-back" href="/playground">
          ← The Playground
        </Link>

        <header className="pg-sit-intro">
          <p className="pg-eyebrow" style={{ marginBottom: "1rem" }}>
            Kosmopolis
          </p>
          <h1 className="pg-sit-h1">A world built for virtue</h1>
          <p>
            A world like ours, on one changed law: here the physics reward
            virtue. Ignite it and watch souls appear, act, and — as they grow
            wise, just, brave, and temperate — brighten the world around them.
            Vice dims it. Nothing here reasons yet, on its own. Click a soul and
            spend the Oracle to awaken one to thought — that act is remembered for
            every visitor who comes after.
          </p>
        </header>

        <KosmopolisWorld />

        <p className="pg-sit-note">
          The moral physics are a rule-based sketch of the Stoic thesis, meant to
          be argued with — move the doctrine dials and see the world answer.
          Awakening and counsel draw on the same corpus Oracle as the rest of the
          playground, and share its daily limit.
        </p>
      </div>
    </main>
  );
}
