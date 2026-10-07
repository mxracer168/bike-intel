'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Button, ButtonLink } from '@/ui/Button'
import { Field, Select } from '@/ui/Field'
import { Icon } from '@/ui/Icon'
import { callState, clampSaid, type CheckInOffer, type Learned, type OnboardingScript, type ScriptLine, type TopicState } from './script'
import styles from './OnboardingCall.module.css'

/**
 * The first conversation with a retailer, as a call with their buying
 * advisor: the advisor and a small self view, a transcript, what we're
 * learning, and the topics for today. It ends by offering the weekly
 * check-in, which continues in the same conversation the retailer can open
 * any time from the app.
 *
 * Prototype: a presenter steps through a scripted conversation (→ and ←, or
 * the quiet controls underneath). No camera, microphone, speech or AI.
 */
export function OnboardingCall({ script, initial, example }: { script: OnboardingScript; initial: number; example?: boolean }) {
  const [said, setSaid] = useState(() => clampSaid(script, initial))
  const [captions, setCaptions] = useState(true)
  const [muted, setMuted] = useState(false)
  const state = callState(script, said)
  const step = (by: number) => setSaid((n) => clampSaid(script, n + by))

  // Presenter keys: → next line, ← back. Ignored while typing or choosing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if ((e.target as HTMLElement).closest('input, select, textarea, [contenteditable="true"]')) return
      if (e.key === 'ArrowRight') { e.preventDefault(); setSaid((n) => clampSaid(script, n + 1)) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSaid((n) => clampSaid(script, n - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [script])

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Getting to know {script.retailer}</h1>
        <p className={styles.lead}>We don’t just analyze your sales data. We learn how your business works.</p>
      </header>

      <div className={styles.call}>
        <div className={styles.main}>
          <Stage current={state.current} captions={captions} muted={muted}
            onCaptions={() => setCaptions((v) => !v)} onMute={() => setMuted((v) => !v)} />
          {state.finished
            ? <CheckIn offer={script.checkIn} example={example} />
            : <Topics topics={state.topics} />}
        </div>

        <aside className={styles.side} aria-label="Conversation and what we’re learning">
          <div className={styles.sideInner}>
            <Transcript lines={state.said} current={state.current} />
            <Learning learned={state.learned} fresh={state.current?.learned ?? []} />
          </div>
        </aside>
      </div>

      {example && (
        <nav className={styles.presenter} aria-label="Example conversation">
          <span>Example conversation · use ← → to step through</span>
          <button type="button" onClick={() => step(-1)} disabled={said <= 1}>Back</button>
          <button type="button" onClick={() => step(1)} disabled={state.finished}>Next</button>
          {!state.wrapping && <button type="button" onClick={() => setSaid(script.wrapAt + 1)}>Go to wrap-up</button>}
        </nav>
      )}
    </div>
  )
}

/** The call itself: the advisor large, the retailer small, captions and three controls. */
function Stage({ current, captions, muted, onCaptions, onMute }: {
  current: ScriptLine | null; captions: boolean; muted: boolean; onCaptions: () => void; onMute: () => void
}) {
  const advisorSpeaking = current?.speaker === 'advisor'
  return (
    <section className={styles.stage} aria-label="Call with your buying advisor">
      <Portrait src="/demo/advisor.jpg" alt="Your buying advisor" note="Advisor image" />

      <div className={styles.nameTag}>
        <span className={styles.name}>Your buying advisor</span>
        <span className={styles.nameSub}>Buying Intelligence</span>
        {advisorSpeaking && <Speaking />}
      </div>

      <div className={[styles.self, current?.speaker === 'retailer' && !muted && styles.selfSpeaking].filter(Boolean).join(' ')}>
        <Portrait src="/demo/you.jpg" alt="You" small />
        <span className={styles.selfLabel}>{muted && <Icon name="mic-off" size={12} label="Muted" />}You</span>
      </div>

      {captions && current && (
        <p className={styles.captions} aria-live="polite">
          <span className={styles.captionWho}>{current.speaker === 'advisor' ? 'Advisor' : 'You'}</span>
          {current.text}
        </p>
      )}

      <div className={styles.controls}>
        <button type="button" className={styles.control} aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'} onClick={onMute}>
          <Icon name={muted ? 'mic-off' : 'mic'} size={20} />
        </button>
        <button type="button" className={styles.control} aria-pressed={captions} aria-label="Captions" onClick={onCaptions}>
          <Icon name="captions" size={20} />
        </button>
        <Link href="/" className={styles.leave}><Icon name="phone-down" size={20} />Leave</Link>
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
function Portrait({ src, alt, note, small }: { src: string; alt: string; note?: string; small?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const img = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth > 0) setLoaded(true)
  }, [])
  return (
    <div className={[styles.portrait, small && styles.portraitSmall].filter(Boolean).join(' ')}>
      {!loaded && (
        <div className={styles.placeholder} aria-hidden="true">
          <svg viewBox="0 0 120 120" className={styles.silhouette}>
            <circle cx="60" cy="46" r="22" />
            <path d="M20 112c4-24 20-36 40-36s36 12 40 36z" />
          </svg>
          {note && <span className={styles.placeholderNote}>{note} placeholder</span>}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- optional local demo asset; absent by default */}
      <img ref={img} src={src} alt={loaded ? alt : ''} className={styles.photo} data-loaded={loaded || undefined}
        onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />
    </div>
  )
}

/** Orientation, not a checklist: what today's conversation covers. */
function Topics({ topics }: { topics: TopicState[] }) {
  return (
    <section className={styles.topics} aria-labelledby="topics-title">
      <h2 id="topics-title" className={styles.label}>Today we’ll talk about</h2>
      <ul className={styles.topicList}>
        {topics.map((t) => (
          <li key={t.id} className={styles[t.status]} aria-current={t.status === 'current' ? 'true' : undefined}>
            {t.status === 'done' ? <Icon name="check" size={14} /> : <i className={styles.dot} aria-hidden="true" />}
            {t.label}
            {t.status !== 'upcoming' && <span className="visually-hidden">{t.status === 'done' ? ' (covered)' : ' (now)'}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The conversation as said: speaker and words, no bubbles. The newest line is in view. */
function Transcript({ lines, current }: { lines: ScriptLine[]; current: ScriptLine | null }) {
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => pinToEnd(list.current), [lines.length])
  return (
    <section className={styles.transcriptBlock} aria-labelledby="transcript-title">
      <h2 id="transcript-title" className={styles.label}>Conversation</h2>
      <ol ref={list} className={styles.transcript} tabIndex={0} aria-label="Transcript">
        {lines.map((l) => (
          <li key={l.id} className={[styles.line, l.speaker === 'retailer' && styles.you, l === current && styles.now].filter(Boolean).join(' ')}>
            <p className={styles.who}>{l.speaker === 'advisor' ? 'Advisor' : 'You'}</p>
            <p className={styles.words}>{l.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Keeps a scrolling list showing its newest entries, also when its space
 * changes (the check-in appearing makes the column taller).
 */
function pinToEnd(el: HTMLElement | null) {
  if (!el) return
  el.scrollTop = el.scrollHeight
  const observer = new ResizeObserver(() => { el.scrollTop = el.scrollHeight })
  observer.observe(el)
  return () => observer.disconnect()
}

/**
 * What the conversation has surfaced, worded as facts and labeled for what
 * they would become. A durable rule is only ever a suggestion for the
 * retailer's business instructions; nothing here writes to them.
 */
function Learning({ learned, fresh }: { learned: Learned[]; fresh: Learned[] }) {
  const isFresh = new Set(fresh.map((f) => f.id))
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => pinToEnd(list.current), [learned.length])
  return (
    <section className={styles.learning} aria-labelledby="learning-title">
      <h2 id="learning-title" className={styles.label}>What we’re learning</h2>
      {learned.length === 0
        ? <p className={styles.empty}>As we talk, what I learn about your business shows up here.</p>
        : (
          <ul ref={list} className={styles.learnedList} tabIndex={0} aria-label="Learned so far">
            {learned.map((k) => (
              <li key={k.id} className={isFresh.has(k.id) ? styles.fresh : undefined}>
                <span>{k.text}</span>
                {kindNote(k) && <span className={styles.kind}>{kindNote(k)}</span>}
              </li>
            ))}
          </ul>
        )}
      <p className={styles.review}>Nothing here changes your business instructions until you review it.</p>
    </section>
  )
}

function kindNote(k: Learned): string | null {
  switch (k.kind) {
    case 'instruction': return 'Suggested for your business instructions'
    case 'seasonal': return `Every year${k.when ? ` · ${k.when}` : ''}`
    case 'temporary': return `Coming up${k.when ? ` · ${k.when}` : ''}`
    case 'context': return null
  }
}

const DAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays']
const TIMES = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']

/** The last part of the call: keep this current with a short weekly check-in. */
function CheckIn({ offer, example }: { offer: CheckInOffer; example?: boolean }) {
  const [mode, setMode] = useState<'offer' | 'choose' | 'scheduled'>('offer')
  const [day, setDay] = useState(offer.day)
  const [time, setTime] = useState(offer.time)

  if (mode === 'scheduled') {
    return (
      <section className={styles.checkIn} aria-labelledby="checkin-title">
        <span className={styles.checkInIcon}><Icon name="check" size={18} /></span>
        <div className={styles.checkInBody}>
          <h2 id="checkin-title" className={styles.checkInTitle}>Weekly check-in · {day} at {time}</h2>
          <p>It happens right here, in the same conversation. In between, you can open it any time from the app to tell me something, answer a question, or ask about your business.</p>
          <div className={styles.actions}>
            <ButtonLink href="/today" variant="primary">Continue to Dashboard</ButtonLink>
          </div>
          {example && <p className={styles.exampleNote}>Example only. Nothing was scheduled.</p>}
        </div>
      </section>
    )
  }

  return (
    <section className={styles.checkIn} aria-labelledby="checkin-title">
      <span className={styles.checkInIcon}><Icon name="calendar" size={18} /></span>
      <div className={styles.checkInBody}>
        <h2 id="checkin-title" className={styles.checkInTitle}>Let’s keep this current</h2>
        <p>A short weekly conversation helps me understand what’s changing before it shows up in your sales data.</p>
        {mode === 'offer' ? (
          <>
            <p className={styles.recommend}>
              <span className={styles.recommendLabel}>Recommended</span>
              <b>{offer.day} at {offer.time}</b>
              <span className={styles.recommendWhy}>{offer.reason}</span>
            </p>
            <div className={styles.actions}>
              <Button variant="primary" onClick={() => setMode('scheduled')}>Schedule weekly check-in</Button>
              <Button onClick={() => setMode('choose')}>Choose another time</Button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.choose}>
              <Field id="checkin-day" label="Day">
                <Select id="checkin-day" value={day} onChange={(e) => setDay(e.target.value)}>
                  {DAYS.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <Field id="checkin-time" label="Time">
                <Select id="checkin-time" value={time} onChange={(e) => setTime(e.target.value)}>
                  {TIMES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <div className={styles.actions}>
              <Button variant="primary" onClick={() => setMode('scheduled')}>Schedule weekly check-in</Button>
              <Button variant="quiet" onClick={() => setMode('offer')}>Back</Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
