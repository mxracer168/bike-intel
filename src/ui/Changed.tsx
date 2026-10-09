'use client'

import { useState, type ReactNode } from 'react'
import motion from './Motion.module.css'

/**
 * A number that responds when it changes because of something the
 * retailer did (a quantity, a price): it tints briefly, once per change.
 * Nothing moves on first render, so a resting screen stays still.
 */
export function Changed({ value, children }: { value: string | number; children: ReactNode }) {
  const [initial] = useState(value)
  if (value === initial) return <>{children}</>
  return <span key={String(value)} className={motion.numberUpdate}>{children}</span>
}
