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
import { useSidebar } from './ShellFrame'
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
 *
 * The desktop sidebar (`collapsible`) can collapse to an icon rail: labels
 * stay in the accessible names and show as tooltips, and a sync problem
 * still shows as a dot.
 */
export function SidebarPanel({
  retailer, account, sync, collapsible = false,
}: { retailer: ShellRetailer; account: ShellAccount; sync?: SyncStatus; collapsible?: boolean }) {
  const pathname = usePathname()
  const sidebar = useSidebar()
  const rail = collapsible && sidebar.collapsed
  return (
    <div className={styles.panel}>
      <AmbientNetwork />
      <div className={styles.brandRow}>
        <Link href="/today" className={styles.brand} title={rail ? `${productName} · ${retailer.name}` : undefined}>
          <span className={styles.brandTile} aria-hidden="true"><NavIcon name="brand" size={22} /></span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>{productName}</span>
            <span className={styles.brandRetailer}>{retailer.name}</span>
          </span>
        </Link>
        {collapsible && (
          <button type="button" className={styles.collapse} onClick={sidebar.toggle}
            aria-label={rail ? 'Expand navigation' : 'Collapse navigation'} title={rail ? 'Expand navigation' : 'Collapse navigation'}>
            <Icon name={rail ? 'chevron-right' : 'chevron-left'} size={16} />
          </button>
        )}
      </div>

      <nav className={styles.nav} aria-label="Primary">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.navLink}
            aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
            title={rail ? item.label : undefined}
          >
            {item.icon && <NavIcon name={item.icon} />}
            <span className={styles.navLabel}>{item.label}</span>
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
        {rail && sync?.state === 'attention' && (
          sync.href
            ? <Link href={sync.href} className={styles.syncDot} title={sync.label} aria-label={sync.label} />
            : <span className={styles.syncDot} title={sync.label} role="img" aria-label={sync.label} />
        )}

        {/* The person's own account, kept separate from the business. */}
        <details className={styles.account}>
          <summary aria-label={`Your account: ${account.email}`} title={rail ? account.email : undefined}>
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
