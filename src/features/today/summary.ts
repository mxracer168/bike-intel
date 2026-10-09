import type { HealthMetric } from './types'

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

/**
 * The sentence under Today's title, from real state only: how many
 * priorities there are and whether any health figure is moving the wrong way.
 * The reassurance is said only when there is health data and none of it is.
 */
export function todaySummary(priorities: number, health: HealthMetric[]): string {
  if (priorities === 0) return 'Nothing needs your attention right now.'
  const count = WORDS[priorities] ?? String(priorities)
  const lead = priorities === 1 ? `${count} thing deserves your attention.` : `${count} things deserve your attention.`
  const steady = health.length > 0 && health.every((m) => !m.trend || m.trend.good)
  return steady ? `${lead} The rest of the business is moving as expected.` : lead
}
