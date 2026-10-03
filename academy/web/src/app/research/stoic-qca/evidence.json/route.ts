// The published evidence as data: every passage the evidence panel quotes,
// with the rag_corpus chunk it is quoted from. The nightly quality audit
// (library.qca_evidence in server/lib/quality-audit/probes-library.js) reads
// this to check each excerpt is still verbatim in a live chunk. Built from
// data.ts at deploy, so it always describes what readers are shown.

import { CASES, EVIDENCE } from "../data";

export const dynamic = "force-static";

export function GET() {
  const items = [];
  for (const c of CASES) {
    for (const [set, e] of Object.entries(EVIDENCE[c.name] ?? {})) {
      for (const v of e.evidence) {
        if (v.chunkId) items.push({ case: c.name, set, citation: v.citation, excerpt: v.excerpt, chunkId: v.chunkId });
      }
    }
  }
  return Response.json({ version: 1, items });
}
