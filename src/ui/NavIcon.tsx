import type { NavIconName } from '@/content/navigation'

/**
 * Navigation and brand icons from the Figma reference: a 24px grid, one
 * 1.7 stroke, round ends. Decorative; the label beside each carries the meaning.
 */
const paths: Record<NavIconName | 'brand', React.ReactNode> = {
  brand: <><path d="M5 16.5 12 4l7 12.5" /><path d="M8.2 13h7.6" /><circle cx="12" cy="18" r="2" /></>,
  today: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  orders: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
  catalog: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" /></>,
  inventory: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5M8 14h8" /></>,
  programs: <><path d="M4 5h16v14H4zM8 3v4M16 3v4M4 10h16" /><path d="m9 15 2 2 4-4" /></>,
  suppliers: <><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01" /></>,
  insights: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /><path d="m4 9 6-4 6 7 5-5" /></>,
  connections: <><circle cx="6" cy="12" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="m8.7 10.7 6.6-3.4M8.7 13.3l6.6 3.4" /></>,
  business: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0M19 8h2M3 8h2M12 1v2" /></>,
}

export function NavIcon({ name, size = 18 }: { name: NavIconName | 'brand'; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
