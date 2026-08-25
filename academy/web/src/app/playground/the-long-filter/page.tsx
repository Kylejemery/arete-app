import type { Metadata } from 'next'
import LongFilter from '@/components/playground/LongFilter'

export const metadata: Metadata = {
  title: 'The Long Filter — Playground | Arete Academy',
  description:
    'A civilization that can end itself eventually will. Split the hazard into malice, error and the irreducible, and the Fermi question turns into two conditions — a galaxy quietly crowded, or empty.',
}

export default function PlaygroundLongFilterPage() {
  return <LongFilter backHref="/playground" backLabel="← The Playground" />
}
