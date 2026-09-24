'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isCurrent, type NavItem } from '@/content/navigation'
import styles from './Tabs.module.css'

/** Quiet in-page tabs for a page's sub-pages. Not a second sidebar. */
export function Tabs({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav className={styles.tabs} aria-label={label}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} className={styles.tab} aria-current={isCurrent(pathname, t.href) ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
