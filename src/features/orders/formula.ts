import { average } from '@/domain/language/plain'
import type { FormulaData } from '@/features/recommendations/Formula'
import type { OrderLineView, ProposedOrderView } from './types'
import { calculation, seasonView, supplierView } from './why'

/**
 * The formula's figures for one order line. The order line and the Catalog's
 * buying card both read them from here, so the two always explain a
 * recommendation the same way.
 */
export function lineFormula(
  line: OrderLineView,
  order: Pick<ProposedOrderView, 'supplier' | 'leadTimeDays'>,
  weekStarts?: string[],
): FormulaData {
  const calc = calculation(line)
  const sup = supplierView(line, order.leadTimeDays)
  const waiting = line.supplier.status === 'out' || line.supplier.status === 'delayed'
  return {
    target: calc.expectedDemand, safetyStock: calc.safetyStock, onHand: calc.onHand, onOrder: calc.onOrder,
    recommendation: calc.recommended, rule: calc.rule,
    perWeek: average(line.weeklySales), leadTimeDays: order.leadTimeDays, trend: seasonView(line)?.value,
    weeklySales: line.weeklySales, weekStarts,
    incoming: line.incoming,
    supply: {
      supplier: order.supplier.split(' ')[0] ?? order.supplier,
      value: line.supplier.status === 'out' ? `Out of stock · ${sup.value}` : sup.value,
      attention: sup.attention,
      arrivesInDays: waiting ? undefined : order.leadTimeDays,
    },
  }
}
