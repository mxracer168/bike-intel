import { supportedCountries } from '@/domain/reference/countries'

export const industryLabel: Record<string, string> = { bicycle: 'Specialty bicycle retail' }

export function countryName(code: string | null | undefined) {
  if (!code) return null
  return supportedCountries.find((c) => c.code === code)?.name ?? code
}

/** "Mountain time (America/Denver)" style label for a stored IANA zone. */
export function timeZoneLabel(tz: string) {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'long' })
      .formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value
    return name ? `${name} (${tz})` : tz
  } catch {
    return tz
  }
}
