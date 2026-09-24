export type { ConversationEntry, IntelligenceQuestionView } from '@/domain/intelligence/conversation'
import type { IntelligenceQuestionView } from '@/domain/intelligence/conversation'

/** Never ask more than this many questions at once. */
export const MAX_QUESTIONS = 3

/** The questions worth asking now: already ranked by the caller, capped, never padded. */
export function topQuestions<Q extends Pick<IntelligenceQuestionView, 'status'>>(questions: Q[]): Q[] {
  return questions.filter((q) => q.status === 'open' || q.status === 'deferred').slice(0, MAX_QUESTIONS)
}

/** Offered after the question's own choices when nuance could matter. */
export const TELL_US_MORE = 'Tell us more'

/** Reconciliation, kept quiet: one line when all is well, a pointer when not. */
export type SyncStatus =
  | { state: 'ok'; label: string }
  | { state: 'attention'; label: string; href?: string }

/** A short name for a question: its topic, or its first few words. */
export function questionTopic(q: Pick<IntelligenceQuestionView, 'prompt' | 'topic'>): string {
  if (q.topic) return q.topic
  const words = q.prompt.replace(/\?$/, '').split(/\s+/)
  return words.length <= 5 ? words.join(' ') : `${words.slice(0, 5).join(' ')}…`
}
