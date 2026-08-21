import type { Metadata } from 'next'
import HappinessScale from '@/components/HappinessScale'

export const metadata: Metadata = {
  title: 'The Scale of Happiness — Playground | Arete Academy',
  description:
    'Κλίμακα Εὐδαιμονίας in the Playground — locate yourself from Ataraxia to Epithumia, read the zones, and pressure-test where you land against the tradition.',
}

export default function PlaygroundHappinessScalePage() {
  return (
    <HappinessScale
      backHref="/playground"
      backLabel="← The Playground"
      showFooter={false}
    />
  )
}
