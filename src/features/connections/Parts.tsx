import Image from 'next/image'
import { monogram } from '@/features/suppliers/presentation'
import type { ConnectionStatus, ConnectionView } from './types'
import styles from './Connections.module.css'

const statusText: Record<ConnectionStatus, string> = {
  connected: 'Connected', not_connected: 'Not connected', attention: 'Needs attention',
}

/** A small dot and a word. Color is never the only cue. */
export function Status({ status }: { status: ConnectionStatus }) {
  return (
    <span className={styles.status}>
      <span className={`${styles.dot} ${styles[`dot_${status}`]}`} aria-hidden="true" />
      {statusText[status]}
    </span>
  )
}

/** The provider's own logo when we have it; otherwise a quiet initial tile. Brand color lives only here. */
export function LogoTile({ connection, size = 44 }: { connection: ConnectionView; size?: number }) {
  return connection.logo
    ? <Image src={connection.logo} alt="" width={size} height={size} unoptimized className={styles.logo} />
    : <span className={styles.monogram} style={{ width: size, height: size }} aria-hidden="true">{monogram(connection.name)}</span>
}
