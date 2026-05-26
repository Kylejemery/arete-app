import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Arete — Personal Excellence',
  description: 'Be who you want to be. Your Cabinet of Invisible Counselors awaits.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-arete-bg text-arete-text overflow-hidden">
        <Sidebar />
        {/* Desktop: offset for sidebar width. Mobile: offset for bottom nav.
            h-full + overflow-y-auto makes this the scroll container for all pages,
            which lets chat pages use flex-1 without escaping the viewport. */}
        <main className="md:ml-56 pb-24 md:pb-0 h-full overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
