/**
 * The intelligence meeting: a conversation with the retailer's buying
 * advisor that has an agenda, a transcript and what was learned. Onboarding
 * is the first meeting; weekly check-ins are meant to reuse the same pieces
 * with an agenda prepared from the retailer's context (docs/architecture.md,
 * "Intelligence meetings"). Presentation shapes only.
 */

export type Speaker = 'advisor' | 'retailer'

/** One item on the meeting's agenda. `intro` is the one line shown when it's up next. */
export type AgendaItem = { id: string; label: string; intro?: string }

export type AgendaStatus = 'done' | 'current' | 'upcoming'
export type AgendaItemState = AgendaItem & { status: AgendaStatus }

export type TranscriptLine = { id: string; speaker: Speaker; text: string; time?: string }

/**
 * What a learned fact would become, kept apart on purpose:
 * - `instruction`: a durable rule. Only ever a suggestion for the retailer's
 *   business instructions, which the retailer writes.
 * - `context`: how the business works today; may change.
 * - `seasonal`: recurs at a time of year.
 * - `temporary`: a one-off coming up.
 */
export type LearnedKind = 'instruction' | 'context' | 'seasonal' | 'temporary'

export type Learned = { id: string; text: string; kind: LearnedKind; when?: string }
