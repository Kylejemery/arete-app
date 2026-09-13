import { Playfair_Display } from 'next/font/google';

// The Agora reads in the academy idiom: navy ground, Playfair Display
// titles. The font is loaded here rather than in the root layout so the
// rest of the web app keeps its Cormorant Garamond.
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif-academy',
  display: 'swap',
});

export default function AgoraLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={playfair.variable} style={{ minHeight: '100%', background: '#0a1628', color: '#f5edd6' }}>
      {children}
    </div>
  );
}
