/** A stocking location, as the inventory page needs it. */
export type InventoryLocation = { id: string; name: string }

/** One stocked item. Presentation shape only; nothing here is computed from real sales yet. */
export type InventoryItemView = {
  id: string
  product: string
  variant?: string
  brand: string
  category: string
  supplier: string
  unitCost: number
  onHand: number
  onOrder: number
  /** Expected units sold per week (the basis for coverage). */
  perWeek: number
  /** Units sold per week, oldest first. */
  weeklySales: number[]
  lastSale: string | null
  lastReceipt: string | null
  lastPurchaseQty: number | null
  byLocation: { locationId: string; name: string; onHand: number }[]
  /** Part numbers and UPCs: searched, not shown as columns. */
  identifiers: string[]
}

export type Measure = 'dollars' | 'units'
export type CoverageUnit = 'days' | 'weeks' | 'months'
export type Condition = 'low' | 'healthy' | 'excess' | 'not_selling'
