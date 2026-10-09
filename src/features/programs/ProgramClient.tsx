'use client'

import { useId, useState, type ReactNode } from 'react'
import { FitExplanation } from '@/features/suppliers/ProgramFit'
import type { ProgramFitView } from '@/features/suppliers/programFit'
import { Button, buttonClassName } from '@/ui/Button'
import { Changed } from '@/ui/Changed'
import { Icon } from '@/ui/Icon'
import motion from '@/ui/Motion.module.css'
import { feedbackMessage, mailtoHref } from './format'
import type { ProgramAnalysis } from './types'
import styles from './Programs.module.css'

/**
 * The assessment card with "Why this fit?": the reasons open across the
 * bottom of the card, on the pale-blue analysis area.
 */
export function AssessmentCard({ fit, retailerName, programName, children }: {
  fit?: ProgramFitView
  retailerName: string
  programName: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <section className={[styles.assessment, motion.surface].join(' ')} aria-label="Assessment">
      <div className={styles.assessmentGrid}>{children}</div>
      {fit && (
        <>
          <button type="button" className={styles.why} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide why' : 'Why this fit?'}
            <Icon name="chevron-down" size={14} />
          </button>
          <div id={id} hidden={!open} className={[styles.whyDetail, motion.reveal].join(' ')} aria-label={`Why ${programName} fits`} role="region">
            <FitExplanation fit={fit} retailerName={retailerName} />
          </div>
        </>
      )}
    </section>
  )
}

/**
 * Negotiating points: the retailer picks the changes that matter, adds a
 * note, and gets a plain message for their rep to copy or open in their own
 * email. Nothing is stored or sent from here.
 */
export function RepFeedback({ asks, programName, retailerName, rep }: {
  asks: ProgramAnalysis['asks']
  programName: string
  retailerName: string
  rep?: { name?: string; email?: string }
}) {
  const [selected, setSelected] = useState<string[]>(() => asks.map((a) => a.title))
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<{ subject: string; body: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const noteId = useId()
  const draftId = useId()
  const repFirst = rep?.name?.split(' ')[0]

  function toggle(title: string) {
    setMessage(null)
    setSelected((s) => (s.includes(title) ? s.filter((t) => t !== title) : [...s, title]))
  }

  function prepare() {
    setCopied(false)
    setMessage(feedbackMessage({
      programName, retailerName, repName: rep?.name, note,
      asks: asks.filter((a) => selected.includes(a.title)),
    }))
  }

  async function copy() {
    if (!message) return
    try {
      await navigator.clipboard.writeText(message.body)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked: the message is on screen to select by hand.
    }
  }

  return (
    <div className={styles.asksCard}>
      <fieldset className={styles.asks}>
        <legend className="visually-hidden">Changes to ask for</legend>
        {asks.map((a) => {
          const on = selected.includes(a.title)
          return (
            <label key={a.title} className={[styles.ask, on && styles.askOn].filter(Boolean).join(' ')}>
              <input type="checkbox" className={styles.askInput} checked={on} onChange={() => toggle(a.title)} />
              <span className={styles.askBox} aria-hidden="true">{on && <Icon name="check" size={12} />}</span>
              <span className={styles.askText}>
                <span className={styles.askTitle}>{a.title}</span>
                <span className={styles.askRequest}>{a.request}</span>
                <span className={styles.askImpact}>{a.impact}</span>
              </span>
            </label>
          )
        })}
      </fieldset>

      <div className={styles.feedback}>
        <label className={styles.noteLabel} htmlFor={noteId}>Add anything your rep should understand</label>
        <textarea id={noteId} className={styles.note} rows={3} value={note}
          placeholder="For example: We can commit more deeply if exchanges are available."
          onChange={(e) => { setNote(e.target.value); setMessage(null) }} />
        <div className={styles.feedbackFoot}>
          <p className={styles.count}>
            <Changed value={selected.length}>{selected.length}</Changed> {selected.length === 1 ? 'request' : 'requests'} selected
          </p>
          <Button variant="primary" disabled={selected.length === 0} onClick={prepare} aria-controls={draftId}>
            Prepare feedback for {repFirst ?? 'your rep'}
          </Button>
        </div>

        <div id={draftId} aria-live="polite">
          {message && (
            <div className={[styles.draft, motion.reveal].join(' ')}>
              <p className={styles.draftTitle}>Your message{rep?.name ? ` to ${rep.name}` : ''}</p>
              <textarea className={styles.draftBody} readOnly value={message.body} rows={10} aria-label="Feedback message" />
              <div className={styles.draftActions}>
                <a className={buttonClassName({ variant: 'secondary' })} href={mailtoHref(rep?.email, message)}>
                  <Icon name="external" size={15} /> Open in email
                </a>
                <Button variant="quiet" onClick={copy}>
                  <Icon name={copied ? 'check' : 'copy'} size={15} /> {copied ? 'Copied' : 'Copy message'}
                </Button>
              </div>
              <p className={styles.draftNote}>Nothing is sent for you. Send it from your own email when you’re ready.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
