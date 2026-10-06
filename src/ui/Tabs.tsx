'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isCurrent, type NavItem } from '@/content/navigation'
import styles from './Tabs.module.css'

/**
 * Quiet in-page tabs for a page's sub-pages. Not a second sidebar. When one
 * tab's path contains another's (/inventory and /inventory/excess), the most
 * specific match is the current one.
 */
export function Tabs({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname()
  const current = items
    .filter((t) => isCurrent(pathname, t.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
  return (
    <nav className={styles.tabs} aria-label={label}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} className={styles.tab} aria-current={t.href === current ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
