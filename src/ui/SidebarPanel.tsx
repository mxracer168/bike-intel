'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { isCurrent, navigation } from '@/content/navigation'
import type { SyncStatus } from '@/features/context/types'
import { signOutAction } from '@/server/actions/auth'
import styles from './AppShell.module.css'

export type ShellRetailer = { name: string; locationCount: number }
export type ShellAccount = { email: string }

function initials(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : text.trim().slice(0, 2)
  return letters.toUpperCase() || '··'
}

/** Sidebar content, shared by the desktop sidebar and the phone panel. */
export function SidebarPanel({
  retailer, account, sync, logo, inDrawer = false,
}: { retailer: ShellRetailer; account: ShellAccount; sync?: SyncStatus; logo: ReactNode; inDrawer?: boolean }) {
  const pathname = usePathname()
  return (
    <div className={styles.panel}>
      {!inDrawer && <div className={styles.panelHead}>{logo}</div>}

      <nav className={styles.nav} aria-label="Primary">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.navLink}
            aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        {/* The business being worked in. Switching arrives with retailer switching. */}
        <section aria-label="Current retailer" className={styles.retailer}>
          <span className={styles.retailerName}>{retailer.name}</span>
          <span className={styles.retailerMeta}>
            {retailer.locationCount === 1 ? '1 location' : `${retailer.locationCount} locations`}
          </span>
          {sync?.state === 'ok' && <span className={styles.retailerMeta}>{sync.label}</span>}
          {sync?.state === 'attention' && (
            sync.href
              ? <Link href={sync.href} className={styles.syncAttention}>{sync.label}</Link>
              : <span className={styles.syncAttention}>{sync.label}</span>
          )}
        </section>

        {/* The person's own account, kept separate from the business. */}
        <details className={styles.account}>
          <summary aria-label={`Your account: ${account.email}`}>
            <span className={styles.avatar} aria-hidden="true">{initials(account.email.split('@')[0] ?? '')}</span>
            <span className={styles.email}>{account.email}</span>
          </summary>
          <div className={styles.menu}>
            <form action={signOutAction}>
              <button type="submit" className={styles.menuItem}>Sign out</button>
            </form>
          </div>
        </details>
      </div>
    </div>
  )
}
