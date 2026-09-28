import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Site-wide defaults only. A page that sets no openGraph inherits this block
// whole, so a title, description or url here would make every page share as
// the home page; the landing page sets its own in page.tsx. The share image
// comes from the opengraph-image and twitter-image files in this folder
// (source and render command in og/), which every route inherits.
export const metadata: Metadata = {
  metadataBase: new URL('https://academy.pursuearete.com'),
  title: 'Arete Academy · A Complete Formation in Stoic Philosophy',
  description: 'The world\'s first AI-proctored school of Stoic philosophy.',
  openGraph: { type: 'website', siteName: 'Arete Academy' },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="bg-navy text-cream min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
