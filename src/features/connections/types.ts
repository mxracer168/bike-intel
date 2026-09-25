/**
 * One external system the retailer connects: a point-of-sale system or a
 * supplier (later perhaps accounting or commerce). Presentation shape only;
 * see docs/connections.md for what a connection will be stored as.
 */
export type ProviderKind = 'pos' | 'supplier'

/**
 * How the provider is reached. The retailer never has to know which one:
 * the library turns each into the simplest setup that provider allows.
 */
export type ConnectionMethod = 'oauth' | 'api_token' | 'api' | 'email' | 'file' | 'portal' | 'manual'

export type ConnectionStatus = 'connected' | 'not_connected' | 'attention'

export type ConnectionView = {
  id: string
  name: string
  kind: ProviderKind
  /** One sentence: what connecting gives the retailer. */
  description: string
  method: ConnectionMethod
  status: ConnectionStatus
  /** What this specific provider offers. Varies by provider; never assume all. */
  capabilities: { title: string; detail: string }[]
  /** Whether orders can be sent through the connection. */
  orderSubmission?: boolean
  /** Filled in once connected. */
  lastSync?: string
  nextSync?: string
  /** Shown masked; the full secret never reaches the page. */
  credentials?: { label: string; value: string; masked?: boolean }[]
  /** Why it needs attention, in words. */
  attention?: string
  /** How to set it up, in the order the retailer does it. */
  setup: { steps: string[]; field?: { label: string; hint: string } }
  /** A logo file under /public, when we have the provider's own. */
  logo?: string
  /** The supplier's page, for suppliers we know. */
  supplierHref?: string
}

export const kindLabel: Record<ProviderKind, string> = { pos: 'Point of sale', supplier: 'Supplier' }

/** "Connected via API", "Orders sent by email"… in the retailer's words. */
export const methodLabel: Record<ConnectionMethod, string> = {
  oauth: 'Connected',
  api_token: 'Connected via API',
  api: 'Connected via API',
  email: 'Orders sent by email',
  file: 'File export and import',
  portal: 'Copy to supplier portal',
  manual: 'Manual ordering',
}
