'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { searchAction } from '@/server/actions/search'
import { Icon } from '@/ui/Icon'
import { pageEntries } from './pages'
import type { SearchEntry, SearchResultGroup } from './search'
import styles from './Search.module.css'

const SearchContext = createContext<{ open: () => void } | null>(null)

/**
 * Global search, one dialog for the whole app. Opens from the search control
 * in the top bar or with ⌘K / Ctrl K anywhere.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const api = useMemo(() => ({ open: () => setOpen(true) }), [])
  return (
    <SearchContext.Provider value={api}>
      {children}
      <SearchDialog open={open} onClose={() => setOpen(false)} />
    </SearchContext.Provider>
  )
}

/** "⌘K" on a Mac, "Ctrl K" elsewhere; nothing until the browser is known. */
function useShortcutLabel() {
  return useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K'),
    () => null,
  )
}

/** The quiet search control: "Search" with its shortcut, or just the icon on phones. */
export function SearchButton({ compact = false }: { compact?: boolean }) {
  const api = useContext(SearchContext)
  const shortcut = useShortcutLabel()
  if (!api) return null
  return (
    <button type="button" className={compact ? styles.iconButton : styles.trigger} onClick={api.open}
      aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K" aria-label={compact ? 'Search' : undefined}>
      <Icon name="search" size={compact ? 18 : 17} />
      {!compact && <span>Search</span>}
      {!compact && shortcut && <kbd className={styles.kbd}>{shortcut}</kbd>}
    </button>
  )
}

const PAGES: SearchResultGroup[] = [{ group: 'page', label: 'Go to', results: pageEntries() }]

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchResultGroup[]>(PAGES)
  const [pending, setPending] = useState(false)
  const [active, setActive] = useState(0)
  const latest = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) { d.showModal(); input.current?.focus() }
    if (!open && d.open) d.close()
  }, [open])

  // Ask the server after a short pause; only the latest answer counts.
  function search(next: string) {
    setQuery(next)
    setActive(0)
    if (timer.current) clearTimeout(timer.current)
    const ticket = ++latest.current
    const q = next.trim()
    if (!q) { setGroups(PAGES); setPending(false); return }
    setPending(true)
    timer.current = setTimeout(async () => {
      const found = await searchAction(q).catch(() => [])
      if (ticket !== latest.current) return
      setGroups(found)
      setPending(false)
    }, 140)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const flat = useMemo(() => groups.flatMap((g) => g.results), [groups])
  const go = useCallback((entry: SearchEntry) => {
    dialog.current?.close()
    router.push(entry.href)
  }, [router])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); go(flat[active]) }
  }

  // Keep the highlighted result in view.
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId])

  const closed = () => { search(''); onClose() }
  const q = query.trim()
  // Each result's position in the whole list, for keyboard movement.
  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((n, g) => n + g.results.length, 0))
  return (
    <dialog ref={dialog} className={styles.dialog} aria-label="Search" onClose={closed}
      onClick={(e) => { if (e.target === dialog.current) dialog.current?.close() }}>
      <div className={styles.field}>
        <Icon name="search" size={18} />
        <input ref={input} className={styles.input} value={query} onChange={(e) => search(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Search pages, suppliers, orders, products…" aria-label="Search"
          role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={flat[active] ? `${listId}-${active}` : undefined} />
        <kbd className={styles.kbd}>Esc</kbd>
      </div>
      <div className={styles.results} id={listId} role="listbox" aria-label="Results">
        {groups.map((g, gi) => (
          <div key={g.group} role="group" aria-labelledby={`${listId}-${g.group}`} className={styles.group}>
            <p id={`${listId}-${g.group}`} className={styles.groupLabel}>{g.label}</p>
            {g.results.map((r, ri) => {
              const i = starts[gi]! + ri
              return (
                <div key={r.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                  className={[styles.result, i === active && styles.active].filter(Boolean).join(' ')}
                  onMouseMove={() => setActive(i)} onClick={() => go(r)}>
                  <span className={styles.resultText}>
                    <span className={styles.resultTitle}>{r.title}</span>
                    {r.detail && <span className={styles.resultDetail}>{r.detail}</span>}
                  </span>
                  <Icon name="arrow-right" size={14} />
                </div>
              )
            })}
          </div>
        ))}
        {q && !pending && groups.length === 0 && (
          <p className={styles.empty}>
            Nothing matches “{q}”. Search covers pages, suppliers, orders, products, programs, connections and locations.
          </p>
        )}
      </div>
      <p className={styles.foot} aria-live="polite">
        {pending ? 'Searching…' : <><kbd className={styles.kbd}>↑</kbd><kbd className={styles.kbd}>↓</kbd> to move · <kbd className={styles.kbd}>Enter</kbd> to open</>}
      </p>
    </dialog>
  )
}
