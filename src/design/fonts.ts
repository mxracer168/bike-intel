import { Hanken_Grotesk } from 'next/font/google'

// Self-hosted at build time by next/font: no runtime request to Google.
export const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-hanken',
})
