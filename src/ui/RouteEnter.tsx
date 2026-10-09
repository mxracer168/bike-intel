'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import motion from './Motion.module.css'

/**
 * Page content settles into place after navigation; the shell (sidebar and
 * top bar) stays still and the old page leaves at once.
 */
export function RouteEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return <div key={pathname} className={motion.pageEnter}>{children}</div>
}
