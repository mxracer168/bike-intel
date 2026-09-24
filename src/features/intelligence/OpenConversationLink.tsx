'use client'

import { useIntelligence } from './IntelligencePanel'
import styles from './Intelligence.module.css'

/** A plain inline way into the conversation. */
export function OpenConversationLink({ children = 'Open the conversation' }: { children?: string }) {
  const api = useIntelligence()
  if (!api) return null
  return <button type="button" className={styles.inlineLink} aria-haspopup="dialog" onClick={() => api.open()}>{children}</button>
}
