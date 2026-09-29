import type { Metadata } from 'next'
import StoicQCAPaper, { metadata as paper } from '../../research/stoic-qca/page'

export const metadata: Metadata = {
  ...paper,
  title: 'Who Lived What They Taught? | Playground | Arete Academy',
}

// The working paper lives at /research/stoic-qca, where sync_to_site.R writes
// its data, and is shown here as it is. The back link returns to the app, not
// the gated Playground index; see the note on the Scale of Happiness page.
export default function PlaygroundStoicQCAPage() {
  return (
    <div className="pg">
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1.25rem 0' }}>
        <a className="pg-back" href="https://app.pursuearete.com" style={{ margin: 0 }}>
          ← Back to Arete
        </a>
      </div>
      <StoicQCAPaper />
    </div>
  )
}
