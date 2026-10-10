import { useSyncExternalStore } from 'react'

/**
 * EXAMPLE ONLY: what the retailer changed in proposed orders and what they
 * added from the Catalog, kept in this browser so the Catalog, the order and
 * the order list agree. The real version is the working purchase order
 * (docs/catalog.md, "The order and sourcing model"); nothing here reaches
 * the database or a supplier.
 */
export type AddedItem = {
  /** productId:optionId, so adding the same option again adds to it. */
  key: string
  productId: string
  optionId: string
  product: string
  variant?: string
  quantity: number
  unitCost: number
}

export type OrderDraft = {
  /** Quantities the retailer set on the order's own lines, by line id. */
  lines: Record<string, number>
  added: AddedItem[]
}

/** A new order started from the Catalog, with a supplier that had no proposed order. */
export type StartedOrder = { id: string; supplierId: string; supplierName: string; currency: string }

export type DraftState = { orders: Record<string, OrderDraft>; started: Record<string, StartedOrder> }

const KEY = 'bi_example_order_drafts'
const EMPTY: DraftState = { orders: {}, started: {} }
const listeners = new Set<() => void>()
let cache: DraftState | null = null

function read(): DraftState {
  if (cache) return cache
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as DraftState | null
    cache = parsed && typeof parsed === 'object' ? { orders: parsed.orders ?? {}, started: parsed.started ?? {} } : EMPTY
  } catch {
    cache = EMPTY
  }
  return cache
}

function write(next: DraftState) {
  cache = next
  try { window.localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private window: this tab only */ }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; listener() } }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) }
}

/** The drafts in this browser; empty on the server and on first paint. */
export function useDrafts(): DraftState {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

const draftOf = (s: DraftState, orderId: string): OrderDraft => s.orders[orderId] ?? { lines: {}, added: [] }
const withDraft = (s: DraftState, orderId: string, d: OrderDraft): DraftState => ({ ...s, orders: { ...s.orders, [orderId]: d } })

export function setLineQuantity(orderId: string, lineId: string, quantity: number) {
  const s = read()
  const d = draftOf(s, orderId)
  write(withDraft(s, orderId, { ...d, lines: { ...d.lines, [lineId]: Math.max(0, Math.round(quantity)) } }))
}

/**
 * Put an option in an order at a quantity: on the order's own line when it
 * has one, otherwise as an added item (one per option; adding it again sets
 * its quantity, so a second click never doubles it).
 */
export function addToOrder(orderId: string, item: AddedItem, lineId?: string, setTo?: number) {
  if (lineId !== undefined && setTo !== undefined) return setLineQuantity(orderId, lineId, setTo)
  const s = read()
  const d = draftOf(s, orderId)
  const existing = d.added.find((a) => a.key === item.key)
  const added = existing
    ? d.added.map((a) => (a.key === item.key ? { ...a, quantity: item.quantity, unitCost: item.unitCost } : a))
    : [...d.added, item]
  write(withDraft(s, orderId, { ...d, added }))
}

export function setAddedQuantity(orderId: string, key: string, quantity: number) {
  const s = read()
  const d = draftOf(s, orderId)
  const added = quantity <= 0 ? d.added.filter((a) => a.key !== key) : d.added.map((a) => (a.key === key ? { ...a, quantity } : a))
  write(withDraft(s, orderId, { ...d, added }))
}

/** Start a new order with a supplier (or return the one already started). */
export function startOrder(supplierId: string, supplierName: string, currency: string): string {
  const id = `draft-${supplierId}`
  const s = read()
  if (!s.started[id]) write({ ...s, started: { ...s.started, [id]: { id, supplierId, supplierName, currency } } })
  return id
}

export function discardStartedOrder(id: string) {
  const s = read()
  const started = { ...s.started }
  const orders = { ...s.orders }
  delete started[id]
  delete orders[id]
  write({ orders, started })
}

export const addedTotal = (d: OrderDraft | undefined) =>
  (d?.added ?? []).reduce((sum, a) => sum + Math.round(a.unitCost * a.quantity * 100), 0) / 100
