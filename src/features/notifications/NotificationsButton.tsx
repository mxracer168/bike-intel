'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useIntelligence } from '@/features/intelligence/IntelligencePanel'
import { topQuestions } from '@/features/intelligence/types'
import { Icon } from '@/ui/Icon'
import { questionNotifications, sortNotifications, type NotificationView } from './notifications'
import styles from './Notifications.module.css'

/*
 * Read state lives in this browser only (like the retailer's own priority
 * order): which notification ids this person has seen. Nothing is stored on
 * the server yet; see docs/architecture.md, "Notifications".
 */
const READ_EVENT = 'bi:notifications-read'
const MAX_READ = 300
const cache = new Map<string, { raw: string | null; ids: ReadonlySet<string> }>()

function readIds(key: string): ReadonlySet<string> {
  let raw: string | null = null
  try { raw = window.localStorage.getItem(key) } catch { /* storage blocked: nothing remembered */ }
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.ids
  let ids: string[] = []
  try { ids = raw ? (JSON.parse(raw) as string[]) : [] } catch { ids = [] }
  const value = { raw, ids: new Set(Array.isArray(ids) ? ids : []) }
  cache.set(key, value)
  return value.ids
}

function markRead(key: string, ids: string[]) {
  const next = [...new Set([...readIds(key), ...ids])].slice(-MAX_READ)
  try { window.localStorage.setItem(key, JSON.stringify(next)) } catch { /* not remembered */ }
  window.dispatchEvent(new Event(READ_EVENT))
}

const EMPTY: ReadonlySet<string> = new Set()
function useReadIds(key: string) {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('storage', onChange)
      window.addEventListener(READ_EVENT, onChange)
      return () => { window.removeEventListener('storage', onChange); window.removeEventListener(READ_EVENT, onChange) }
    },
    () => readIds(key),
    () => EMPTY,
  )
}

/**
 * The bell: what changed or needs attention. Shows a dot only while there is
 * something unread. Opening the panel shows what's new; closing it marks
 * those as read.
 */
export function NotificationsButton({ items, storageKey }: { items: NotificationView[]; storageKey: string }) {
  const api = useIntelligence()
  const [open, setOpen] = useState(false)
  const read = useReadIds(storageKey)
  const panelId = useId()
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  // Questions come from the live conversation, so answering one removes it here too.
  const all = useMemo(
    () => sortNotifications([...items, ...questionNotifications(topQuestions(api?.questions ?? []))]),
    [items, api?.questions],
  )
  const unread = all.filter((n) => !read.has(n.id))

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    markRead(storageKey, all.map((n) => n.id))
    if (returnFocus) button.current?.focus()
  }, [all, storageKey])

  // Escape and clicks elsewhere close the panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !button.current?.contains(t)) close(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) }
  }, [open, close])

  useEffect(() => { if (open) panel.current?.focus() }, [open])

  const label = unread.length > 0 ? `Notifications, ${unread.length} new` : 'Notifications'
  return (
    <div className={styles.wrap}>
      <button ref={button} type="button" className={styles.bell} aria-label={label} aria-expanded={open} aria-controls={panelId}
        onClick={() => (open ? close() : setOpen(true))}>
        <Icon name="bell" size={19} />
        {unread.length > 0 && <span className={styles.dot} aria-hidden="true" />}
      </button>

      {open && (
        <div ref={panel} id={panelId} className={styles.panel} role="dialog" aria-label="Notifications" tabIndex={-1}>
          <header className={styles.head}>
            <h2 className={styles.title}>Notifications</h2>
            {unread.length > 0 && (
              <button type="button" className={styles.markAll} onClick={() => markRead(storageKey, all.map((n) => n.id))}>Mark all as read</button>
            )}
          </header>
          {all.length === 0 ? (
            <p className={styles.empty}>You’re up to date. Problems, deadlines and new questions will show up here.</p>
          ) : (
            <ul className={styles.list}>
              {all.map((n) => {
                const isNew = !read.has(n.id)
                const body = (
                  <>
                    <span className={[styles.marker, isNew && styles.markerNew, n.attention && styles.markerAttention].filter(Boolean).join(' ')} aria-hidden="true" />
                    <span className={styles.text}>
                      <span className={styles.itemTitle}>{n.title}{isNew && <span className="visually-hidden"> (new)</span>}</span>
                      {n.detail && <span className={styles.itemDetail}>{n.detail}</span>}
                    </span>
                    <Icon name="chevron-right" size={14} />
                  </>
                )
                return (
                  <li key={n.id} className={isNew ? styles.unread : undefined}>
                    {n.href ? (
                      <Link href={n.href} className={styles.item} onClick={() => close(false)}>{body}</Link>
                    ) : (
                      <button type="button" className={styles.item} aria-haspopup="dialog"
                        onClick={() => { close(false); api?.open() }}>{body}</button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
