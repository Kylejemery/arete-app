import { Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';

// Share pages for single Observatory pieces. Same house type as the Library
// so a shared tension or dream reads as the thing itself, not a stub.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export default function ObservatoryShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${cormorant.variable} ${jetbrains.variable}`}
      style={{ minHeight: '100vh', background: '#0a1020' }}
    >
      {children}
    </div>
  );
}
