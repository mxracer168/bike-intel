/**
 * System priority and user order are kept apart on purpose.
 *
 *  - System priority: the order items arrive in (what we believe matters most).
 *    It is never overwritten.
 *  - User order: a list of item ids the retailer arranged for their own
 *    workflow, layered on top. Items it doesn't mention (new today) keep their
 *    system position; ids no longer present are ignored.
 *
 * Keeping both lets us later learn from the difference (see docs/intelligence.md).
 */
export function applyUserOrder<T extends { id: string }>(system: T[], userOrder: readonly string[] | null): T[] {
  if (!userOrder?.length) return system
  const byId = new Map(system.map((item) => [item.id, item]))
  const ordered = userOrder.map((id) => byId.get(id)).filter((item): item is T => Boolean(item))
  const placed = new Set(ordered.map((item) => item.id))
  system.forEach((item, systemIndex) => {
    if (!placed.has(item.id)) ordered.splice(Math.min(systemIndex, ordered.length), 0, item)
  })
  return ordered
}

/** Move one id to a new index (clamped). Returns a new array. */
export function moveTo(ids: readonly string[], id: string, index: number): string[] {
  const from = ids.indexOf(id)
  if (from < 0) return [...ids]
  const next = ids.filter((x) => x !== id)
  next.splice(Math.max(0, Math.min(index, next.length)), 0, id)
  return next
}

/** True when the retailer's order differs from the system's. */
export function isCustomOrder(system: readonly { id: string }[], current: readonly { id: string }[]): boolean {
  return system.some((item, i) => current[i]?.id !== item.id)
}
