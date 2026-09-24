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
  /** How many questions are waiting in "Questions for you" right now. */
  openCount: number
  answer: (id: string, choice: string | null, body: string | null, surface: Surface) => Promise<string | null>
  defer: (id: string) => Promise<void>
}

const Intelligence = createContext<IntelligenceApi | null>(null)

/** The retailer's intelligence conversation, from anywhere in the app. */
export function useIntelligence() {
  return useContext(Intelligence)
}

/** A written answer to an example question: shown for this visit only, never saved. */
function exampleAnswer(prompt: string, body: string): ConversationEntry {
  return {
    id: `example-${Date.now()}`, kind: 'answer', author: 'you', authorId: null, body, createdAt: new Date().toISOString(),
    questionId: null, answerChoice: null, attachment: null, question: { prompt }, example: true,
  }
}

type Load = { state: 'idle' | 'loading' | 'ready' | 'unavailable' | 'failed'; entries: ConversationEntry[] }

/**
 * One ongoing, private conversation per retailer. History and questions
 * live in the database; example questions (development only) live here and
 * are never saved. A native <dialog> gives focus trapping, Escape to close
 * and focus return to whatever opened it.
 */
export function IntelligenceProvider({ retailerName, questions: initialQuestions, exampleQuestions, exampleConversation, children }: {
  retailerName: string
  questions: IntelligenceQuestionView[]
  exampleQuestions: IntelligenceQuestionView[]
  /** Development only: an illustrative conversation shown before the real one, never saved. */
  exampleConversation: ConversationEntry[]
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
  // Questions handled (answered or set aside) during this visit, for "2 of 3".
  const [handled, setHandled] = useState(0)
  // Collapsing only hides the questions; they stay open.
  const [collapsed, setCollapsed] = useState(false)

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
    setHandled((n) => n + 1)
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
    setHandled((n) => n + 1)
  }, [questions])

  // Questions for you: still open, not set aside, at most three. Answered ones leave the list.
  const asked = useMemo(() => topQuestions(questions.filter((q) => !setAside.has(q.id))), [questions, setAside])
  const api = useMemo<IntelligenceApi>(
    () => ({ open, questions, openCount: asked.length, answer, defer }),
    [open, questions, asked.length, answer, defer],
  )

  const tellUsMoreQuestion = questions.find((q) => q.id === tellUsMoreFor) ?? null

  async function send(text: string) {
    setProblem(null)
    if (tellUsMoreQuestion) {
      // A written answer resolves the question and belongs in the conversation.
      const q = tellUsMoreQuestion
      const message = await answer(q.id, null, text, 'panel')
      if (message) { setProblem(message); return false }
      setTellUsMoreFor(null)
      if (q.example) {
        setLoad((l) => ({ ...l, entries: [...l.entries, exampleAnswer(q.prompt, text)] }))
        scrollToEnd()
      } else {
        void refresh()
      }
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

        <div ref={scroller} className={styles.scroll} tabIndex={0} role="region" aria-label="Conversation history">
          {exampleConversation.length > 0 && (
            <section aria-label="Example conversation" className={styles.example}>
              <p className={styles.day}>Example conversation <ExampleMarker /></p>
              <Transcript entries={exampleConversation} pending={null} label="Example conversation" />
            </section>
          )}
          {load.state === 'loading' && load.entries.length === 0 && <p className={styles.quiet}>Loading…</p>}
          {load.state === 'failed' && <p className={styles.quiet}>I couldn’t load our conversation. Close this and try again.</p>}
          {(load.state === 'unavailable' || load.state === 'ready') && load.entries.length === 0 && exampleConversation.length === 0 && (
            <div className={styles.intro}>
              <p>Ask me anything about {retailerName}, or tell me something I should know.</p>
              <p className={styles.introMore}>I use what you tell me, along with your business data, to make better recommendations.</p>
            </div>
          )}
          <Transcript entries={load.entries} pending={pending} />
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

        {asked.length > 0 && (
          <QuestionBlock
            questions={asked}
            position={handled + 1}
            total={handled + asked.length}
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
            replyingTo={tellUsMoreFor}
            marker={asked.some((q) => q.example) ? <ExampleMarker /> : null}
            onAnswer={(id, choice) => answer(id, choice, null, 'panel')}
            onTellUsMore={(id) => { setCollapsed(false); setTellUsMoreFor(id); composer.current?.focus() }}
            onDefer={defer}
          />
        )}
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
