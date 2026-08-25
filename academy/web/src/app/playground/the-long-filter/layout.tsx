import { Spectral } from 'next/font/google';

/**
 * The Long Filter is set on a pale plate rather than the Playground's tape, and
 * its body face is Spectral. Fraunces and IBM Plex Mono already come down from
 * the Playground layout; this segment adds the one family the note needs, so
 * the other experiments do not pay to load it.
 */
const spectral = Spectral({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['300', '400', '600'],
  variable: '--font-spectral',
  display: 'swap',
});

export default function LongFilterLayout({ children }: { children: React.ReactNode }) {
  return <div className={spectral.variable}>{children}</div>;
}
