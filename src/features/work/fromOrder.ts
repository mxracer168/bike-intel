import { formatMoney, plural } from '@/domain/language/plain'
import type { OrderSummary } from '@/features/orders/types'
import type { WorkItemView } from './types'

/** A proposed order as one priority: lead with what it needs from the buyer. */
export function orderPriority(o: OrderSummary): WorkItemView {
  const size = `${plural(o.lineCount, 'line')} · ${formatMoney(Math.round(o.total), o.currency)}`

  let title: string
  if (o.questions > 0) title = `${o.supplier}’s order has ${o.questions === 1 ? 'a question' : `${o.questions} questions`} for you.`
  else if (o.orderBy) title = `${o.supplier}’s order closes ${o.orderBy}.`
  else if (o.freightGap !== undefined) title = `${o.supplier} is ${formatMoney(Math.ceil(o.freightGap), o.currency)} from free freight.`
  else title = `${o.supplier}’s order is ready to review.`

  // Questions lead the title when there are any, so the detail is size and what's worth a look.
  const detail = [size, o.review > 0 && `${o.review} worth a look`].filter(Boolean).join(' · ')

  return { id: `order-${o.id}`, kind: 'order', title, detail, action: { href: `/orders/${o.id}`, label: 'Review order' } }
}
