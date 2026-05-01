import Link from 'next/link';
import { AGENTS } from '@/lib/agents';

const TIERS = [
  {
    id: 'auditor',
    name: 'Auditor',
    price: '$19',
    description: 'Begin your studies. Access the core seminar and primary texts.',
    features: [
      'PHIL 701: Introduction to Stoicism',
      'Socratic Proctor access',
      'RAG-powered text retrieval',
      'Unlimited seminar sessions',
      'Paper drafting',
    ],
    cta: 'Start Auditing Free',
    href: '/signup',
    featured: false,
  },
  {
    id: 'scholar',
    name: 'Scholar',
    price: '$39',
    description: 'Full curriculum access with three specialized agents.',
    features: [
      'All Auditor features',
      'Full course catalog (4 courses)',
      'The Archivist agent',
      'The Examiner agent',
      'Paper submission & grading',
      'Library corpus browser',
    ],
    cta: 'Enroll as Scholar',
    href: '/signup',
    featured: true,
  },
  {
    id: 'fellow',
    name: 'Fellow',
    price: '$79',
    description: 'The complete doctoral experience. All six agents. Priority access.',
    features: [
      'All Scholar features',
      'All six agents',
      'The Dialectician',
      'The Rhetorician',
      'The Chronologist',
      'Priority response time',
    ],
    cta: 'Become a Fellow',
    href: '/signup',
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-academy-bg">
      {/* Nav */}
      <nav className="border-b border-academy-border px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <p className="text-academy-muted text-xs tracking-[0.3em] uppercase leading-none">Arete</p>
          <h1 className="font-serif text-academy-gold text-xl tracking-wide leading-tight">Academy</h1>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-academy-muted text-sm hover:text-academy-text transition-colors">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="bg-academy-gold text-academy-bg text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <p className="text-academy-gold text-xs tracking-[0.4em] uppercase mb-6">
          PhD in Stoic Philosophy
        </p>
        <h2 className="font-serif text-6xl md:text-7xl text-academy-text leading-tight mb-6">
          Study Philosophy Like<br />
          <span className="text-academy-gold italic">Your Life Depends On It</span>
        </h2>
        <p className="text-academy-muted text-lg italic mb-10 leading-relaxed">
          &ldquo;Learn like a spy in the enemy camp.&rdquo;<br />
          <span className="text-sm not-italic">— Seneca, <em>Letters to Lucilius</em></span>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-academy-gold text-academy-bg font-semibold px-8 py-4 rounded-lg text-base hover:opacity-90 transition-opacity"
          >
            Start Auditing Free — 14 Days
          </Link>
          <Link
            href="#program"
            className="border border-academy-border text-academy-muted px-8 py-4 rounded-lg text-base hover:border-academy-gold hover:text-academy-text transition-all"
          >
            Learn About the Program
          </Link>
        </div>
      </section>

      {/* Divider quote */}
      <div className="border-y border-academy-border py-10 px-6">
        <p className="text-center text-academy-muted text-sm italic max-w-2xl mx-auto leading-relaxed">
          &ldquo;Retire into yourself as much as you can. Associate with people who are likely to improve you.
          Welcome those who you are capable of improving. The process is mutual.&rdquo;
        </p>
        <p className="text-center text-academy-gold text-xs mt-3">— Seneca</p>
      </div>

      {/* Program description */}
      <section id="program" className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-academy-gold text-xs tracking-[0.3em] uppercase mb-3">The Program</p>
            <h3 className="font-serif text-4xl text-academy-text mb-5 leading-tight">
              A Rigorous Curriculum.<br />No Softening.
            </h3>
            <p className="text-academy-muted text-sm leading-relaxed mb-4">
              Arete Academy offers the world&apos;s first AI-proctored doctoral curriculum in Stoic Philosophy.
              Every session is a Socratic seminar — your AI proctors do not lecture, explain, or reassure.
              They question.
            </p>
            <p className="text-academy-muted text-sm leading-relaxed">
              The program runs four courses, each built around primary texts. You read Marcus Aurelius,
              Epictetus, and Seneca in depth — not summaries. You write papers. You defend positions.
              You are examined.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { code: 'PHIL 701', title: 'Introduction to Stoic Philosophy', term: 'Core' },
              { code: 'PHIL 702', title: 'The Meditations of Marcus Aurelius', term: 'Year 1' },
              { code: 'PHIL 703', title: 'Epictetus and the Discipline of Desire', term: 'Year 1' },
              { code: 'PHIL 704', title: "Seneca's Letters and the Art of Dying Well", term: 'Year 2' },
            ].map(course => (
              <div key={course.code} className="bg-academy-card border border-academy-border rounded-lg px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-academy-gold text-xs font-semibold tracking-wider">{course.code}</span>
                  <span className="text-academy-muted text-xs">{course.term}</span>
                </div>
                <p className="text-academy-text text-sm font-medium">{course.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="bg-academy-surface border-y border-academy-border py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-academy-gold text-xs tracking-[0.3em] uppercase mb-3 text-center">Your Faculty</p>
          <h3 className="font-serif text-4xl text-academy-text mb-3 text-center">Six Specialized Agents</h3>
          <p className="text-academy-muted text-sm text-center mb-12 max-w-xl mx-auto">
            Each agent is built for a specific pedagogical function. They are not assistants.
            They are examiners.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {AGENTS.map(agent => (
              <div key={agent.id} className="bg-academy-card border border-academy-border rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{agent.emoji}</span>
                  <div>
                    <p className="text-academy-text font-semibold text-sm">{agent.name}</p>
                    <p className="text-academy-gold text-xs">{agent.role}</p>
                  </div>
                </div>
                <p className="text-academy-muted text-xs leading-relaxed">{agent.description}</p>
                <div className="mt-3 pt-3 border-t border-academy-border">
                  <span className="text-xs text-academy-muted">
                    Available to:{' '}
                    <span className="text-academy-text capitalize">{agent.minTier}s</span> and above
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-academy-gold text-xs tracking-[0.3em] uppercase mb-3 text-center">Tuition</p>
        <h3 className="font-serif text-4xl text-academy-text mb-3 text-center">Choose Your Standing</h3>
        <p className="text-academy-muted text-sm text-center mb-12">
          14-day free trial on all plans. Cancel anytime.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map(tier => (
            <div
              key={tier.id}
              className={`rounded-xl border p-7 flex flex-col ${
                tier.featured
                  ? 'border-academy-gold bg-academy-card'
                  : 'border-academy-border bg-academy-surface'
              }`}
            >
              {tier.featured && (
                <p className="text-academy-gold text-xs tracking-widest uppercase mb-3">Most Popular</p>
              )}
              <h4 className="font-serif text-2xl text-academy-text mb-1">{tier.name}</h4>
              <div className="mb-4">
                <span className="text-4xl font-bold text-academy-gold">{tier.price}</span>
                <span className="text-academy-muted text-sm">/month</span>
              </div>
              <p className="text-academy-muted text-sm mb-6 leading-relaxed">{tier.description}</p>
              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-academy-muted">
                    <span className="text-academy-gold mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`block text-center font-semibold py-3 rounded-lg transition-opacity hover:opacity-90 ${
                  tier.featured
                    ? 'bg-academy-gold text-academy-bg'
                    : 'border border-academy-border text-academy-text hover:border-academy-gold'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-academy-border px-6 py-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-serif text-academy-gold text-lg">Arete Academy</p>
            <p className="text-academy-muted text-xs mt-1">A division of Arete</p>
          </div>
          <div className="flex gap-6 text-xs text-academy-muted">
            <Link href="/login" className="hover:text-academy-text transition-colors">Sign In</Link>
            <a href="https://areteapp.com" className="hover:text-academy-text transition-colors">Arete App</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
