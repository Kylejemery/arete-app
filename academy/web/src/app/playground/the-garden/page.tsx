import type { Metadata } from 'next'
import Garden from '@/components/playground/garden/Garden'

export const metadata: Metadata = {
  title: 'The Garden — Playground | Arete Academy',
  description:
    'The Stoics drew their philosophy as a fertile field: logic the wall, physics the soil and the trees, ethics the fruit. Walk the garden, take a part away and see what is left, then step into each bed.',
}

export default function PlaygroundGardenPage() {
  return <Garden />
}
