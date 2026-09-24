import Link from 'next/link'
import { QuickAnswer } from './QuickAnswer'
import type { WorkItemView, WorkKind } from './types'
import styles from './Work.module.css'

const kindLabel: Record<WorkKind, string> = {
  booking: 'Booking',
  excess: 'Too much stock',
  unusual: 'Unusual sales',
  approval: 'Ready to approve',
  opportunity: 'Opportunity',
  question: 'Question',
}

/** Everything on Today that isn't a proposed order. One shape for every kind of work. */
export function WorkList({ items, example = false }: { items: WorkItemView[]; example?: boolean }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <p className={styles.kind}>{kindLabel[item.kind]}</p>
          <div className={styles.body}>
            <p className={styles.title}>{item.title}</p>
            {item.detail && <p className={styles.detail}>{item.detail}</p>}
            {item.choices && <QuickAnswer name={`work-${item.id}`} prompt={item.title} choices={item.choices} example={example} />}
          </div>
          {item.action && <Link href={item.action.href} className={styles.action}>{item.action.label}</Link>}
        </li>
      ))}
    </ul>
  )
}
