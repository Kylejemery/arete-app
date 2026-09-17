import type { Metadata } from 'next'
import TheImpression from '@/components/playground/TheImpression'

export const metadata: Metadata = {
  title: 'The Impression — Playground | Arete Academy',
  description:
    'What happens to a soul when something appears to it, before any agreeing is done. Zeno called it an imprint, borrowing the word from a seal in wax. Cleanthes read that literally; Chrysippus said a soul holds many impressions at once and seals cannot share a spot. Send the same impressions to both souls and watch one of them fail.',
}

// Back to the app rather than the Playground index, which is gated. See the
// note on the Scale of Happiness page.
export default function PlaygroundTheImpressionPage() {
  return <TheImpression backHref="https://app.pursuearete.com" backLabel="← Back to Arete" />
}
