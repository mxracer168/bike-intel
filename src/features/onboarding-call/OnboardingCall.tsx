'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ContextEquation } from '@/features/meeting/ContextEquation'
import { MeetingAgenda, UpNext } from '@/features/meeting/MeetingAgenda'
import { MeetingLearned } from '@/features/meeting/MeetingLearned'
import { MeetingStage } from '@/features/meeting/MeetingStage'
import { MeetingTranscript } from '@/features/meeting/MeetingTranscript'
import meeting from '@/features/meeting/Meeting.module.css'
import { Button } from '@/ui/Button'
import { Icon } from '@/ui/Icon'
import { Field, Select } from '@/ui/Field'
import { callState, clampSaid, type CheckInOffer, type OnboardingScript } from './script'
import styles from './OnboardingCall.module.css'

/**
 * The first intelligence meeting: getting to know the retailer. On top, why
 * this conversation matters (the equation). Left, the call and the
 * conversation under it. Right, the agenda (and, at the end, scheduling the
 * weekly check-in as what's up next), then what we're learning. Built from
 * the reusable meeting pieces in features/meeting.
 *
 * Prototype: a presenter steps through a scripted conversation (→ and ←, or
 * the quiet controls underneath). No camera, microphone, speech or AI.
 */
export function OnboardingCall({ script, initial, example }: { script: OnboardingScript; initial: number; example?: boolean }) {
  const [said, setSaid] = useState(() => clampSaid(script, initial))
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
      <h1 className="visually-hidden">Getting to know {script.retailer}</h1>
      <div className={meeting.why}><ContextEquation /></div>

      <div className={meeting.layout}>
        <div className={meeting.main}>
          <MeetingStage current={state.current} live={!state.finished}
            status={state.finished ? 'Our first conversation is complete' : 'Listening and learning about your business'}
            advisor={{ name: 'Your buying advisor', image: '/demo/advisor.jpg' }}
            self={{ name: 'You', image: '/demo/you.jpg' }} />
          <MeetingTranscript lines={state.said} current={state.current} live={!state.finished} />
        </div>

        <aside className={meeting.side} aria-label="Meeting">
          <MeetingAgenda agenda={state.agenda}
            title={`Getting to know ${script.retailer}`}
            lead="We don’t just analyze your sales data. We learn how your business works."
            doneTitle="Our first conversation"
            doneLead="I’ll use what I learned to make recommendations that fit your business."
            next={state.finished ? <CheckIn offer={script.checkIn} example={example} /> : undefined} />
          <MeetingLearned learned={state.learned} fresh={state.current?.learned ?? []} ended={state.finished} />
        </aside>
      </div>

      <footer className={styles.foot}>
        {example ? (
          <nav className={styles.presenter} aria-label="Example conversation">
            <span>Example conversation · use ← → to step through</span>
            <button type="button" onClick={() => step(-1)} disabled={said <= 1}>Back</button>
            <button type="button" onClick={() => step(1)} disabled={state.finished}>Next</button>
            {!state.wrapping && <button type="button" onClick={() => setSaid(script.wrapAt + 1)}>Go to wrap-up</button>}
            {!state.finished && <button type="button" onClick={() => setSaid(script.lines.length)}>Go to the end</button>}
          </nav>
        ) : <span />}
        <Link href="/today" className={styles.continue}>Continue to Today<Icon name="chevron-right" size={16} /></Link>
      </footer>
    </div>
  )
}

const DAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays']
const TIMES = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']

/** The last item on the agenda: keep this current with a short weekly check-in. */
function CheckIn({ offer, example }: { offer: CheckInOffer; example?: boolean }) {
  const [mode, setMode] = useState<'offer' | 'choose' | 'scheduled'>('offer')
  const [day, setDay] = useState(offer.day)
  const [time, setTime] = useState(offer.time)

  if (mode === 'scheduled') {
    return (
      <UpNext eyebrow="Up next" title="Let’s keep this current">
        <div className={styles.scheduled} role="status">
          <Icon name="check" size={18} />
          <div>
            <p className={styles.scheduledTitle}>Weekly check-in scheduled</p>
            <p>{day} at {time} · It happens right here, in the same conversation. In between, open it any time to tell me something, answer a question, or ask about your business.</p>
          </div>
        </div>
        {example && <p className={styles.exampleNote}>Example only. Nothing was scheduled.</p>}
      </UpNext>
    )
  }

  return (
    <UpNext eyebrow="Up next" title="Let’s keep this current">
      <p>A short weekly conversation helps me understand what’s changing before it shows up in your sales data.</p>
      {mode === 'offer' ? (
        <>
          <div className={styles.recommend}>
            <span className={styles.recommendLabel}>Recommended</span>
            <span className={styles.slot}>{offer.day} at {offer.time}</span>
            <span className={styles.recommendWhy}>{offer.reason}</span>
          </div>
          <div className={styles.actions}>
            <Button variant="primary" onClick={() => setMode('scheduled')}>Schedule weekly check-in</Button>
            <button type="button" className={styles.textButton} onClick={() => setMode('choose')}>Choose another time</button>
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
            <button type="button" className={styles.textButton} onClick={() => setMode('offer')}>Back</button>
          </div>
        </>
      )}
    </UpNext>
  )
}
