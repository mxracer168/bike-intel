import Link from 'next/link'
import { QuickAnswer } from './QuickAnswer'
import type { WorkItemView } from './types'
import styles from './Work.module.css'

/** Today's ranked priorities. One row shape for every kind of work; order is rank. */
export function WorkList({ items, label, example = false }: { items: WorkItemView[]; label: string; example?: boolean }) {
  return (
    <ol className={styles.list} aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <div className={styles.body}>
            <p className={styles.title}>{item.title}</p>
            {item.detail && <p className={styles.detail}>{item.detail}</p>}
            {item.choices && <QuickAnswer name={`work-${item.id}`} prompt={item.title} choices={item.choices} example={example} />}
          </div>
          {item.action && <Link href={item.action.href} className={styles.action}>{item.action.label}</Link>}
        </li>
      ))}
    </ol>
  )
}
