'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  answerQuestionAction, deferQuestionAction, loadConversationAction, sendMessageAction, uploadAttachmentAction,
} from '@/server/actions/intelligence'
import { ExampleMarker } from '@/ui/Example'
import { Icon } from '@/ui/Icon'
import { Composer, type ComposerHandle } from './Composer'
import { QuestionBlock } from './QuestionBlock'
import { Transcript } from './Transcript'
import { topQuestions, type ConversationEntry, type IntelligenceQuestionView } from './types'
import styles from './Intelligence.module.css'

type Surface = 'panel' | 'check_in' | 'order'

type IntelligenceApi = {
  /** Opens the conversation; optionally ready to answer one question in words. */
  open: (options?: { tellUsMoreFor?: string }) => void
  questions: IntelligenceQuestionView[]
  answer: (id: string, choice: string | null, body: string | null, surface: Surface) => Promise<string | null>
  defer: (id: string) => Promise<void>
}

const Intelligence = createContext<IntelligenceApi | null>(null)

/** The retailer's intelligence conversation, from anywhere in the app. */
export function useIntelligence() {
  return useContext(Intelligence)
}

type Load = { state: 'idle' | 'loading' | 'ready' | 'unavailable' | 'failed'; entries: ConversationEntry[] }

/**
 * One ongoing, private conversation per retailer. History and questions
 * live in the database; example questions (development only) live here and
 * are never saved. A native <dialog> gives focus trapping, Escape to close
 * and focus return to whatever opened it.
 */
