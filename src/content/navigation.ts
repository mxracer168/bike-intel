/**
 * Primary application navigation (left sidebar): the fewest first-class
 * destinations we can defend. Pages with sub-pages (Business) use a quiet
 * row of in-page tabs rather than more sidebar items.
 */
export type NavIconName = 'today' | 'orders' | 'inventory' | 'programs' | 'suppliers' | 'insights' | 'connections' | 'business'
export type NavItem = { href: string; label: string; icon?: NavIconName }

export const navigation: NavItem[] = [
  { href: '/today', label: 'Today', icon: 'today' },
  { href: '/orders', label: 'Orders', icon: 'orders' },
  { href: '/inventory', label: 'Inventory', icon: 'inventory' },
  { href: '/programs', label: 'Programs', icon: 'programs' },
  { href: '/suppliers', label: 'Suppliers', icon: 'suppliers' },
  { href: '/insights', label: 'Insights', icon: 'insights' },
  { href: '/connections', label: 'Connections', icon: 'connections' },
  { href: '/business', label: 'Business', icon: 'business' },
]

/** In-page tabs within Business. */
export const businessTabs: NavItem[] = [
  { href: '/business/profile', label: 'Profile' },
  { href: '/business/locations', label: 'Locations' },
  { href: '/business/team', label: 'Team' },
]

/** In-page tabs within Inventory. */
export const inventoryTabs: NavItem[] = [
  { href: '/inventory', label: 'Inventory' },
  { href: '/inventory/excess', label: 'Excess inventory' },
]

/** The item a path belongs to (exact match or a sub-page of it). */
export function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
