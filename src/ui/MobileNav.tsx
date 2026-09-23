'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './AppShell.module.css'

/**
 * Phone navigation. A native modal <dialog> provides the focus trap, Escape to
 * close and an inert background; it closes on navigation and backdrop click.
 */
export function MobileNav({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    dialog.current?.close()
  }, [pathname])

  return (
    <>
      <button type="button" className={styles.menuButton} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        <Icon name="menu" />
        Menu
      </button>
      <dialog
        ref={dialog}
        className={styles.drawer}
        aria-label="Navigation"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close()
        }}
      >
        <div className={`${styles.panelHead} ${styles.drawerHead}`}>
          <span className="visually-hidden">Navigation</span>
          <span aria-hidden="true" />
          <button type="button" className={styles.closeButton} aria-label="Close navigation" onClick={() => dialog.current?.close()}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </dialog>
    </>
  )
}
