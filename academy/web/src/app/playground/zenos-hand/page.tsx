import type { Metadata } from 'next'
import ZenosHand from '@/components/playground/ZenosHand'

export const metadata: Metadata = {
  title: 'Zeno’s Hand — Playground | Arete Academy',
  description:
    'Zeno taught Stoic epistemology with one hand: open it for an impression, curl it for assent, close it for a grasp, then grip the fist with the other hand for knowledge. Step through the gesture, then test your own assent against nine cases from the ancient argument.',
}

// Back to the app rather than the Playground index, which is gated. See the
// note on the Scale of Happiness page.
export default function PlaygroundZenosHandPage() {
  return <ZenosHand backHref="https://app.pursuearete.com" backLabel="← Back to Arete" />
}
