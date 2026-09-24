import { Page, PageHeader } from '@/ui/Layout'
import styles from './Placeholder.module.css'

/** Placeholder for areas not built yet: a plain statement and one sentence on what will be here. */
export function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <Page width="narrow">
      <PageHeader title={title} />
      <p className={styles.body}>{body}</p>
    </Page>
  )
}
