import Link from 'next/link';
import { perspectives } from '@/content/perspectives';
import { situations } from '@/content/playground/situations';

/**
 * The Playground hub — an index of experiments. Each card links to a surface
 * where an idea is put to the corpus: the perspective essays and the
 * situations game today, with room to add more.
 */
export default function PlaygroundHub() {
  const featured = perspectives[0];

  return (
    <main className="pg">
      <header className="pg-hero">
        <p className="pg-eyebrow">Arete Academy · Workshop</p>
        <h1>The Playground</h1>
        <p className="pg-lede">
          A workshop for testing ideas against the tradition. Read, take a side,
          and let the corpus answer back.
        </p>
      </header>

      <div className="pg-grid">
        {featured ? (
          <Link className="pg-card" href={`/playground/perspectives/${featured.slug}`}>
            <p className="pg-card-kicker">Perspectives</p>
            <h2>{featured.title}</h2>
            <p>{featured.standfirst}</p>
            <span className="pg-card-go">Read &amp; discuss →</span>
          </Link>
        ) : null}

        <Link className="pg-card" href="/playground/situations">
          <p className="pg-card-kicker">The Situations Game</p>
          <h2>What would the school say?</h2>
          <p>
            {situations.length} everyday situations, each with the response the
            tradition would give — then argue it out with the corpus.
          </p>
          <span className="pg-card-go">Play →</span>
        </Link>

        <Link className="pg-card" href="/playground/happiness-scale">
          <p className="pg-card-kicker">The Scale of Happiness</p>
          <h2>Κλίμακα Εὐδαιμονίας</h2>
          <p>
            Locate yourself from Ataraxia to Epithumia, read the zones, and see
            where the philosophers land — then pressure-test your own.
          </p>
          <span className="pg-card-go">Find your zone →</span>
        </Link>

        <Link className="pg-card" href="/playground/kosmopolis">
          <p className="pg-card-kicker">Kosmopolis</p>
          <h2>A world built for virtue</h2>
          <p>
            A living simulation where the physics reward virtue. Seed souls, watch
            them evolve, and spend the Oracle to awaken one to reason.
          </p>
          <span className="pg-card-go">Enter →</span>
        </Link>

        <Link className="pg-card" href="/playground/view-from-above">
          <p className="pg-card-kicker">The View from Above</p>
          <h2>All of time, in one frame</h2>
          <p>
            Compress the universe into a year, the Earth into a day, our species
            into an hour — then set the hand to your own age and see how brief,
            and how astonishing, your place in it is.
          </p>
          <span className="pg-card-go">Rise above →</span>
        </Link>

        <Link className="pg-card" href="/playground/the-long-filter">
          <p className="pg-card-kicker">The Long Filter</p>
          <h2>Why the sky is quiet</h2>
          <p>
            A civilization that can end itself eventually will. Drag the risk and
            the years, split the Drake equation in two, and find the filter that
            predicts a crowded galaxy — and still explains the silence.
          </p>
          <span className="pg-card-go">Run the odds →</span>
        </Link>

        <div className="pg-card pg-card-soon" aria-disabled="true">
          <p className="pg-card-kicker">Coming soon</p>
          <h2>More experiments</h2>
          <p>New ways to pressure-test the doctrine are on the bench.</p>
          <span className="pg-card-go">In progress</span>
        </div>
      </div>
    </main>
  );
}
