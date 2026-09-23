import Link from 'next/link'
import type { ReactNode } from 'react'
import { productName } from '@/content/product'
import { MobileNav } from './MobileNav'
import { SidebarPanel, type ShellAccount, type ShellRetailer } from './SidebarPanel'
import styles from './AppShell.module.css'

export type { ShellAccount, ShellRetailer }

export function Logo() {
  return (
    <Link href="/today" className={styles.logo}>
      <i className={styles.logoMark} aria-hidden="true" />
      {productName}
    </Link>
  )
}

/**
 * Signed-in application frame: a quiet left sidebar (primary navigation,
 * current retailer, personal account) and the page content. On phones the
 * sidebar becomes a panel opened from a slim top bar.
 */
export function AppShell({ retailer, account, children }: { retailer: ShellRetailer; account: ShellAccount; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <aside className={styles.sidebar} aria-label="Sidebar">
        <SidebarPanel retailer={retailer} account={account} logo={<Logo />} />
      </aside>
      <header className={styles.mobileBar}>
        <Logo />
        <MobileNav>
          <SidebarPanel retailer={retailer} account={account} logo={<Logo />} inDrawer />
        </MobileNav>
      </header>
      <main id="main" className={styles.main}>{children}</main>
    </div>
  )
}

/** Minimal frame for sign-in and onboarding: logo only, no navigation. */
export function FocusedShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={styles.focused}>
      <header className={styles.bar}>
        <Logo />
        <span className={styles.spacer} />
        {aside}
      </header>
      <main id="main" className={styles.focusedMain}>{children}</main>
    </div>
  )
}
