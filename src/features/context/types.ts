/** A question we'd like the retailer to answer. Presentation shape only. */
export type ContextQuestion = { id: string; prompt: string; choices: string[] }

/** Never show more than this many questions at once. */
export const MAX_QUESTIONS = 3

/** The questions worth asking now: already ranked by the caller, capped, never padded. */
export function topQuestions(questions: ContextQuestion[]): ContextQuestion[] {
  return questions.slice(0, MAX_QUESTIONS)
}

/** Reconciliation, kept quiet: one line when all is well, a pointer when not. */
export type SyncStatus =
  | { state: 'ok'; label: string }
  | { state: 'attention'; label: string; href?: string }
