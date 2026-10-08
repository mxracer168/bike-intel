import type { AgendaItem, AgendaItemState, Learned, Speaker, TranscriptLine } from '@/features/meeting/types'

/**
 * The onboarding conversation as a script of lines, for the prototype. There
 * is no conversational engine: a presenter steps through the lines. What the
 * screen shows at any point (transcript, agenda, what we're learning) is
 * derived from how many lines have been said, so every state is reproducible.
 */

export type ScriptLine = {
  id: string
  speaker: Speaker
  text: string
  /** The agenda item being talked about when this is said. */
  topic: string
  /** Agenda items this line finishes. */
  completes?: string[]
  /** Facts this line gives us. Most lines give none: not everything said is intelligence. */
  learned?: Learned[]
}

export type CheckInOffer = { day: string; time: string; reason: string }

export type OnboardingScript = {
  retailer: string
  agenda: AgendaItem[]
  lines: ScriptLine[]
  /** Lines already said when the prototype opens mid-conversation. */
  startAt: number
  /** Lines said when the wrap-up begins. */
  wrapAt: number
  /** Clock time of the first line, in minutes after midnight; lines follow about a minute apart. */
  startsAt: number
  checkIn: CheckInOffer
}

export type CallState = {
  said: (ScriptLine & TranscriptLine)[]
  /** The line being said now, if any. */
  current: ScriptLine | null
  learned: Learned[]
  agenda: AgendaItemState[]
  /** The first agenda item not yet reached; null once everything is covered. */
  upNext: AgendaItemState | null
  wrapping: boolean
  /** The whole conversation has been had: time to offer the check-in. */
  finished: boolean
}

export function clampSaid(script: OnboardingScript, n: number): number {
  return Math.max(1, Math.min(script.lines.length, Math.round(n)))
}

/** "10:14 AM": when a line was said in the example. */
export function lineTime(script: OnboardingScript, index: number): string {
  const minutes = script.startsAt + Math.round(index * 0.85)
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function callState(script: OnboardingScript, n: number): CallState {
  const count = clampSaid(script, n)
  const said = script.lines.slice(0, count).map((l, i) => ({ ...l, time: lineTime(script, i) }))
  const current = said[said.length - 1] ?? null
  const done = new Set(said.flatMap((l) => l.completes ?? []))
  const wrapping = count > script.wrapAt
  const agenda: AgendaItemState[] = script.agenda.map((t) => ({
    ...t,
    status: done.has(t.id) ? 'done' : !wrapping && current?.topic === t.id ? 'current' : 'upcoming',
  }))
  return {
    said,
    current,
    learned: said.flatMap((l) => l.learned ?? []),
    agenda,
    upNext: agenda.find((t) => t.status === 'upcoming') ?? null,
    wrapping,
    finished: count === script.lines.length,
  }
}

/** "?at=wrap" opens at the wrap-up, "?at=start" at the first line, "?at=end" at the check-in; otherwise mid-conversation. */
export function openingLine(script: OnboardingScript, at: string | string[] | undefined): number {
  if (at === 'start') return 1
  if (at === 'wrap') return script.wrapAt + 1
  if (at === 'end') return script.lines.length
  return script.startAt
}
