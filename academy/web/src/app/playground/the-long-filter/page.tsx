import type { Metadata } from 'next'
import LongFilter from '@/components/playground/LongFilter'

export const metadata: Metadata = {
  title: 'The Long Filter — Playground | Arete Academy',
  description:
    'A civilization that can end itself eventually will. Split the hazard into malice, error and the irreducible, and the Fermi question turns into two conditions — a galaxy quietly crowded, or empty.',
}

// Back to the app rather than the Playground index, which is gated. See the
// note on the Scale of Happiness page.
export default function PlaygroundLongFilterPage() {
  return <LongFilter backHref="https://app.pursuearete.com" backLabel="← Back to Arete" />
}
