import type { Metadata } from 'next'
import { THEMATA_MACHINE_HTML } from '@/content/playground/themata-machine'

export const metadata: Metadata = {
  title: 'Themata Machine — Playground | Arete Academy',
  description:
    'Explorer for the Themata Project export: every candidate reconstruction of the Stoic themata against the formal suite, as the Lean harness found it.',
  robots: { index: false, follow: false },
}

// Unreleased, and deliberately so. No public claims until a specialist in
// Stoic logic has reviewed the ledger and the formalization (SCOPE.md,
// guardrail 5), so this slug must stay out of RELEASED_PLAYGROUND in
// middleware.ts: only the owner can open it.
//
// The page is themata/machine.html, rendered in an isolated frame. Its data is
// the export in themata/results/explorer/, copied to
// public/playground/themata-machine/data/, which the Playground gate also
// covers. Both reach the build through scripts/themata/sync-machine-page.mjs.
// Releasing the page means letting /playground/themata-machine/data/* through
// the gate as well as the slug.
export default function PlaygroundThemataMachinePage() {
  return (
    <iframe
      title="Themata Machine"
      srcDoc={THEMATA_MACHINE_HTML}
      style={{ display: 'block', width: '100%', height: '100vh', border: 0, background: '#0a1628' }}
    />
  )
}
