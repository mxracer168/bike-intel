import Link from 'next/link'
import type { ReactNode } from 'react'
import { productName } from '@/content/product'
import { AddContextButton, ContextProvider } from '@/features/context/ContextPanel'
import type { ContextQuestion, SyncStatus } from '@/features/context/types'
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

/** Optional shell extras: the context panel (off when null) and the quiet sync line. */
export type ShellExtras = { context: { questions: ContextQuestion[]; example: boolean } | null; sync?: SyncStatus }

/**
 * Signed-in application frame: a quiet left sidebar (primary navigation,
 * current retailer, sync status, personal account), a slim header with the
 * "Add context" entry, and the page content. On phones the sidebar becomes a
 * panel opened from the top bar.
 */
export function AppShell({ retailer, account, extras = { context: null }, children }: {
  retailer: ShellRetailer; account: ShellAccount; extras?: ShellExtras; children: ReactNode
}) {
  const panel = (inDrawer: boolean) => (
    <SidebarPanel retailer={retailer} account={account} sync={extras.sync} logo={<Logo />} inDrawer={inDrawer} />
  )
  const frame = (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <aside className={styles.sidebar} aria-label="Sidebar">{panel(false)}</aside>
      <header className={styles.mobileBar}>
        <Logo />
        <span className={styles.barActions}>
          <AddContextButton compact />
          <MobileNav>{panel(true)}</MobileNav>
        </span>
      </header>
      <div className={styles.main}>
        {extras.context && (
          <div className={styles.topBar}>
            <AddContextButton />
          </div>
        )}
        <main id="main">{children}</main>
      </div>
    </div>
  )
  return extras.context
    ? <ContextProvider questions={extras.context.questions} example={extras.context.example}>{frame}</ContextProvider>
    : frame
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
