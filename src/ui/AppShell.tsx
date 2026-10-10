import Link from 'next/link'
import type { ReactNode } from 'react'
import { productName } from '@/content/product'
import { AddContextButton, IntelligenceProvider } from '@/features/intelligence/IntelligencePanel'
import type { ConversationEntry, IntelligenceQuestionView, SyncStatus } from '@/features/intelligence/types'
import { NotificationsButton } from '@/features/notifications/NotificationsButton'
import type { NotificationView } from '@/features/notifications/notifications'
import { SearchButton, SearchProvider } from '@/features/search/SearchDialog'
import { MobileNav } from './MobileNav'
import { NavIcon } from './NavIcon'
import { RouteEnter } from './RouteEnter'
import { ShellFrame } from './ShellFrame'
import { SidebarPanel, type ShellAccount, type ShellRetailer } from './SidebarPanel'
import styles from './AppShell.module.css'

export type { ShellAccount, ShellRetailer }

/** The product mark on light bars (phones, sign-in, onboarding). The sidebar has its own brand block. */
export function Logo({ sub }: { sub?: ReactNode }) {
  return (
    <Link href="/today" className={styles.logo}>
      <span className={styles.logoMark} aria-hidden="true"><NavIcon name="brand" size={18} /></span>
      {sub ? <span className={styles.logoText}>{productName}<span className={styles.logoSub}>{sub}</span></span> : productName}
    </Link>
  )
}

/** Shell extras: the retailer's intelligence conversation and the quiet sync line. */
export type ShellExtras = {
  intelligence: {
    questions: IntelligenceQuestionView[]
    exampleQuestions: IntelligenceQuestionView[]
    exampleConversation: ConversationEntry[]
  }
  sync?: SyncStatus
  /** What changed or needs attention, and where this person's read state is kept. */
  notifications: { items: NotificationView[]; storageKey: string }
}

/**
 * Signed-in application frame: a dark navy sidebar (primary navigation,
 * current retailer, sync status, personal account), a slim header with the
 * "Add context" entry, and the page content. On desktop the sidebar can
 * collapse to an icon rail (remembered per browser); on phones it becomes a
 * panel opened from the top bar.
 */
export function AppShell({ retailer, account, extras, sidebarCollapsed = false, children }: {
  retailer: ShellRetailer; account: ShellAccount; extras: ShellExtras; sidebarCollapsed?: boolean; children: ReactNode
}) {
  const panel = (collapsible = false) => (
    <SidebarPanel retailer={retailer} account={account} sync={extras.sync} collapsible={collapsible} />
  )
  const frame = (
    <ShellFrame initialCollapsed={sidebarCollapsed}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <aside className={styles.sidebar} aria-label="Sidebar">{panel(true)}</aside>
      <header className={styles.mobileBar}>
        <span className={styles.barStart}>
          <MobileNav>{panel()}</MobileNav>
          <Logo />
        </span>
        <span className={styles.barEnd}>
          <SearchButton compact />
          <NotificationsButton {...extras.notifications} />
          <AddContextButton icon />
        </span>
      </header>
      <div className={styles.main}>
        <header className={styles.topBar}>
          <SearchButton />
          <span className={styles.barEnd}>
            <NotificationsButton {...extras.notifications} />
            <AddContextButton icon />
          </span>
        </header>
        <main id="main"><RouteEnter>{children}</RouteEnter></main>
      </div>
    </ShellFrame>
  )
  return (
    <IntelligenceProvider retailerName={retailer.name} questions={extras.intelligence.questions}
      exampleQuestions={extras.intelligence.exampleQuestions}
      exampleConversation={extras.intelligence.exampleConversation}>
      <SearchProvider>{frame}</SearchProvider>
    </IntelligenceProvider>
  )
}

/** Minimal frame for sign-in and onboarding: logo only, no navigation. */
export function FocusedShell({ children, aside, sub }: { children: ReactNode; aside?: ReactNode; sub?: ReactNode }) {
  return (
    <div className={styles.focused}>
      <header className={styles.bar}>
        <Logo sub={sub} />
        <span className={styles.spacer} />
        {aside}
      </header>
      <main id="main" className={styles.focusedMain}>{children}</main>
    </div>
  )
}
