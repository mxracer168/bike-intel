import type { ProgramFitView } from '@/features/suppliers/programFit'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-10-15" as year, month name and day. */
function parts(iso: string): { year: number; month: string; day: number } {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number)
  return { year: y, month: MONTHS[m - 1] ?? '', day: d }
}

/** A database date ("2026-10-15") as "October 15". */
export function formatDay(iso: string): string {
  const { month, day } = parts(iso)
  return `${month} ${day}`
}

/** A delivery window as months: "January–March", "December 2026–February 2027", or one month. */
export function formatWindow(start: string | null, end: string | null): string | undefined {
  const from = start ?? end
  const to = end ?? start
  if (!from || !to) return undefined
  const a = parts(from)
  const b = parts(to)
  if (a.year !== b.year) return `${a.month} ${a.year}–${b.month} ${b.year}`
  return a.month === b.month ? a.month : `${a.month}–${b.month}`
}

type Version = { version_number: number; status: string }

/** The terms to show: the newest confirmed version, else the newest draft. Never a superseded one. */
export function pickVersion<V extends Version>(versions: V[]): V | undefined {
  const newest = (list: V[]) => list.reduce<V | undefined>((a, v) => (!a || v.version_number > a.version_number ? v : a), undefined)
  return newest(versions.filter((v) => v.status === 'confirmed')) ?? newest(versions.filter((v) => v.status === 'draft'))
}

/** Best fit first; programs without a fit after, by name. */
export function byFit<P extends { name: string; fit?: ProgramFitView }>(a: P, b: P): number {
  const fa = a.fit?.score ?? -1
  const fb = b.fit?.score ?? -1
  return fb - fa || a.name.localeCompare(b.name)
}

/**
 * The retailer's feedback for the supplier's rep, as a plain message they
 * copy or send from their own email. Nothing is stored or sent for them.
 */
export function feedbackMessage({ programName, retailerName, repName, asks, note }: {
  programName: string
  retailerName: string
  repName?: string
  asks: { title: string; request: string; impact: string }[]
  note: string
}): { subject: string; body: string } {
  const first = repName?.split(' ')[0]
  const lines = [
    `Hi ${first ?? 'there'},`,
    '',
    `We’ve looked at the ${programName} against our sales, inventory and cash. ${asks.length === 1 ? 'One change' : `${asks.length} changes`} would make it a stronger fit for ${retailerName}:`,
    '',
    ...asks.map((a, i) => `${i + 1}. ${a.title}: ${a.request}`),
  ]
  const extra = note.trim()
  if (extra) lines.push('', extra)
  lines.push('', 'Could we talk these through before the program closes?', '', 'Thanks,', retailerName)
  return { subject: `${programName}: feedback from ${retailerName}`, body: lines.join('\n') }
}

/** A mailto: link with the message as its body. The address is optional; the retailer can add it. */
export function mailtoHref(email: string | undefined, { subject, body }: { subject: string; body: string }): string {
  const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return `mailto:${email ? encodeURIComponent(email).replace('%40', '@') : ''}?${q}`
}
