'use client'

import { forwardRef, useId, useImperativeHandle, useRef, useState } from 'react'
import { ATTACHMENT_ACCEPT } from '@/domain/intelligence/attachments'
import { Icon } from '@/ui/Icon'
import styles from './Intelligence.module.css'

export type ComposerHandle = { focus: () => void }

/**
 * The one way in: attach, write (or dictate with the device's own
 * dictation), send. Enter sends; Shift+Enter starts a new line.
 */
export const Composer = forwardRef<ComposerHandle, {
  disabled: boolean
  replyingTo: string | null
  onCancelReply: () => void
  onSend: (text: string) => Promise<boolean>
  onAttach: (file: File) => void
  problem: string | null
}>(function Composer({ disabled, replyingTo, onCancelReply, onSend, onAttach, problem }, ref) {
  const input = useRef<HTMLTextAreaElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [hint, setHint] = useState(false)
  const id = useId()

  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }), [])

  function grow() {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }

  async function send() {
    const value = text.trim()
    if (!value || sending || disabled) return
    setSending(true)
    const ok = await onSend(value)
    setSending(false)
    if (ok) {
      setText('')
      requestAnimationFrame(grow)
    }
    input.current?.focus()
  }

  return (
    <div className={styles.composerArea}>
      {replyingTo && (
        <p className={styles.replying}>
          <span>Answering: {replyingTo}</span>
          <button type="button" className={styles.linkButton} onClick={onCancelReply}>Cancel</button>
        </p>
      )}
      <form className={styles.composer} onSubmit={(e) => { e.preventDefault(); void send() }}>
        <button type="button" className={styles.iconButton} aria-label="Add a file" disabled={disabled}
          onClick={() => file.current?.click()}>
          <Icon name="plus" size={18} />
        </button>
        <input ref={file} type="file" accept={ATTACHMENT_ACCEPT} hidden tabIndex={-1}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = '' }} />
        <label htmlFor={id} className="visually-hidden">{replyingTo ? 'Your answer' : 'Message'}</label>
        <textarea
          ref={input} id={id} rows={1} value={text} disabled={disabled}
          placeholder={replyingTo ? 'Your answer' : 'Ask or tell us anything'}
          className={styles.input} maxLength={10000} autoCapitalize="sentences" enterKeyHint="send"
          onChange={(e) => { setText(e.target.value); grow() }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() }
          }}
        />
        <button type="button" className={styles.iconButton} aria-label="Dictate" aria-describedby={hint ? `${id}-hint` : undefined}
          disabled={disabled} onClick={() => { input.current?.focus(); setHint(true) }}>
          <Icon name="mic" size={18} />
        </button>
        <button type="submit" className={styles.send} aria-label="Send" disabled={disabled || sending || !text.trim()}>
          <Icon name="arrow-up" size={16} />
        </button>
      </form>
      {hint && <p id={`${id}-hint`} className={styles.hint} role="status">Use the microphone on your keyboard to dictate.</p>}
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
    </div>
  )
})
