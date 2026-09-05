import type { Metadata } from 'next'
import GardenLogic from '@/components/playground/garden/GardenLogic'

export const metadata: Metadata = {
  title: 'Logic — The Garden | Arete Academy',
  description:
    'Logic as the wall of the Stoic garden. Nine arguments come to the gate, the five indemonstrables among their counterfeits and two old sophisms. Decide which get in.',
}

export default function PlaygroundGardenLogicPage() {
  return <GardenLogic />
}
