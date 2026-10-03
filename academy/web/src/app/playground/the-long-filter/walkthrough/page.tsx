import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import LongFilterWalkthrough from '@/components/playground/LongFilterWalkthrough'

export const metadata: Metadata = {
  title: 'The Math of the Long Filter: A Walkthrough — Playground | Arete Academy',
  description:
    'The Long Filter model built up in seven steps, from a constant risk to a count of survivors in the galaxy, with a worked example and exercises.',
}

// Read and rendered once at build time; the page ships as static HTML.
export const dynamic = 'force-static'

const SOURCE = readFileSync(
  path.join(process.cwd(), 'src/content/playground/long-filter-walkthrough.md'),
  'utf8',
)

export default function PlaygroundLongFilterWalkthroughPage() {
  return <LongFilterWalkthrough source={SOURCE} />
}
