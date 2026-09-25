import { kindLabel, type ConnectionView, type ProviderKind } from './types'

export type ConnectionFilter = 'all' | 'connected' | 'pos' | 'supplier'

export const filterLabel: Record<ConnectionFilter, string> = {
  all: 'All', connected: 'Connected', pos: 'Point of sale', supplier: 'Suppliers',
}

/** Connected includes connections that need attention: they're still yours. */
export const isConnected = (c: ConnectionView) => c.status !== 'not_connected'

/** Local search and filter over the library. Search reads name, type and description. */
export function filterConnections(all: ConnectionView[], filter: ConnectionFilter, query: string): ConnectionView[] {
  const q = query.trim().toLowerCase()
  return all.filter((c) => {
    if (filter === 'connected' && !isConnected(c)) return false
    if ((filter === 'pos' || filter === 'supplier') && c.kind !== filter) return false
    if (!q) return true
    return [c.name, kindLabel[c.kind], c.description].some((t) => t.toLowerCase().includes(q))
  })
}

export const sections: { kind: ProviderKind; title: string }[] = [
  { kind: 'pos', title: 'Point of sale' },
  { kind: 'supplier', title: 'Suppliers' },
]
