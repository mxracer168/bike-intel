import localFont from 'next/font/local'

/*
 * Inter (SIL Open Font License), latin subset, variable 400–600, committed
 * to the repository so builds never depend on reaching Google Fonts. Served
 * from our own origin by next/font.
 */
export const inter = localFont({
  src: [{ path: './fonts/inter-latin-var.woff2', weight: '400 600', style: 'normal' }],
  display: 'swap',
  variable: '--font-inter',
})
