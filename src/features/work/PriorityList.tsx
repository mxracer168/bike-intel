'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type DragEvent, type KeyboardEvent } from 'react'
import { Icon } from '@/ui/Icon'
import { applyUserOrder, isCustomOrder, moveTo } from './order'
import { QuickAnswer } from './QuickAnswer'
import type { WorkItemView } from './types'
import styles from './Work.module.css'

const ORDER_EVENT = 'priority-order-change'

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function parseOrder(raw: string | null): string[] | null {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') ? parsed : null
  } catch {
    return null
  }
}

function writeOrder(key: string, ids: string[] | null) {
  try {
    if (ids) window.localStorage.setItem(key, JSON.stringify(ids))
    else window.localStorage.removeItem(key)
  } catch {
    // Private mode or storage blocked: the order simply isn't remembered.
  }
  window.dispatchEvent(new Event(ORDER_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(ORDER_EVENT, onChange)
  return () => { window.removeEventListener('storage', onChange); window.removeEventListener(ORDER_EVENT, onChange) }
}

/** The retailer's saved order (this browser only, for now). Null on the server, so both render the system order first. */
function useStoredOrder(key: string): string[] | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null)
  return useMemo(() => parseOrder(raw), [raw])
}

/**
 * Today's priorities. The system's ranking arrives as `items` and is never
 * changed; the retailer can arrange their own working order on top of it.
 *
 * For now that order is kept in this browser only (per retailer). Persisting
 * it, and learning from how it differs from ours, is recorded in
 * docs/intelligence.md.
 *
 * Every row with somewhere to go is one link. Reordering: drag the grip
 * (appears on hover/focus, desktop); focus the grip and use Up/Down
 * (keyboard); or the "⋯" menu (always there on touch screens).
 */
export function PriorityList({ items, storageKey, label, example = false }: {
  items: WorkItemView[]; storageKey: string; label: string; example?: boolean
}) {
  const stored = useStoredOrder(storageKey)
  // While dragging, the order lives here; it's saved when the drag ends.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null)
  const userOrder = dragOrder ?? stored
  const [dragging, setDragging] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const grips = useRef(new Map<string, HTMLButtonElement | null>())
  const rows = useRef(new Map<string, HTMLLIElement | null>())

  useEffect(() => {
    if (!menuFor) return
    const close = (e: Event) => {
      if (e instanceof globalThis.KeyboardEvent && e.key !== 'Escape') return
      if (e.type === 'pointerdown' && (e.target as HTMLElement).closest('[data-menu]')) return
      setMenuFor(null)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [menuFor])

  const current = applyUserOrder(items, userOrder)
  const ids = current.map((i) => i.id)
  const custom = isCustomOrder(items, current)

  function commit(next: string[], movedId?: string, focusGrip = false) {
    const same = next.every((id, i) => id === items[i]?.id) && next.length === items.length
    writeOrder(storageKey, same ? null : next)
    setDragOrder(null)
    if (movedId) {
      const item = current.find((i) => i.id === movedId)
      setAnnouncement(`${item?.title ?? 'Item'} moved to position ${next.indexOf(movedId) + 1} of ${next.length}.`)
      if (focusGrip) requestAnimationFrame(() => grips.current.get(movedId)?.focus())
    }
  }

  const moveBy = (id: string, delta: number, focusGrip = false) => commit(moveTo(ids, id, ids.indexOf(id) + delta), id, focusGrip)

  function onGripKey(e: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (e.key === 'ArrowUp') { e.preventDefault(); moveBy(id, -1, true) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveBy(id, 1, true) }
  }

  function onDragStart(e: DragEvent<HTMLButtonElement>, id: string) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    const row = rows.current.get(id)
    if (row) e.dataTransfer.setDragImage(row, 24, 24)
    setDragging(id)
  }

  function onDragOver(e: DragEvent<HTMLLIElement>, overId: string) {
    if (!dragging) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overId === dragging) return
    // Live reorder, but only once the pointer passes the middle of the row
    // it's over, so rows don't flicker back and forth.
    const from = ids.indexOf(dragging)
    const to = ids.indexOf(overId)
    const box = e.currentTarget.getBoundingClientRect()
    const pastMiddle = from < to ? e.clientY > box.top + box.height / 2 : e.clientY < box.top + box.height / 2
    if (pastMiddle) setDragOrder(moveTo(ids, dragging, to))
  }

  function onDragEnd() {
    if (dragging) commit(ids, dragging)
    setDragging(null)
  }

  return (
    <div className={styles.wrap}>
      <ul className={styles.list} aria-label={label}>
        {current.map((item, index) => {
          const href = item.action?.href
          const first = index === 0
          const last = index === current.length - 1
          return (
            <li
              key={item.id}
              ref={(el) => { rows.current.set(item.id, el) }}
              className={[styles.item, href && styles.linked, dragging === item.id && styles.dragging].filter(Boolean).join(' ')}
              onDragOver={(e) => onDragOver(e, item.id)}
              onDrop={(e) => e.preventDefault()}
            >
              <button
                type="button"
                ref={(el) => { grips.current.set(item.id, el) }}
                className={styles.grip}
                draggable
                aria-label={`Reorder: ${item.title}`}
                aria-describedby="priority-reorder-help"
                onDragStart={(e) => onDragStart(e, item.id)}
                onDragEnd={onDragEnd}
                onKeyDown={(e) => onGripKey(e, item.id)}
              >
                <Icon name="grip" />
              </button>

              <div className={styles.body}>
                {href
                  ? <Link href={href} className={styles.rowLink}>{item.title}</Link>
                  : <p className={styles.title}>{item.title}</p>}
                {item.detail && <p className={styles.detail}>{item.detail}</p>}
                {item.choices && <QuickAnswer name={`work-${item.id}`} prompt={item.title} choices={item.choices} example={example} />}
              </div>

              <span className={styles.go} aria-hidden="true">{href && <Icon name="chevron-right" />}</span>

              <div className={styles.more} data-menu>
                <button type="button" className={styles.moreButton} aria-label={`Move: ${item.title}`}
                  aria-expanded={menuFor === item.id} aria-controls={`${item.id}-menu`}
                  onClick={() => setMenuFor(menuFor === item.id ? null : item.id)}>
                  <Icon name="more" />
                </button>
                {menuFor === item.id && (
                  <div id={`${item.id}-menu`} className={styles.menu}>
                    <button type="button" disabled={first} onClick={() => { commit(moveTo(ids, item.id, 0), item.id); setMenuFor(null) }}>Move to top</button>
                    <button type="button" disabled={first} onClick={() => { moveBy(item.id, -1); setMenuFor(null) }}>Move up</button>
                    <button type="button" disabled={last} onClick={() => { moveBy(item.id, 1); setMenuFor(null) }}>Move down</button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {custom && (
        <button type="button" className={styles.reset} onClick={() => { commit(items.map((i) => i.id)); setAnnouncement('Back to the suggested order.') }}>
          Back to suggested order
        </button>
      )}
      <p id="priority-reorder-help" className="visually-hidden">Use the up and down arrow keys to move this item.</p>
      <p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>
    </div>
  )
}
