import type { Metadata } from 'next'
import LongFilterFormalism from '@/components/playground/LongFilterFormalism'

export const metadata: Metadata = {
  title: 'The Long Filter: Formal Statement — Playground | Arete Academy',
  description:
    'The companion note to The Long Filter: every derivation, the parameter sources, the two thresholds, and the eleven assumptions the argument rests on — written so anyone who wants to attack it knows which line to attack.',
}

export default function PlaygroundLongFilterFormalismPage() {
  return <LongFilterFormalism />
}
