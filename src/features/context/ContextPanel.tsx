'use client'

import { createContext, useContext, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/ui/Button'
import { Icon } from '@/ui/Icon'
import { QuickAnswer } from '@/features/work/QuickAnswer'
import { topQuestions, type ContextQuestion } from './types'
import styles from './ContextPanel.module.css'

const OpenContext = createContext<(() => void) | null>(null)

/** Opens the context panel from anywhere in the shell; null when the panel isn't available. */
export function useOpenContext() {
  return useContext(OpenContext)
}

/**
 * Lightweight context gathering: one short note (typed or dictated with the
 * device's own dictation) and at most three questions. A side panel built on
 * a native <dialog> (focus trap, Escape, inert background), never a page.
 */
export function ContextProvider({ questions, example = false, children }: {
  questions: ContextQuestion[]; example?: boolean; children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [saved, setSaved] = useState(false)
  const noteId = useId()
  const asked = topQuestions(questions)
  const open = () => { setSaved(false); dialog.current?.showModal() }

  return (
    <OpenContext.Provider value={open}>
      {children}
      <dialog ref={dialog} className={styles.panel} aria-labelledby={`${noteId}-title`}
        onClick={(e) => { if (e.target === dialog.current) dialog.current?.close() }}>
        <div className={styles.head}>
          <h2 id={`${noteId}-title`} className={styles.title}>Add context</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={() => dialog.current?.close()}>
            <Icon name="close" />
          </button>
        </div>

        <form className={styles.note} onSubmit={(e) => {
          e.preventDefault()
          e.currentTarget.reset()
          setSaved(true)
        }}>
          <label htmlFor={noteId} className={styles.label}>What should we know?</label>
          <textarea id={noteId} name="note" rows={3} maxLength={500} required className={styles.input}
            placeholder="We’re closed for inventory the first week of January." autoCapitalize="sentences" enterKeyHint="done" />
          <div className={styles.actions}>
            <Button type="submit" variant="primary" size="sm">Add note</Button>
            {saved && (
              <p role="status" className={styles.thanks}>
                {example ? 'Thanks. This is example data, so nothing was saved.' : 'Thanks, we’ll take that into account.'}
              </p>
            )}
          </div>
        </form>

        {asked.length > 0 && (
          <section className={styles.questions} aria-labelledby={`${noteId}-q`}>
            <h3 id={`${noteId}-q`} className={styles.label}>We’d like to know</h3>
            <ol className={styles.list}>
              {asked.map((q) => (
                <li key={q.id} className={styles.question}>
                  <p>{q.prompt}</p>
                  <QuickAnswer name={`ctx-${q.id}`} prompt={q.prompt} choices={q.choices} example={example} />
                </li>
              ))}
            </ol>
          </section>
        )}
      </dialog>
    </OpenContext.Provider>
  )
}

/** The global entry point: small, quiet, always in the same place. */
export function AddContextButton({ compact = false }: { compact?: boolean }) {
  const open = useOpenContext()
  if (!open) return null
  return (
    <button type="button" className={[styles.entry, compact && styles.compact].filter(Boolean).join(' ')}
      aria-haspopup="dialog" onClick={open}>
      Add context
    </button>
  )
}
