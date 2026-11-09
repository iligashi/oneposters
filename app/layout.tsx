import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'oneposters — Make your space speak',
  description: 'Poster-sized ideas for walls with something to say. Curated, printed and shipped from our studio.',
  metadataBase: new URL('https://oneposters.studio'),
  generator: 'v0.app',
  openGraph: { title: 'oneposters — Make your space speak', description: 'Poster-sized ideas for walls with something to say.', images: ['/og-image.svg'] },
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F5EFE6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

