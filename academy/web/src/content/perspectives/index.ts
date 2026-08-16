import raw from "./notebook-and-tapes.json";

/**
 * Perspectives content model.
 *
 * `canon` records are shaped to line up with the immutable canon layer of the
 * Arete corpus. `work` + `textRef` are the natural key. When the read only MCP
 * server over the corpus is live, swap `rendering` for a lookup against the
 * canonical passage and keep `note` here, since the note is derived commentary
 * and belongs in the synthesis layer rather than the canon layer.
 */
export type CanonRef = {
  work: string;
  /** Standard citation, stable across editions. e.g. "Enchiridion 5" */
  text_ref: string;
  /** Close paraphrase from a public domain translation. Swap for corpus text. */
  rendering: string;
  /** Derived commentary. Explains why this passage reads these two entries. */
  note?: string;
};

export type Entry = {
  date: string;
  year: string;
  notebook: string[];
  tape: string[];
  canon: CanonRef;
};

export type Column = { label: string; byline: string; note: string };

export type Perspective = {
  slug: string;
  series: string;
  title: string;
  standfirst: string;
  epigraph: CanonRef;
  left: Column;
  right: Column;
  entries: Entry[];
};

const all: Perspective[] = [raw as Perspective];

export const perspectives = all;

export function getPerspective(slug: string): Perspective | undefined {
  return all.find((p) => p.slug === slug);
}

export function allSlugs(): string[] {
  return all.map((p) => p.slug);
}
