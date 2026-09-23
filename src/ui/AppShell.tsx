import Link from 'next/link'
import type { ReactNode } from 'react'
import { productName } from '@/content/product'
import { signOutAction } from '@/server/actions/auth'
import { PrimaryNav } from './PrimaryNav'
import styles from './AppShell.module.css'

export function Logo() {
  return (
    <Link href="/today" className={styles.logo}>
      <i className={styles.logoMark} aria-hidden="true" />
      {productName}
    </Link>
  )
}

/** Account and settings live here, not in primary navigation. */
function AccountMenu({ organizationName, email }: { organizationName: string; email: string }) {
  const initials = organizationName.trim().slice(0, 2).toUpperCase() || '··'
  return (
    <details className={styles.account}>
      <summary aria-label="Account">
        <span className={styles.avatar} aria-hidden="true">{initials}</span>
      </summary>
      <div className={styles.menu}>
        <div className={styles.menuMeta}>
          <b>{organizationName}</b>
          <span>{email}</span>
        </div>
        <form action={signOutAction}>
          <button type="submit" className={styles.menuItem}>Sign out</button>
        </form>
      </div>
    </details>
  )
}

export function AppShell({ organizationName, email, children }: { organizationName: string; email: string; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <header className={styles.bar}>
        <Logo />
        <PrimaryNav />
        <span className={styles.spacer} />
        <AccountMenu organizationName={organizationName} email={email} />
      </header>
      <main id="main" className={styles.main}>{children}</main>
    </div>
  )
}

/** Minimal frame for sign-in and onboarding: logo only, no navigation. */
export function FocusedShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Logo />
        <span className={styles.spacer} />
        {aside}
      </header>
      <main id="main" className={styles.main}>{children}</main>
    </div>
  )
}
