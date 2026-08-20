import type { Metadata } from 'next'
import HappinessScale from '@/components/HappinessScale'

export const metadata: Metadata = {
  title: 'The Scale of Happiness — Arete Academy',
  description:
    'Κλίμακα Εὐδαιμονίας — locate yourself on the scale from Ataraxia to Epithumia, then move left. Zones, philosophers, diagnostics, and the obstacles that pull you rightward.',
}

export default function FrameworkPage() {
  return <HappinessScale />
}
