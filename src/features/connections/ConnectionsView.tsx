'use client'

import { useCallback, useState } from 'react'
import { Icon } from '@/ui/Icon'
import { ConnectionPanel } from './ConnectionPanel'
import { filterConnections, filterLabel, isConnected, sections, type ConnectionFilter } from './filter'
import { LogoTile, Status } from './Parts'
import { kindLabel, type ConnectionView } from './types'
import styles from './Connections.module.css'

function Card({ c, onOpen }: { c: ConnectionView; onOpen: (id: string) => void }) {
  const connected = isConnected(c)
  const titleId = `connection-${c.id}`
  return (
    <li className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardTop}>
        <LogoTile connection={c} />
        <div className={styles.cardName}>
          <h3 id={titleId} className={styles.name}>{c.name}</h3>
          <p className={styles.kind}>{kindLabel[c.kind]}</p>
        </div>
        <Status status={c.status} />
      </div>
      <p className={styles.description}>{c.description}</p>
      <div className={styles.cardActions}>
        <button type="button" className={styles.outlined} onClick={() => onOpen(c.id)} aria-describedby={titleId}>
          {connected ? 'Manage' : 'Connect'}
        </button>
        <button type="button" className={styles.textAction} onClick={() => onOpen(c.id)} aria-describedby={titleId}>
          View details
        </button>
      </div>
    </li>
  )
}

/**
 * The connections library: every system and supplier the retailer can
 * connect, in one place, with the same card and the same panel for each.
 * The method behind each one (OAuth, a pasted token, files, email) only
 * shows up in that provider's setup steps.
 */
export function ConnectionsView({ connections, initialOpen = null }: { connections: ConnectionView[]; initialOpen?: string | null }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ConnectionFilter>('all')
  const [openId, setOpenId] = useState<string | null>(connections.some((c) => c.id === initialOpen) ? initialOpen : null)
  const shown = filterConnections(connections, filter, query)
  const open = connections.find((c) => c.id === openId) ?? null

  // Keep the address shareable (?connection=hlc) without a navigation.
  const setOpen = useCallback((id: string | null) => {
    setOpenId(id)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('connection', id)
    else url.searchParams.delete('connection')
    window.history.replaceState(null, '', url)
  }, [])

  return (
    <div className={styles.library}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon name="search" />
          <span className="visually-hidden">Search connections</span>
          <input type="search" value={query} placeholder="Search connections…" onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className={styles.filters} role="group" aria-label="Show">
          {(Object.keys(filterLabel) as ConnectionFilter[]).map((f) => (
            <button key={f} type="button" className={styles.filter} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {filterLabel[f]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && (
        <p className={styles.empty}>
          {query.trim() ? <>No connections match “{query.trim()}”.</> : 'Nothing connected here yet.'}
        </p>
      )}

      {sections.map(({ kind, title }) => {
        const items = shown.filter((c) => c.kind === kind)
        if (items.length === 0) return null
        return (
          <section key={kind} className={styles.section} aria-labelledby={`section-${kind}`}>
            <h2 id={`section-${kind}`} className={styles.sectionTitle}>{title}</h2>
            <ul className={styles.grid}>
              {items.map((c) => <Card key={c.id} c={c} onOpen={setOpen} />)}
            </ul>
          </section>
        )
      })}

      <ConnectionPanel connection={open} onClose={() => setOpen(null)} />
    </div>
  )
}
