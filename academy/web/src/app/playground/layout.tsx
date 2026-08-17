import type { Metadata } from 'next';
import { Fraunces, Newsreader, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './playground.css';

/**
 * The Arete AI Playground — a place to test ideas against the corpus.
 *
 * It borrows the four type families from Perspectives so an essay dropped into
 * the playground reads the same, and adds the discussion board on top. The
 * fonts are exposed as CSS variables (--font-fraunces, etc.) that both
 * playground.css and perspectives.css read.
 */

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Playground — Arete Academy',
  description:
    'An experimental workshop for testing ideas against the corpus — perspective essays, the situations game, and an open line to the tradition.',
};

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${newsreader.variable} ${plexMono.variable} ${plexSans.variable}`}
    >
      {children}
    </div>
  );
}
