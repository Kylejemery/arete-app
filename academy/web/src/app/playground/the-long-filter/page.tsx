import type { Metadata } from 'next'
import LongFilter from '@/components/playground/LongFilter'

export const metadata: Metadata = {
  title: 'The Long Filter — Playground | Arete Academy',
  description:
    'A civilization that can end itself eventually will. Drag the two dials, split the Drake equation in two, and see why a moral filter predicts a crowded galaxy that stays silent.',
}

export default function PlaygroundLongFilterPage() {
  return <LongFilter backHref="/playground" backLabel="← The Playground" />
}
