import styles from './Today.module.css'

export type AheadItem = { title: string; detail: string }

/** What's coming: dates and trends worth knowing about, quieter than the queue above. */
export function Ahead({ items }: { items: AheadItem[] }) {
  if (items.length === 0) return null
  return (
    <section className={styles.ahead} aria-labelledby="today-ahead">
      <h2 id="today-ahead" className={styles.aheadLabel}>Ahead</h2>
      <ul className={styles.aheadList}>
        {items.map((i) => (
          <li key={i.title}>
            <p className={styles.aheadTitle}>{i.title}</p>
            <p className={styles.aheadDetail}>{i.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
