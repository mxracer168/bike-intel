/**
 * The onboarding conversation as a script of lines, for the prototype. There
 * is no conversational engine: a presenter steps through the lines. What the
 * screen shows at any point (transcript, what we're learning, topics) is
 * derived from how many lines have been said, so every state is reproducible.
 */

export type Speaker = 'advisor' | 'retailer'

/**
 * What a learned fact would become, kept apart on purpose
 * (docs/architecture.md, "Onboarding conversation"):
 * - `instruction`: a durable rule. Only ever a suggestion for the retailer's
 *   business instructions, which the retailer writes.
 * - `context`: how the business works today; may change.
 * - `seasonal`: recurs at a time of year.
 * - `temporary`: a one-off coming up.
 */
export type LearnedKind = 'instruction' | 'context' | 'seasonal' | 'temporary'

export type Learned = { id: string; text: string; kind: LearnedKind; when?: string }

export type Topic = { id: string; label: string }

export type ScriptLine = {
  id: string
  speaker: Speaker
  text: string
  /** The topic being talked about when this is said. */
  topic: string
  /** Topics this line finishes. */
  completes?: string[]
  /** Facts this line gives us. Most lines give none: not everything said is intelligence. */
  learned?: Learned[]
}

export type CheckInOffer = { day: string; time: string; reason: string }

export type OnboardingScript = {
  retailer: string
  topics: Topic[]
  lines: ScriptLine[]
  /** Lines already said when the prototype opens mid-conversation. */
  startAt: number
  /** Lines said when the wrap-up begins. */
  wrapAt: number
  checkIn: CheckInOffer
}

export type TopicState = Topic & { status: 'done' | 'current' | 'upcoming' }

export type CallState = {
  said: ScriptLine[]
  /** The line being said now, if any. */
  current: ScriptLine | null
  learned: Learned[]
  topics: TopicState[]
  wrapping: boolean
  /** The whole conversation has been had: time to offer the check-in. */
  finished: boolean
}

export function clampSaid(script: OnboardingScript, n: number): number {
  return Math.max(1, Math.min(script.lines.length, Math.round(n)))
}

export function callState(script: OnboardingScript, n: number): CallState {
  const count = clampSaid(script, n)
  const said = script.lines.slice(0, count)
  const current = said[said.length - 1] ?? null
  const done = new Set(said.flatMap((l) => l.completes ?? []))
  const wrapping = count > script.wrapAt
  return {
    said,
    current,
    learned: said.flatMap((l) => l.learned ?? []),
    topics: script.topics.map((t) => ({
      ...t,
      status: done.has(t.id) ? 'done' : !wrapping && current?.topic === t.id ? 'current' : 'upcoming',
    })),
    wrapping,
    finished: count === script.lines.length,
  }
}

/** "?at=wrap" opens at the wrap-up, "?at=start" at the first line; otherwise mid-conversation. */
export function openingLine(script: OnboardingScript, at: string | string[] | undefined): number {
  if (at === 'start') return 1
  if (at === 'wrap') return script.wrapAt + 1
  if (at === 'end') return script.lines.length
  return script.startAt
}
