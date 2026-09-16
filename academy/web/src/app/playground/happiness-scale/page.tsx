import type { Metadata } from 'next'
import HappinessScale from '@/components/HappinessScale'

export const metadata: Metadata = {
  title: 'The Scale of Happiness — Playground | Arete Academy',
  description:
    'Κλίμακα Εὐδαιμονίας in the Playground — locate yourself from Ataraxia to Epithumia, read the zones, and pressure-test where you land against the tradition.',
}

// The Playground index is gated (see middleware's RELEASED_PLAYGROUND), so the
// back link cannot point at it — it would dead-end on a 404. It returns to the
// app instead, which is where the people who reach this page come from.
export default function PlaygroundHappinessScalePage() {
  return (
    <HappinessScale
      backHref="https://app.pursuearete.com"
      backLabel="← Back to Arete"
      showFooter={false}
    />
  )
}
