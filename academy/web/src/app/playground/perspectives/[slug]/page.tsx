import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { allSlugs, getPerspective } from "@/content/perspectives";
import PerspectiveArticle from "@/components/perspectives/PerspectiveArticle";
import CorpusDiscussion from "@/components/playground/CorpusDiscussion";
import "../../../perspectives/perspectives.css";

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getPerspective(slug);
  if (!p) return {};
  return {
    title: `${p.title} — Playground | Arete Academy`,
    description: p.standfirst,
  };
}

export default async function PlaygroundPerspectivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getPerspective(slug);
  if (!p) notFound();

  // What the corpus is told the reader is responding to, so its replies land
  // against the actual argument rather than in the abstract.
  const context =
    `The perspective essay "${p.title}" (${p.series}). Standfirst: ${p.standfirst} ` +
    `The essay presses the Socratic doctrine that no one does wrong willingly — that ` +
    `every action aims at some apparent good, so vice is a defect of sight before it is ` +
    `a defect of will. It pairs two first-person documents from the same nine days of a ` +
    `war: a bereaved father's notebook and the president's dictated memoir. The reader ` +
    `may be agreeing or disagreeing with the outcome of the essay, with the essay itself, ` +
    `or with the underlying claim that no one does wrong on purpose.`;

  return (
    <div className="pg" style={{ background: "var(--paper)" }}>
      <div style={{ background: "var(--tape)", padding: "1.2rem var(--gap)" }}>
        <Link className="pg-back" href="/playground" style={{ margin: 0 }}>
          ← The Playground
        </Link>
      </div>

      <PerspectiveArticle p={p} />

      <div style={{ background: "var(--tape)" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <CorpusDiscussion
            threadKey={`perspective:${p.slug}`}
            context={context}
            heading="Argue it with the corpus"
            intro={
              "Where do you land? You can agree or disagree with the outcome, with the " +
              "essay itself, or with the claim underneath it — that no one does wrong on " +
              "purpose. Post your view and the corpus will answer, granting what is right " +
              "in it and pressing where it goes wrong."
            }
            placeholder="e.g. 'The president knew exactly what he was doing — the no-one-does-wrong-willingly line lets him off the hook.'"
          />
        </div>
      </div>
    </div>
  );
}
