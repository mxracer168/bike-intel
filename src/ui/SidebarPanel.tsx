'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isCurrent, navigation } from '@/content/navigation'
import type { SyncStatus } from '@/features/intelligence/types'
import { signOutAction } from '@/server/actions/auth'
import { productName } from '@/content/product'
import { AmbientNetwork } from './AmbientNetwork'
import { Icon } from './Icon'
import { NavIcon } from './NavIcon'
import styles from './AppShell.module.css'

export type ShellRetailer = { name: string; locationCount: number }
export type ShellAccount = { email: string }

function initials(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : text.trim().slice(0, 2)
  return letters.toUpperCase() || '··'
}

/**
 * Sidebar content, shared by the desktop sidebar and the phone panel: the
 * product and the retailer being worked in, navigation, the business's
 * status, and the person's own account. Dark navy, with a quiet network in
 * the lower left.
 */
export function SidebarPanel({
  retailer, account, sync,
}: { retailer: ShellRetailer; account: ShellAccount; sync?: SyncStatus }) {
  const pathname = usePathname()
  return (
    <div className={styles.panel}>
      <AmbientNetwork />
      <Link href="/today" className={styles.brand}>
        <span className={styles.brandTile} aria-hidden="true"><NavIcon name="brand" size={22} /></span>
        <span className={styles.brandText}>
          <span className={styles.brandName}>{productName}</span>
          <span className={styles.brandRetailer}>{retailer.name}</span>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Primary">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.navLink}
            aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
          >
            {item.icon && <NavIcon name={item.icon} />}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        {/* The business being worked in (named under the product above). Switching arrives with retailer switching. */}
        <section aria-label={`Current retailer: ${retailer.name}`} className={styles.retailer}>
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
            <span className={styles.accountCaret}><Icon name="chevron-down" size={14} /></span>
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
