import type { ReactNode } from 'react'
import { inventoryTabs } from '@/content/navigation'
import { Page } from '@/ui/Layout'
import { Tabs } from '@/ui/Tabs'
import styles from './Inventory.module.css'

/** Inventory area: the title, quiet tabs (Inventory, Excess inventory), then the view. */
export function InventoryFrame({ children }: { children: ReactNode }) {
  return (
    <Page>
      <header className={styles.frameHead}>
        <h1 className={styles.title}>Inventory</h1>
        <Tabs label="Inventory" items={inventoryTabs} />
      </header>
      {children}
    </Page>
  )
}
