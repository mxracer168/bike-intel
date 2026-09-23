/**
 * Primary application navigation (left sidebar).
 * The sidebar is the product's single primary navigation; screens do not add
 * their own secondary sidebars. Today stays first and visually leads.
 */
export type NavItem = { href: string; label: string }
export type NavSection = { label?: string; items: NavItem[] }

export const navigation: NavSection[] = [
  { items: [{ href: '/today', label: 'Today' }] },
  {
    label: 'Buying',
    items: [
      { href: '/recommendations', label: 'Recommendations' },
      { href: '/orders', label: 'Orders' },
      { href: '/inventory', label: 'Inventory' },
    ],
  },
  {
    label: 'Suppliers',
    items: [
      { href: '/suppliers', label: 'Supplier directory' },
      { href: '/programs', label: 'Programs' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/performance', label: 'Performance' },
      { href: '/opportunities', label: 'Opportunities' },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/business/profile', label: 'Retailer profile' },
      { href: '/business/locations', label: 'Locations' },
      { href: '/business/team', label: 'Team' },
    ],
  },
]

export const allNavItems: NavItem[] = navigation.flatMap((s) => s.items)

/** The item a path belongs to (exact match or a sub-page of it). */
export function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
