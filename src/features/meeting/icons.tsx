/**
 * Concept icons for the intelligence meeting and the recommendation
 * equation: larger than the 16px UI icons (src/ui/Icon.tsx), drawn on a 24px
 * grid with one stroke weight so they read as a set. Decorative: the label
 * beside each icon carries the meaning.
 */
export type ConceptIconName = 'history' | 'market' | 'person' | 'target' | 'chat' | 'insight' | 'calendar'

const paths: Record<ConceptIconName, React.ReactNode> = {
  // Historical truth: what has sold, over time.
  history: <><rect x="4.5" y="13" width="3.5" height="7" rx="1" /><rect x="10.25" y="9" width="3.5" height="11" rx="1" /><rect x="16" y="4.5" width="3.5" height="15.5" rx="1" /></>,
  // Market intelligence: a storefront, the wider trade.
  market: <><path d="M4.5 9.5 6 4.5h12l1.5 5" /><path d="M4.5 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /><path d="M6 12.5V20h12v-7.5" /><path d="M10 20v-4.5h4V20" /></>,
  // Your context: the retailer's own knowledge.
  person: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c.8-4 3.8-6.5 7.5-6.5s6.7 2.5 7.5 6.5" /></>,
  // Clear recommendations: on target.
  target: <><circle cx="11" cy="13" r="7.5" /><circle cx="11" cy="13" r="4" /><circle cx="11" cy="13" r=".6" /><path d="M11 13 19 5" /><path d="M16 4.5h3.5V8" /></>,
  chat: <><path d="M5 19V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5Z" /><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" /></>,
  insight: <><path d="M9.5 18h5M10.5 21h3" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
}

export function ConceptIcon({ name, size = 24 }: { name: ConceptIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
