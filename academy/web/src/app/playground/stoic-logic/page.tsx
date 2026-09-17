import type { Metadata } from 'next'
import StoicLogic from '@/components/playground/StoicLogic'

export const metadata: Metadata = {
  title: 'The Five Indemonstrables — Playground | Arete Academy',
  description:
    'The Stoics built the first propositional logic in the West and ran it on five argument forms they held to be complete. Sort what can bear a truth value, work the five forms and the two that only look like them, and set the connectives to see why the Stoic "either" is exclusive.',
}

// Back to the app rather than the Playground index, which is gated. See the
// note on the Scale of Happiness page.
export default function PlaygroundStoicLogicPage() {
  return <StoicLogic backHref="https://app.pursuearete.com" backLabel="← Back to Arete" />
}