export function IntelligenceProvider({ retailerName, questions: initialQuestions, exampleQuestions, children }: {
  retailerName: string
  questions: IntelligenceQuestionView[]
  exampleQuestions: IntelligenceQuestionView[]
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const composer = useRef<ComposerHandle>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [load, setLoad] = useState<Load>({ state: 'idle', entries: [] })
  const [questions, setQuestions] = useState<IntelligenceQuestionView[]>(() => [...initialQuestions, ...exampleQuestions])
  const [tellUsMoreFor, setTellUsMoreFor] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  // Questions set aside with "Not now" during this visit; they return at the next check-in.
  const [setAside, setSetAside] = useState<ReadonlySet<string>>(new Set())

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }))
  }, [])

  const refresh = useCallback(async () => {
    setLoad((l) => ({ ...l, state: l.entries.length ? l.state : 'loading' }))
    try {
      const c = await loadConversationAction()
      if (!c.available) return setLoad({ state: 'unavailable', entries: [] })
      setLoad({ state: 'ready', entries: c.entries })
      // Real questions from the server, example questions as they are locally.
      setQuestions((qs) => [...c.questions, ...qs.filter((q) => q.example)])
      scrollToEnd()
    } catch {
      setLoad((l) => ({ ...l, state: 'failed' }))
    }
  }, [scrollToEnd])

  const open = useCallback((options?: { tellUsMoreFor?: string }) => {
    setProblem(null)
    setTellUsMoreFor(options?.tellUsMoreFor ?? null)
    dialog.current?.showModal()
    if (load.state === 'idle' || load.state === 'failed') void refresh()
    else scrollToEnd()
    requestAnimationFrame(() => composer.current?.focus())
  }, [load.state, refresh, scrollToEnd])

  const answer = useCallback(async (id: string, choice: string | null, body: string | null, surface: Surface) => {
    const q = questions.find((x) => x.id === id)
    if (!q) return 'That question is no longer open.'
    if (!q.example) {
      const r = await answerQuestionAction({ questionId: id, choice, body, surface })
      if (!r.ok) return r.message
    }
    setQuestions((qs) => qs.map((x) => (x.id === id ? { ...x, status: 'answered', answer: { choice, body } } : x)))
    return null
  }, [questions])

  const defer = useCallback(async (id: string) => {
    const q = questions.find((x) => x.id === id)
    if (q && !q.example) {
      const r = await deferQuestionAction(id)
      if (!r.ok) return setProblem(r.message)
    }
    setQuestions((qs) => qs.map((x) => (x.id === id ? { ...x, status: 'deferred' } : x)))
    setSetAside((s) => new Set(s).add(id))
  }, [questions])

  const api = useMemo<IntelligenceApi>(() => ({ open, questions, answer, defer }), [open, questions, answer, defer])

  // Questions asked this week: open ones first, then any answered here so the answer stays in view.
  const asked = useMemo(() => {
    const live = questions.filter((q) => !setAside.has(q.id))
    const open = topQuestions(live)
    const answeredHere = live.filter((q) => q.status === 'answered' && q.answer)
    return [...answeredHere, ...open]
  }, [questions, setAside])
  const tellUsMoreQuestion = questions.find((q) => q.id === tellUsMoreFor) ?? null
  const showExampleMarker = asked.some((q) => q.example)

  async function send(text: string) {
    setProblem(null)
    if (tellUsMoreQuestion) {
      const message = await answer(tellUsMoreQuestion.id, null, text, 'panel')
      if (message) { setProblem(message); return false }
      setTellUsMoreFor(null)
      return true
    }
    const r = await sendMessageAction(text)
    if (!r.ok) { setProblem(r.message); return false }
    setLoad((l) => ({ ...l, entries: [...l.entries, r.value] }))
    scrollToEnd()
    return true
  }

  async function attach(file: File) {
    setProblem(null)
    setPending(file.name)
    scrollToEnd()
    const form = new FormData()
    form.set('file', file)
    const r = await uploadAttachmentAction(form)
    setPending(null)
    if (!r.ok) return setProblem(r.message)
    setLoad((l) => ({ ...l, entries: [...l.entries, r.value] }))
    scrollToEnd()
  }

  // The composer can only take focus once the conversation has loaded.
  useEffect(() => {
    if (load.state === 'ready' && dialog.current?.open) composer.current?.focus()
  }, [load.state])

  useEffect(() => {
    const d = dialog.current
    const onClose = () => setTellUsMoreFor(null)
    d?.addEventListener('close', onClose)
    return () => d?.removeEventListener('close', onClose)
  }, [])

  const canWrite = load.state === 'ready' || (load.state === 'loading' && load.entries.length > 0)

  return (
    <Intelligence.Provider value={api}>
      {children}
      <dialog ref={dialog} className={styles.panel} aria-labelledby="intelligence-title"
        onClick={(e) => { if (e.target === dialog.current) dialog.current?.close() }}>
        <header className={styles.head}>
          <div>
            <h2 id="intelligence-title" className={styles.title}>{retailerName}</h2>
            <p className={styles.subtitle}>Private to your team</p>
          </div>
          <button type="button" className={styles.close} aria-label="Close" onClick={() => dialog.current?.close()}>
            <Icon name="close" />
          </button>
        </header>

        <div ref={scroller} className={styles.scroll}>
          {load.state === 'loading' && load.entries.length === 0 && <p className={styles.quiet}>Loading…</p>}
          {load.state === 'failed' && <p className={styles.quiet}>We couldn’t load your conversation. Close this and try again.</p>}
          {load.state === 'unavailable' && <p className={styles.quiet}>Your conversation isn’t set up yet.</p>}
          {load.state === 'ready' && load.entries.length === 0 && (
            <p className={styles.intro}>
              Tell us anything about your business: plans, changes, what’s working, what isn’t. It shapes what we suggest, and it stays here for next time.
            </p>
          )}
          <Transcript entries={load.entries} pending={pending} />
          {asked.length > 0 && (
            <QuestionBlock
              questions={asked}
              marker={showExampleMarker ? <ExampleMarker /> : null}
              onAnswer={(id, choice) => answer(id, choice, null, 'panel')}
              onTellUsMore={(id) => { setTellUsMoreFor(id); composer.current?.focus() }}
              onDefer={defer}
            />
          )}
        </div>

        <Composer
          ref={composer}
          disabled={!canWrite}
          replyingTo={tellUsMoreQuestion?.prompt ?? null}
          onCancelReply={() => setTellUsMoreFor(null)}
          onSend={send}
          onAttach={attach}
          problem={problem}
        />
      </dialog>
    </Intelligence.Provider>
  )
}

/** The global entry point: small, quiet, always in the same place. */
export function AddContextButton({ compact = false }: { compact?: boolean }) {
  const api = useIntelligence()
  if (!api) return null
  return (
    <button type="button" className={[styles.entry, compact && styles.compact].filter(Boolean).join(' ')}
      aria-haspopup="dialog" onClick={() => api.open()}>
      Add context
    </button>
  )
}
