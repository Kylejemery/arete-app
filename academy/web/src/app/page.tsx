import Link from 'next/link'

const CURRICULUM = [
  { code: 'PHIL 701', title: 'The Meditations of Marcus Aurelius',     year: 'Year I'   },
  { code: 'PHIL 702', title: 'Epictetus: Discourses & Enchiridion',    year: 'Year II'  },
  { code: 'PHIL 703', title: 'Seneca: Letters, Essays & Tragedies',    year: 'Year III' },
  { code: 'PHIL 704', title: 'The Early Stoics: Zeno to Chrysippus',   year: 'Year IV'  },
  { code: 'PHIL 705', title: 'Stoic Synthesis: Dissertation & Defense',year: 'Year V'   },
]

const AGENTS = [
  { name: 'The Socratic Proctor',     role: 'Seminar facilitator. Asks the questions you avoid.' },
  { name: 'The Historian',            role: 'Classical context. Rome, Athens, the Stoa.' },
  { name: 'The Translator',           role: 'Original Greek and Latin. Nothing lost.' },
  { name: 'The Devil\'s Advocate',   role: 'Challenges every assumption you hold.' },
  { name: 'The Dissertation Advisor', role: 'Long-form guidance on scholarly argument.' },
  { name: 'The Librarian',            role: 'Navigates 800,000 words of primary corpus.' },
]

const CORPUS = [
  { author: 'Marcus Aurelius', works: 'Meditations (complete)' },
  { author: 'Epictetus',       works: 'Discourses, Enchiridion, Fragments' },
  { author: 'Seneca',          works: 'Letters, Moral Essays, Tragedies' },
  { author: 'Cicero',          works: 'De Finibus, Tusculan Disputations' },
  { author: 'Diogenes Laërtius', works: 'Lives of the Eminent Philosophers' },
  { author: 'Musonius Rufus',  works: 'Lectures & Fragments' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy">

      {/* Nav */}
      <nav className="border-b border-navy-border px-8 py-5 flex items-center justify-between">
        <div>
          <span className="font-serif text-gold text-xl tracking-[0.2em] uppercase">Arete</span>
          <span className="text-gold/40 mx-3">|</span>
          <span className="font-serif text-cream/60 text-sm tracking-[0.15em] uppercase">Academy</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-cream/50 text-sm hover:text-gold transition-colors tracking-wider">
            Sign In
          </Link>
          <Link href="/waitlist" className="btn-primary text-xs">
            Apply
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 md:py-44">
        <div className="gold-rule mb-10" />

        <p className="font-serif text-gold/70 text-sm tracking-[0.3em] uppercase mb-6">
          Seneca · Epistulae Morales
        </p>

        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-cream leading-tight max-w-4xl mb-6">
          &ldquo;Learn Like a Spy<br className="hidden md:block" /> in the Enemy Camp&rdquo;
        </h1>

        <div className="gold-rule my-8" />

        <p className="text-cream/70 text-lg md:text-xl max-w-2xl leading-relaxed mb-4 font-light">
          The world&rsquo;s first AI-proctored doctoral program
          in Stoic Philosophy.
        </p>
        <p className="text-cream/40 text-sm max-w-xl leading-relaxed mb-14">
          Five years. Six AI specialists. 800,000 words of primary text.
          A genuine education in the philosophy that built empires.
        </p>

        <Link href="/waitlist" className="btn-primary">
          Apply for Early Access
        </Link>
      </section>

      {/* Three Columns */}
      <section className="border-t border-navy-border px-6 py-20 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-0 md:divide-x divide-navy-border">

          {/* Column 1: Curriculum */}
          <div className="px-6 md:px-10 pb-12 md:pb-0">
            <p className="font-serif text-gold text-xs tracking-[0.3em] uppercase mb-2">I.</p>
            <h2 className="font-serif text-2xl text-cream mb-6">The Curriculum</h2>
            <p className="text-cream/40 text-sm leading-relaxed mb-8">
              A structured five-year PhD modelled on classical doctoral programs.
              Each course builds on the last.
            </p>
            <ul className="space-y-5">
              {CURRICULUM.map((c) => (
                <li key={c.code} className="flex gap-4">
                  <div className="shrink-0 pt-0.5">
                    <span className="text-gold/40 text-xs font-mono">{c.year}</span>
                  </div>
                  <div>
                    <p className="text-gold text-xs tracking-widest uppercase">{c.code}</p>
                    <p className="text-cream/70 text-sm mt-0.5">{c.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Agents */}
          <div className="px-6 md:px-10 py-12 md:py-0 border-t border-b md:border-0 border-navy-border">
            <p className="font-serif text-gold text-xs tracking-[0.3em] uppercase mb-2">II.</p>
            <h2 className="font-serif text-2xl text-cream mb-6">The Agents</h2>
            <p className="text-cream/40 text-sm leading-relaxed mb-8">
              Six AI specialists attend every seminar. Each one
              trained on a different function of the ancient academy.
            </p>
            <ul className="space-y-5">
              {AGENTS.map((a) => (
                <li key={a.name}>
                  <p className="text-cream/80 text-sm font-medium">{a.name}</p>
                  <p className="text-cream/40 text-xs mt-0.5 leading-relaxed">{a.role}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Corpus */}
          <div className="px-6 md:px-10 pt-12 md:pt-0">
            <p className="font-serif text-gold text-xs tracking-[0.3em] uppercase mb-2">III.</p>
            <h2 className="font-serif text-2xl text-cream mb-6">The Corpus</h2>
            <p className="text-cream/40 text-sm leading-relaxed mb-8">
              Every seminar is grounded in primary texts. No secondary
              summaries. No paraphrases. The originals, in full.
            </p>
            <ul className="space-y-5">
              {CORPUS.map((c) => (
                <li key={c.author}>
                  <p className="text-cream/80 text-sm font-medium">{c.author}</p>
                  <p className="text-cream/40 text-xs mt-0.5">{c.works}</p>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-navy-border text-center px-6 py-24">
        <div className="gold-rule mb-10" />
        <h2 className="font-serif text-3xl md:text-4xl text-cream mb-4">
          The first cohort is forming now.
        </h2>
        <p className="text-cream/40 text-sm mb-10 max-w-md mx-auto">
          Applications are reviewed manually. Tell us why you want to study Stoicism.
        </p>
        <Link href="/waitlist" className="btn-primary">
          Apply for Early Access
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-border px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-cream/30 text-xs tracking-widest uppercase">
        <span className="font-serif text-gold/50 text-sm tracking-[0.2em]">Arete Academy</span>
        <a
          href="https://pursuearete.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gold transition-colors"
        >
          pursuearete.com
        </a>
        <span>&copy; {new Date().getFullYear()} Arete</span>
      </footer>

    </div>
  )
}
