'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { primaryNavigation } from '@/content/product'
import styles from './AppShell.module.css'

export function PrimaryNav() {
  const pathname = usePathname()
  return (
    <nav className={styles.nav} aria-label="Primary">
      {primaryNavigation.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link key={item.href} href={item.href} className={styles.navLink} aria-current={current ? 'page' : undefined}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
