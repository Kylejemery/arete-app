import { Spectral } from 'next/font/google';

/**
 * The Passage is printed on the same plate as The Long Filter and set in the
 * same body face, so the pair reads as one pair of working notes. Fraunces and
 * IBM Plex Mono come down from app/playground/layout.tsx; this segment adds
 * Spectral so the other experiments do not pay to load it.
 */
const spectral = Spectral({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['300', '400', '600'],
  variable: '--font-spectral',
  display: 'swap',
});

export default function ThePassageLayout({ children }: { children: React.ReactNode }) {
  return <div className={spectral.variable}>{children}</div>;
}
