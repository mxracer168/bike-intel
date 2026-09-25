/** A change since the comparison period. `good` decides the color, not the direction. */
export type HealthTrend = { direction: 'up' | 'down'; text: string; good: boolean }

/** One card in Today's business health row. Presentation shape only. */
export type HealthMetric = { label: string; value: string; note?: string; trend?: HealthTrend }

/** Keep the row small: it supports the priorities, it doesn't compete with them. */
export const MAX_METRICS = 5
