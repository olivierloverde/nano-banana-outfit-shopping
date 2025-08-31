import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Outfit AI - Discover and Shop Fashion',
  description: 'Browse model outfits, convert to flat lay, and shop for individual pieces with AI-powered fashion discovery.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#000000',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} antialiased bg-white text-gray-900`}>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}