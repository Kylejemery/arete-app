import type { Metadata } from 'next'
import LongFilter from '@/components/playground/LongFilter'

export const metadata: Metadata = {
  title: 'The Long Filter — Playground | Arete Academy',
  description:
    'A civilization that can end itself, at a steady risk, eventually will. On the course we are on that is the expected end; this is what survival would have to look like if it were to happen — competence kept ahead of capability, and hazards retired rather than policed.',
}

// Back to the app rather than the Playground index, which is gated. See the
// note on the Scale of Happiness page.
export default function PlaygroundLongFilterPage() {
  return <LongFilter backHref="https://app.pursuearete.com" backLabel="← Back to Arete" />
}
