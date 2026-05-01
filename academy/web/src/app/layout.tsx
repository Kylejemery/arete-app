import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arete Academy — PhD in Stoic Philosophy',
  description: 'AI-proctored graduate philosophy education. Study like your life depends on it.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-academy-bg text-academy-text min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
