import type { ReactNode } from 'react'
import { businessTabs } from '@/content/navigation'
import { Page } from '@/ui/Layout'
import { Tabs } from '@/ui/Tabs'
import styles from './Business.module.css'

/** Business area: the retailer's name, quiet tabs for profile / locations / team, then the page. */
export function BusinessFrame({ name, children }: { name: string; children: ReactNode }) {
  return (
    <Page>
      <header className={styles.frameHead}>
        <h1 className={styles.frameTitle}>{name}</h1>
        <Tabs label="Business" items={businessTabs} />
      </header>
      {children}
    </Page>
  )
}
