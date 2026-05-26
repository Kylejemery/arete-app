import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import ConstellationBg from '@/components/ConstellationBg';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Arete — Personal Excellence',
  description: 'Be who you want to be. Your Cabinet of Invisible Counselors awaits.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full ${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="h-full overflow-hidden">
        <ConstellationBg />
        <Sidebar />
        {/* Desktop: offset for 220px sidebar. Mobile: pb-24 clears the floating pill nav.
            h-full + overflow-y-auto is the scroll container; chat pages rely on this
            bounded height to make flex-1 work correctly. */}
        <main className="md:ml-[220px] pb-24 md:pb-0 h-full overflow-y-auto relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
