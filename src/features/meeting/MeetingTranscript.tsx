'use client'

import { useEffect, useRef } from 'react'
import { ConceptIcon } from './icons'
import type { TranscriptLine } from './types'
import styles from './Meeting.module.css'

/**
 * The meeting as it's being said: speaker, time and words. No bubbles; the
 * advisor's lines carry a thin rule. Kept quieter than the call and the
 * agenda, and pinned to the newest line.
 */
export function MeetingTranscript({ lines, current, live = true }: {
  lines: TranscriptLine[]; current: TranscriptLine | null; live?: boolean
}) {
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => pinToEnd(list.current), [lines.length])
  return (
    <section className={styles.transcriptCard} aria-labelledby="transcript-title">
      <header className={styles.transcriptHead}>
        <ConceptIcon name="chat" size={22} />
        <h2 id="transcript-title" className={styles.transcriptTitle}>Conversation</h2>
        {live && <span className={styles.live}><i aria-hidden="true" />Live</span>}
      </header>
      <ol ref={list} className={styles.transcript} tabIndex={0} aria-label="Transcript">
        {lines.map((l) => (
          <li key={l.id} className={[styles.line, l.speaker === 'advisor' ? styles.advisorLine : styles.youLine, l === current && styles.now].filter(Boolean).join(' ')}>
            <p className={styles.who}>
              <span>{l.speaker === 'advisor' ? 'Advisor' : 'You'}</span>
              {l.time && <time className={styles.time}>{l.time}</time>}
            </p>
            <p className={styles.words}>{l.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Keeps a scrolling list showing its newest entries, also when its space
 * changes (the panel above it growing or shrinking).
 */
export function pinToEnd(el: HTMLElement | null) {
  if (!el) return
  el.scrollTop = el.scrollHeight
  const observer = new ResizeObserver(() => { el.scrollTop = el.scrollHeight })
  observer.observe(el)
  return () => observer.disconnect()
}
