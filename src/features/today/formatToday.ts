/** "Wednesday, September 23" in the store's own timezone. */
export function formatToday(timeZone: string | undefined, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone }).format(now)
  } catch {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(now)
  }
}
