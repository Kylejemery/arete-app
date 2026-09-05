import type { Metadata } from 'next'
import GardenEthics from '@/components/playground/garden/GardenEthics'

export const metadata: Metadata = {
  title: 'Ethics — The Garden | Arete Academy',
  description:
    'Ethics as the fruit of the Stoic garden. Sort twelve things into the Stoic baskets, good, bad, preferred, dispreferred and wholly indifferent, and see whether you can hold the line that only virtue is good.',
}

export default function PlaygroundGardenEthicsPage() {
  return <GardenEthics />
}
