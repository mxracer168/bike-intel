import type { HandoffView, ProposedOrderView, SupplierOrderMethod } from './types'

/**
 * What happens when the retailer finishes an order, worded from the actual
 * connections (docs/architecture.md, "Supplier orders"). Approval and
 * submission stay separate states even when one action does both: an order
 * the retailer still has to send is approved, not submitted.
 */

export type HandoffStep = { who: 'Supplier' | 'Point of sale' | 'Before it’s sent'; text: string }

/** Which side of the handoff a file or a task belongs to. */
export type HandoffSide = 'supplier' | 'pos'

export type HandoffPlan = {
  /** The one button: "Approve & submit", "Approve & prepare order", "Approve order". */
  action: string
  /** Shown first when the supplier can't take orders electronically. */
  notice?: string
  /** What Buying Intelligence will do, in order. */
  steps: HandoffStep[]
  /** What's left for the retailer afterwards. */
  youDo: { side: HandoffSide; text: string }[]
  /** What has happened once the action completes, said in the past tense. Never includes the recheck. */
  done: string[]
  /** Files prepared for the retailer. */
  files: HandoffSide[]
  /** The status the order reaches when the action completes. */
  reaches: 'submitted' | 'approved'
  /** How the order leaves, as recorded on the purchase order once it's sent. */
  submissionMethod: SupplierOrderMethod
}

export const electronic = (h: HandoffView) => h.supplier === 'supplier_api'

export function handoffPlan(h: HandoffView, supplier: string): HandoffPlan {
  const pos = h.pos
  const steps: HandoffStep[] = []
  const youDo: HandoffPlan['youDo'] = []
  const files: HandoffPlan['files'] = []
  const done: string[] = []

  if (electronic(h)) {
    steps.push({ who: 'Supplier', text: `This order will be submitted electronically to ${supplier}.` })
    done.push(`Submitted electronically to ${supplier}`)
  } else {
    steps.push({ who: 'Supplier', text: `We’ll prepare an order file for ${supplier} (it opens in Excel) to email or upload to their portal.` })
    files.push('supplier')
    done.push(`Order file for ${supplier} ready`)
    youDo.push({ side: 'supplier', text: `Send the order file to ${supplier}, then mark the order as sent.` })
  }

  if (pos?.writeback) {
    steps.push({ who: 'Point of sale', text: `A purchase order will be created in ${pos.name}.` })
    done.push(`Purchase order created in ${pos.name}`)
  } else {
    const where = pos ? pos.name : 'your point of sale'
    steps.push({
      who: 'Point of sale',
      text: pos
        ? `${pos.name} can’t receive purchase orders from Buying Intelligence. We’ll prepare a file you can import.`
        : 'No point of sale is connected. We’ll prepare a file you can import.',
    })
    files.push('pos')
    done.push(`Import file for ${where} ready`)
    youDo.push({ side: 'pos', text: `Create the purchase order in ${where} from the file, or enter it by hand.` })
  }

  if (electronic(h)) {
    steps.push({ who: 'Before it’s sent', text: `We’ll recheck ${supplier}’s current pricing and availability and tell you if anything changed.` })
  }

  const action = electronic(h) ? 'Approve & submit' : pos?.writeback ? 'Approve & prepare order' : 'Approve order'
  return {
    action,
    notice: electronic(h) ? undefined : `${supplier} doesn’t accept electronic orders through Buying Intelligence yet.`,
    steps,
    youDo,
    done,
    files,
    reaches: electronic(h) ? 'submitted' : 'approved',
    submissionMethod: electronic(h) ? 'supplier_api' : 'export',
  }
}

export const submissionMethodLabel: Record<SupplierOrderMethod, string> = {
  supplier_api: 'Sent electronically',
  email: 'Sent by email',
  export: 'Sent as a file',
  other: 'Placed another way',
}

/**
 * An order file as CSV, which opens in Excel: the supplier's copy, or one to
 * import into the point of sale. Lines set to zero are left out. Starts with a
 * byte-order mark so Excel reads product names (curly apostrophes) correctly.
 */
export function orderFile(order: ProposedOrderView, quantities: Record<string, number>, side: HandoffSide): { name: string; content: string } {
  const lines = order.lines.map((l) => ({ l, q: quantities[l.id] ?? l.quantity })).filter(({ q }) => q > 0)
  const head = side === 'pos' ? ['Supplier', 'Product', 'Variant', 'Quantity', 'Unit cost'] : ['Product', 'Variant', 'Quantity', 'Unit cost']
  const rows = lines.map(({ l, q }) => {
    const row = [l.product, l.variant ?? '', String(q), l.unitCost.toFixed(2)]
    return side === 'pos' ? [order.supplier, ...row] : row
  })
  const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const content = '\uFEFF' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
  const slug = order.supplier.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return { name: `${slug}-${side === 'pos' ? 'purchase-order-import' : 'order'}.csv`, content }
}
