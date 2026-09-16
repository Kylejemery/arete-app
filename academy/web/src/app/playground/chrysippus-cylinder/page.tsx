import type { Metadata } from 'next'
import ChrysippusCylinder from '@/components/playground/ChrysippusCylinder'

export const metadata: Metadata = {
  title: 'Chrysippus’s Cylinder — Playground | Arete Academy',
  description:
    'If every event has a cause reaching back before you were born, in what sense is anything you do yours? Chrysippus answered with an object on a floor: the push starts it, but it rolls according to its own shape. Push three shapes with the same hand, then push a mind.',
}

// Back to the app rather than the Playground index, which is gated. See the
// note on the Scale of Happiness page.
export default function PlaygroundChrysippusCylinderPage() {
  return <ChrysippusCylinder backHref="https://app.pursuearete.com" backLabel="← Back to Arete" />
}
