import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { allSlugs, getPerspective } from "@/content/perspectives";
import PerspectiveArticle from "@/components/perspectives/PerspectiveArticle";
import "../perspectives.css";

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
    title: `${p.title} | ${p.series} | Arete Academy`,
    description: p.standfirst,
    openGraph: { title: p.title, description: p.standfirst, type: "article" },
  };
}

export default async function PerspectivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getPerspective(slug);
  if (!p) notFound();

  return <PerspectiveArticle p={p} />;
}
