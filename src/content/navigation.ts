/**
 * Primary application navigation (left sidebar): the fewest first-class
 * destinations we can defend. Pages with sub-pages (Business) use a quiet
 * row of in-page tabs rather than more sidebar items.
 */
export type NavItem = { href: string; label: string }

export const navigation: NavItem[] = [
  { href: '/today', label: 'Today' },
  { href: '/orders', label: 'Orders' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/programs', label: 'Programs' },
  { href: '/suppliers', label: 'Suppliers' },
  { href: '/insights', label: 'Insights' },
  { href: '/business', label: 'Business' },
]

/** In-page tabs within Business. */
export const businessTabs: NavItem[] = [
  { href: '/business/profile', label: 'Profile' },
  { href: '/business/locations', label: 'Locations' },
  { href: '/business/team', label: 'Team' },
]

/** The item a path belongs to (exact match or a sub-page of it). */
export function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
