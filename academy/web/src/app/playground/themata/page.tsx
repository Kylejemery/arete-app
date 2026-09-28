import type { Metadata } from 'next'
import { THEMATA_FINDINGS_HTML } from '@/content/playground/themata-findings'

export const metadata: Metadata = {
  title: 'Themata Findings — Playground | Arete Academy',
  description:
    'Phase 5 draft of the Themata Project: what machine-checked reconstructions show about Chrysippus’s themata, for specialist review.',
  robots: { index: false, follow: false },
}

// Unreleased, and deliberately so. The findings are a draft awaiting Kyle's
// sign-off on the ledger and a specialist's review (themata/THEMATA_PROJECT.md,
// guardrails 3 and 5), so this slug must stay out of RELEASED_PLAYGROUND in
// middleware.ts: only the owner can open it until the review is done.
//
// The page is themata/findings.html, rendered in an isolated frame so its
// styles and the Playground's cannot touch each other. The HTML reaches the
// build through a generated module (scripts/themata/sync-findings-page.mjs).
export default function PlaygroundThemataPage() {
  return (
    <iframe
      title="Themata Findings"
      srcDoc={THEMATA_FINDINGS_HTML}
      style={{ display: 'block', width: '100%', height: '100vh', border: 0, background: '#0a1628' }}
    />
  )
}
