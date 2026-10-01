import type { Metadata } from 'next'
import ViewFromAbove from '@/components/playground/ViewFromAbove'

export const metadata: Metadata = {
  title: 'The View from Above — Playground | Arete Academy',
  description:
    'The Stoic exercise of rising until all of time is in view. Compress the universe into a year, the Earth into a day, our species into an hour — and see how brief your place in it is.',
}

// Back to the app rather than the Playground index, which is gated. See the
// note on the Scale of Happiness page.
export default function PlaygroundViewFromAbovePage() {
  return <ViewFromAbove backHref="https://app.pursuearete.com" backLabel="← Back to Arete" />
}
