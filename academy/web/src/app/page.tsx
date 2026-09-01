import Link from 'next/link'

const CURRICULUM = [
  { code: 'PHIL 701', title: 'The Art of Living — Foundations',                 year: 'Year I'   },
  { code: 'PHIL 702', title: 'Living the Practice — Marcus Aurelius',            year: 'Year II'  },
  { code: 'PHIL 703', title: 'The School of Epictetus',                          year: 'Year III' },
  { code: 'PHIL 704', title: 'The Examined Correspondence — Seneca',             year: 'Year IV'  },
  { code: 'PHIL 705', title: 'The Logic of Clear Seeing',                        year: 'Year V'   },
]

const AGENTS = [
  { name: 'The Socratic Proctor',     role: 'Seminar facilitator. Asks the questions you avoid.' },
  { name: 'The Historian',            role: 'Classical context. Rome, Athens, the Stoa.' },
  { name: 'The Translator',           role: 'Original Greek and Latin. Nothing lost.' },
  { name: 'The Devil\'s Advocate',   role: 'Challenges every assumption you hold.' },
  { name: 'The Writing Supervisor',   role: 'Evaluates philosophical argument. Rigorous, honest, no flattery.' },
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
      <nav className="border-b border-navy-border px-4 sm:px-8 py-5 flex items-center justify-between gap-3">
        <div className="whitespace-nowrap">
          <span className="font-serif text-gold text-lg sm:text-xl tracking-[0.2em] uppercase">Arete</span>
          <span className="hidden sm:inline text-gold/40 mx-3">|</span>
          <span className="hidden sm:inline font-serif text-cream/60 text-sm tracking-[0.15em] uppercase">Academy</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/library" className="text-cream/50 text-xs sm:text-sm hover:text-gold transition-colors tracking-wider whitespace-nowrap">
            The Library
          </Link>
          <Link href="/login" className="text-cream/50 text-xs sm:text-sm hover:text-gold transition-colors tracking-wider whitespace-nowrap">
            Sign In
          </Link>
          <Link href="/waitlist" className="btn-primary text-xs whitespace-nowrap">
            Apply
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 md:py-44">
        <div className="gold-rule mb-10" />

        <p className="font-serif text-gold/70 text-sm tracking-[0.3em] uppercase mb-6">
          Stoic Philosophy · Techne
        </p>

        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-cream leading-tight max-w-4xl mb-6">
          The Art of Living
        </h1>

        <div className="gold-rule my-8" />

        <p className="text-cream/70 text-lg md:text-xl max-w-2xl leading-relaxed mb-4 font-light">
          Arete is not a feeling. It is a skill.
        </p>
        <p className="text-cream/40 text-sm max-w-xl leading-relaxed mb-14">
          The Stoics compared virtue to a craft — techne. A carpenter masters wood through practice and knowledge. A philosopher masters living the same way. Arete Academy is where that training happens.
        </p>

        <Link href="/waitlist" className="btn-primary">
          Begin Your Formation
        </Link>
      </section>

      {/* Three Columns */}
      <section className="border-t border-navy-border px-6 py-20 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-0 md:divide-x divide-navy-border">

          {/* Column 1: Curriculum */}
          <div className="px-6 md:px-10 pb-12 md:pb-0">
            <p className="font-serif text-gold text-xs tracking-[0.3em] uppercase mb-2">I.</p>
            <h2 className="font-serif text-2xl text-cream mb-6">The Formation</h2>
            <p className="text-cream/40 text-sm leading-relaxed mb-8">
              Four years of practice, not study. Each course is structured around transformation — not the accumulation of knowledge but the development of character.
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
            <Link
              href="/library"
              className="inline-block mt-8 text-gold/80 text-xs tracking-widest uppercase hover:text-gold transition-colors"
            >
              Browse the Library &rarr;
            </Link>
          </div>

        </div>
      </section>

      {/* Study the Originals */}
      <section className="border-t border-navy-border px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-serif text-gold/70 text-xs tracking-[0.3em] uppercase mb-3">IV.</p>
          <h2 className="font-serif text-3xl md:text-4xl text-cream mb-4">Study the Originals</h2>
          <p className="text-cream/40 text-sm max-w-xl mx-auto leading-relaxed">
            Most Stoicism courses hand you a translation and call it philosophy.
            Arete Academy goes further.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Ancient Greek */}
          <div className="border-t-2 border-gold bg-navy-card rounded-lg p-8">
            <div className="text-gold font-serif text-3xl mb-4 leading-none">Α</div>
            <h3 className="font-serif text-xl text-cream mb-3">Ancient Greek</h3>
            <p className="text-cream/50 text-sm leading-relaxed mb-6">
              Chrysippus wrote in Greek. Epictetus lectured in Greek. The Discourses you read are
              already one step removed. GREK 101 begins in Year 1 alongside your philosophy
              courses — building toward the ability to read primary Stoic texts in the original.
            </p>
            <span className="inline-block text-gold/80 text-xs tracking-widest uppercase border border-gold/40 rounded-full px-3 py-1">
              Coming — Year 1
            </span>
          </div>

          {/* Latin */}
          <div className="border-t-2 border-gold bg-navy-card rounded-lg p-8">
            <div className="text-gold font-serif text-3xl mb-4 leading-none">I·II·III</div>
            <h3 className="font-serif text-xl text-cream mb-3">Latin</h3>
            <p className="text-cream/50 text-sm leading-relaxed mb-6">
              Marcus Aurelius wrote the Meditations in Greek, but Seneca wrote in Latin — and
              Latin shaped the entire transmission of Stoic ideas into the Western tradition.
              LATN 101 runs parallel to GREK 101, giving you access to Seneca, Cicero, and the
              Roman Stoics on their own terms.
            </p>
            <span className="inline-block text-gold/80 text-xs tracking-widest uppercase border border-gold/40 rounded-full px-3 py-1">
              Coming — Year 1
            </span>
          </div>

          {/* Stoic Logic */}
          <div className="border-t-2 border-gold bg-navy-card rounded-lg p-8">
            <div className="text-gold font-serif text-3xl mb-4 leading-none">⊢</div>
            <h3 className="font-serif text-xl text-cream mb-3">Stoic Logic</h3>
            <p className="text-cream/50 text-sm leading-relaxed mb-6">
              The Stoics built the first complete propositional logic system — 300 years before
              Frege. PHIL 705 covers Chrysippus&rsquo;s five indemonstrable argument forms, the
              Stoic theory of the lekton, and the logic of impressions and assent. Most Stoicism
              courses skip this entirely. We don&rsquo;t.
            </p>
            <span className="inline-block text-gold/80 text-xs tracking-widest uppercase border border-gold/40 rounded-full px-3 py-1">
              PHIL 705 — Year 2
            </span>
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
          Tell us why you want to study Stoicism.
        </p>
        <Link href="/waitlist" className="btn-primary">
          Begin Your Formation
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-border px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-cream/30 text-xs tracking-widest uppercase">
        <span className="font-serif text-gold/50 text-sm tracking-[0.2em]">Arete Academy</span>
        <Link href="/library" className="hover:text-gold transition-colors">
          The Library
        </Link>
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
