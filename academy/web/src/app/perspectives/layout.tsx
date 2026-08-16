import type { Metadata } from 'next';
import { Fraunces, Newsreader, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

/**
 * The four families for Perspectives, loaded once for this route segment and
 * exposed as CSS variables that perspectives.css reads (--font-fraunces, etc.).
 * The typographic split is the argument in miniature: one man wrote (Newsreader),
 * the other was recorded (IBM Plex Mono).
 */

// Display. The WONK/SOFT/opsz axes are used directly in perspectives.css, so
// they must be requested here beyond the default weight axis.
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

// The notebook: a reading serif, because the father composed his words.
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

// The tapes: transcript type, because a machine captured his.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-plex-mono',
  display: 'swap',
});

// Dates, refs, labels: utility only.
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Perspectives — Arete Academy',
  description:
    'Socratic intellectualism read through paired first-person documents rather than exposition.',
};

export default function PerspectivesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${newsreader.variable} ${plexMono.variable} ${plexSans.variable}`}
    >
      {children}
    </div>
  );
}
