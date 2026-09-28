import Link from 'next/link'

// Research pages are public working papers. The page files are dropped in as
// packages from outside the repo, so the site chrome lives here, not in them.
export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy">
      <nav className="border-b border-navy-border px-4 sm:px-8 py-5 flex items-center justify-between gap-3">
        <Link href="/" className="whitespace-nowrap">
          <span className="font-serif text-gold text-lg sm:text-xl tracking-[0.2em] uppercase">Arete</span>
          <span className="hidden sm:inline text-gold/40 mx-3">|</span>
          <span className="hidden sm:inline font-serif text-cream/60 text-sm tracking-[0.15em] uppercase">Academy</span>
        </Link>
        <Link href="/library" className="text-cream/50 text-xs sm:text-sm hover:text-gold transition-colors tracking-wider whitespace-nowrap">
          The Library
        </Link>
      </nav>
      {children}
    </div>
  )
}
