/**
 * The retailer's private side of a supplier: never part of the supplier's own
 * page (`SupplierPresentation`), never visible to the supplier or to other
 * retailers. See docs/suppliers.md.
 */

/** How Buying Intelligence reaches this supplier for this retailer. */
export type ConnectionMode = 'api' | 'email' | 'portal' | 'file' | 'manual'

export type ConnectionView = {
  mode: ConnectionMode
  /** This connection on the Connections page, where it's managed. */
  id?: string
  /** When the last sync finished, already in words ("Today at 8:24 AM"). */
  lastSynced?: string
  /** Where orders go, in words, for email ("orders@…"). Never a credential. */
  destination?: string
}

export type SupplierAccountView = {
  accountNumber?: string
  connection?: ConnectionView
}

export const connectionText: Record<ConnectionMode, { title: string; detail: string }> = {
  api: { title: 'Connected via API', detail: 'Inventory, pricing and orders sync automatically.' },
  email: { title: 'Orders sent by email', detail: 'We send each approved order to the supplier’s order desk.' },
  portal: { title: 'Copy to supplier portal', detail: 'We prepare each order for you to enter on their website.' },
  file: { title: 'File export and import', detail: 'Orders go out as a file; price and stock files come back.' },
  manual: { title: 'Manual ordering', detail: 'You place orders with this supplier yourself.' },
}
