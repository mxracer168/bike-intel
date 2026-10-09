'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/ui/Icon'
import type { TranscriptLine } from './types'
import styles from './Meeting.module.css'

export type Participant = { name: string; detail?: string; image: string }

/**
 * The call: the advisor large, the line being said as a caption, the
 * advisor's name and what the meeting is doing, and three controls. There is
 * no picture of the retailer: we never ask them to turn on a camera. Mute and
 * captions are local to the screen; nothing here uses a camera or microphone.
 */
export function MeetingStage({ advisor, current, status, live = true, leaveHref = '/' }: {
  advisor: Participant; current: TranscriptLine | null
  /** One line under the advisor's name: what the meeting is doing now. */
  status?: string
  live?: boolean
  leaveHref?: string
}) {
  const [captions, setCaptions] = useState(true)
  const [muted, setMuted] = useState(false)
  return (
    <section className={styles.stage} aria-label={`Call with ${advisor.name.toLowerCase()}`}>
      <Portrait src={advisor.image} alt={advisor.name} note="Advisor image" />
      <div className={styles.stageShade} aria-hidden="true" />

      <p className={styles.livePill}>
        <i aria-hidden="true" className={live ? styles.liveDot : styles.endedDot} />
        {live ? 'Live' : 'Call ended'}
        {current?.speaker === 'advisor' && live && <Speaking />}
      </p>

      {captions && current && (
        <p className={styles.captions} aria-live="polite">
          <span className={styles.captionWho}>{current.speaker === 'advisor' ? 'Advisor' : 'You'}</span>
          {current.text}
        </p>
      )}

      <div className={styles.stageFoot}>
        <div className={styles.nameTag}>
          <span className={styles.name}>{advisor.name}</span>
          {(status ?? advisor.detail) && <span className={styles.nameSub}>{status ?? advisor.detail}</span>}
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.control} aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted((v) => !v)}>
            <Icon name={muted ? 'mic-off' : 'mic'} size={20} />
          </button>
          <button type="button" className={styles.control} aria-pressed={captions} aria-label="Captions" onClick={() => setCaptions((v) => !v)}>
            <Icon name="captions" size={20} />
          </button>
          <Link href={leaveHref} className={styles.leave}><Icon name="phone-down" size={20} />Leave</Link>
        </div>
      </div>
    </section>
  )
}

/** Three quiet bars while the advisor speaks. Still when motion is reduced. */
function Speaking() {
  return <span className={styles.speaking} aria-label="Speaking" role="img"><i /><i /><i /></span>
}

/**
 * A photo if one has been provided at `src`, otherwise a clearly marked
 * placeholder. The photo shows only once it has actually loaded.
 */
function Portrait({ src, alt, note }: { src: string; alt: string; note?: string }) {
  const [loaded, setLoaded] = useState(false)
  const img = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth > 0) setLoaded(true)
  }, [])
  return (
    <div className={styles.portrait}>
      {!loaded && (
        <div className={styles.placeholder} aria-hidden="true">
          <svg viewBox="0 0 120 120" className={styles.silhouette}>
            <circle cx="60" cy="46" r="22" />
            <path d="M20 112c4-24 20-36 40-36s36 12 40 36z" />
          </svg>
          {note && <span className={styles.placeholderNote}>{note} placeholder</span>}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- optional local demo asset */}
      <img ref={img} src={src} alt={loaded ? alt : ''} className={styles.photo} data-loaded={loaded || undefined}
        onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />
    </div>
  )
}
