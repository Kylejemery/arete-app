import type { Metadata } from 'next'
import LongFilter from '@/components/playground/LongFilter'

export const metadata: Metadata = {
  title: 'The Long Filter — Playground | Arete Academy',
  description:
    'A civilization that can end itself eventually will. Read Seneca’s phoenix as a rate, set it against annual catastrophic risk, and the Fermi question reduces to one ratio — a galaxy quietly crowded, or empty.',
}

export default function PlaygroundLongFilterPage() {
  return <LongFilter backHref="/playground" backLabel="← The Playground" />
}
