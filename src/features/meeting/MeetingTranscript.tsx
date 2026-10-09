'use client'

import { useEffect, useRef } from 'react'
import { NavIcon } from '@/ui/NavIcon'
import { ConceptIcon } from './icons'
import type { TranscriptLine } from './types'
import styles from './Meeting.module.css'

/**
 * The meeting as it's being said, under the call: the advisor's lines on the
 * left with the product mark, the retailer's on the right, each with its
 * time. Pinned to the newest line; the call above stays the hero.
 */
export function MeetingTranscript({ lines, current, live = true }: {
  lines: TranscriptLine[]; current: TranscriptLine | null; live?: boolean
}) {
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => pinToEnd(list.current), [lines.length])
  return (
    <section className={styles.transcriptCard} aria-labelledby="transcript-title">
      <header className={styles.transcriptHead}>
        <ConceptIcon name="chat" size={18} />
        <h2 id="transcript-title" className={styles.transcriptTitle}>Conversation</h2>
        {live && <span className={styles.live}><i aria-hidden="true" />Live</span>}
      </header>
      <ol ref={list} className={styles.transcript} tabIndex={0} aria-label="Transcript">
        {lines.map((l) => {
          const advisor = l.speaker === 'advisor'
          return (
            <li key={l.id} className={[styles.line, advisor ? styles.advisorLine : styles.youLine, l === current && styles.now].filter(Boolean).join(' ')}>
              {advisor && <span className={styles.lineMark} aria-hidden="true"><NavIcon name="brand" size={15} /></span>}
              <div className={styles.lineBody}>
                <p className={styles.who}>
                  <span>{advisor ? 'Advisor' : 'You'}</span>
                  {l.time && <time className={styles.time}>{l.time}</time>}
                </p>
                <p className={styles.words}>{l.text}</p>
              </div>
            </li>
          )
        })}
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
