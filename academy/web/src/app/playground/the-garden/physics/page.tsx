import type { Metadata } from 'next'
import GardenPhysics from '@/components/playground/garden/GardenPhysics'

export const metadata: Metadata = {
  title: 'Physics — The Garden | Arete Academy',
  description:
    'Physics as the soil of the Stoic garden. One breath at four tensions, from the stone to the reasoning creature, and the two principles under it all. Why the fruit needs this soil.',
}

export default function PlaygroundGardenPhysicsPage() {
  return <GardenPhysics />
}
