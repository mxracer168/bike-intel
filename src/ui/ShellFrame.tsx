'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { SIDEBAR_COOKIE } from './sidebar'
import styles from './AppShell.module.css'

const SidebarContext = createContext<{ collapsed: boolean; toggle: () => void }>({ collapsed: false, toggle: () => {} })

export function useSidebar() {
  return useContext(SidebarContext)
}

/** The application grid. Collapsing narrows the desktop sidebar to an icon rail; phones keep the drawer. */
export function ShellFrame({ initialCollapsed, children }: { initialCollapsed: boolean; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=31536000; samesite=lax`
      return next
    })
  }, [])
  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div className={styles.shell} data-sidebar={collapsed ? 'collapsed' : 'expanded'}>{children}</div>
    </SidebarContext.Provider>
  )
}
