import './globals.css'
import Providers from './providers'
import { IBM_Plex_Mono, Space_Grotesk, Cormorant_Garamond } from 'next/font/google'

const ibmMono = IBM_Plex_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-mono',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
})

export const metadata = {
  title: 'Blkuzz — Member Portal',
  description: 'The private creative community for UK artists, musicians, filmmakers, and makers.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${ibmMono.variable} ${spaceGrotesk.variable} ${cormorant.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
