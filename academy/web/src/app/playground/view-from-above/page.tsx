import type { Metadata } from 'next'
import ViewFromAbove from '@/components/playground/ViewFromAbove'

export const metadata: Metadata = {
  title: 'The View from Above — Playground | Arete Academy',
  description:
    'The Stoic exercise of rising until all of time is in view. Compress the universe into a year, the Earth into a day, our species into an hour — and see how brief your place in it is.',
}

export default function PlaygroundViewFromAbovePage() {
  return <ViewFromAbove backHref="/playground" backLabel="← The Playground" />
}
