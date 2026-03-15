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
    <html lang="en">
      <body className="bg-arete-bg text-arete-text min-h-screen">
        <Sidebar />
        {/* Desktop: offset for sidebar width. Mobile: offset for bottom nav. */}
        <main className="md:ml-56 pb-24 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
