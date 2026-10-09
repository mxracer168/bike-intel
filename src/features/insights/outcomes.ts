import type { DecisionOutcome } from './types'

/** Which plan landed closer to demand, from the three numbers alone. */
export function closer(d: Pick<DecisionOutcome, 'recommended' | 'approved' | 'demand'>) {
  const rec = Math.abs(d.recommended - d.demand)
  const you = Math.abs(d.approved - d.demand)
  const verdict = rec === you ? 'Both were equally close' : you < rec ? 'Your decision was closer' : 'The recommendation was closer'
  const units = you === 0 ? 'exactly on demand' : `${you} ${you === 1 ? 'unit' : 'units'} from demand`
  return { verdict, approved: `What you approved was ${units}` }
}
