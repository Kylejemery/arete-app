import type { Metadata } from 'next'
import ThePassage from '@/components/playground/ThePassage'

export const metadata: Metadata = {
  title: 'The Passage — Playground | Arete Academy',
  description:
    'A model of the crossing from an adolescent civilization to a sage one: how long it takes, what it costs while it happens, and which institutions dissolve at which point along the way. Move the dials and the social history moves with them.',
}

export default function PlaygroundThePassagePage() {
  return <ThePassage backHref="/playground" backLabel="← The Playground" />
}
