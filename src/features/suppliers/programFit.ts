/**
 * Program fit: how well one supplier program fits one retailer. Always
 * retailer-specific; never a public rating of the program. Kept apart from the
 * supplier's own presentation (which the supplier writes) on purpose.
 *
 * Only example values exist today. See docs/programs.md.
 */
export type ProgramFitView = {
  /** 1.0–5.0, one decimal. */
  score: number
  /** The main reasons, in plain words. Never the weights or the formula. */
  factors: { title: string; detail: string }[]
  /** Optional one-sentence weighing of the factors, when they pull in different directions. */
  summary?: string
}

/** Keyed by program name within one supplier. */
export type ProgramFitMap = Record<string, ProgramFitView>

export function formatFit(score: number): string {
  return score.toFixed(1)
}

