import type { Metadata, Viewport } from 'next'
import { hankenGrotesk } from '@/design/fonts'
import { productName } from '@/content/product'
import '@/design/tokens.css'
import '@/design/base.css'

export const metadata: Metadata = {
  title: { default: productName, template: `%s · ${productName}` },
  description: 'Clear buying recommendations for independent retailers.',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={hankenGrotesk.variable}>
      <body>{children}</body>
    </html>
  )
}
