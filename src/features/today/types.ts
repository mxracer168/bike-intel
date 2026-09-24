/** One figure in Today's health snapshot. Presentation shape only. */
export type HealthMetric = { label: string; value: string; note?: string }

/** Keep the snapshot small: it supports the priorities, it doesn't compete with them. */
export const MAX_METRICS = 5
