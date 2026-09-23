'use client'

import Link from 'next/link'
import { useDeferredValue, useId, useState } from 'react'
import { ExampleMarker } from '@/ui/Example'
import { TextInput } from '@/ui/Field'
import { Icon } from '@/ui/Icon'
import { kindLabel, monogram, type DirectoryEntry } from './presentation'
import { RelationshipTag } from './RelationshipTag'
import styles from './Suppliers.module.css'

/** Case- and accent-insensitive name matching ("cafe" finds "Café"). */
function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/** Supplier list that filters by name as the person types. */
export function SupplierDirectory({ entries }: { entries: DirectoryEntry[] }) {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const inputId = useId()
  const q = normalize(deferred)
  const visible = q ? entries.filter((e) => normalize(e.name).includes(q)) : entries
  const summary = q
    ? visible.length === 0
      ? `No suppliers match “${deferred.trim()}”.`
      : `${visible.length} of ${entries.length} suppliers`
    : `${entries.length} suppliers`

  return (
    <>
      <div className={styles.search} role="search">
        <label htmlFor={inputId} className="visually-hidden">Search suppliers by name</label>
        <Icon name="search" />
        <TextInput id={inputId} type="search" placeholder="Search suppliers by name" value={query}
          onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} />
      </div>
      <p className={styles.count} aria-live="polite">{summary}</p>
      {visible.length > 0 && (
        <ul className={styles.list}>
          {visible.map((e) => (
            <li key={e.id} className={styles.row}>
              <Link href={`/suppliers/${e.id}`} className={styles.rowLink}>
                <span className={styles.monogram} aria-hidden="true">{monogram(e.name)}</span>
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{e.name}</span>
                  {e.tagline && <span className={styles.rowTagline}>{e.tagline}</span>}
                </span>
                <span className={styles.rowMeta}>
                  {e.example && <ExampleMarker quiet />}
                  <RelationshipTag relationship={e.relationship} />
                  {e.kind && <span className={styles.rowTagline}>{kindLabel[e.kind]}</span>}
                  <span className={styles.chevron}><Icon name="chevron-right" /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
