import type { ProgramFitView } from '@/features/suppliers/programFit'

/**
 * A supplier program as the retailer sees it on the Programs pages. Built
 * from the retailer's own programs and the ones suppliers publish
 * (src/domain/programs), or from example data (src/demo/programs.ts).
 *
 * Program fit and the analysis are the retailer's own and only appear where
 * they exist; nothing computes them yet (docs/programs.md).
 */
export type ProgramSummary = {
  id: string
  name: string
  supplier: { name: string; href?: string }
  season?: string
  /** "October 15". */
  closes?: string
  /** "January–March". */
  delivery?: string
  summary?: string
  fit?: ProgramFitView
  /** "$8,420 estimated benefit", only with an analysis. */
  benefit?: string
  /** "$48,000 commitment", only with an analysis. */
  commitment?: string
  /** The retailer's own copy (uploaded), not one the supplier published. */
  own: boolean
  example: boolean
}

export type ProgramTerm = { label: string; detail: string }

/** The decision support for one program: what it means for this retailer. */
export type ProgramAnalysis = {
  /** "A strong fit, with three terms worth negotiating". */
  headline: string
  lead: string
  /** Estimated benefit, commitment, payment terms, cash impact. */
  figures: { label: string; value: string }[]
  favor: { title: string; text: string }[]
  risks: { title: string; text: string }[]
  /** Changes that would make the program stronger, to raise with the rep. */
  asks: { title: string; request: string; impact: string }[]
}

export type ProgramDetailView = ProgramSummary & {
  terms: ProgramTerm[]
  /** False while the terms are an unconfirmed draft (read from a document, not yet checked). */
  confirmed: boolean
  analysis?: ProgramAnalysis
  rep?: { name?: string; email?: string }
}
