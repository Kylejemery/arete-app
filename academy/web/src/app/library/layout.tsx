import type { Metadata } from 'next';
import { Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';

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

export const metadata: Metadata = {
  title: 'The Library of Arete — a living philosophical library',
  description:
    'Wander a living library of the Stoic tradition: read every primary text in full, sit with a master, and watch the corpus argue with itself.',
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${cormorant.variable} ${jetbrains.variable}`}
      style={{ minHeight: '100vh', background: '#0a1020' }}
    >
      {children}
    </div>
  );
}
