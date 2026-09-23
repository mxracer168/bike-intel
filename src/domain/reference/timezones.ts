import type { CountryCode } from './countries'

/** Any IANA time zone the runtime recognises is valid (matches the database check). */
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Common zones offered first, in plain words. Other valid zones are still accepted. */
export const commonTimeZones: Record<CountryCode, { id: string; label: string }[]> = {
  US: [
    { id: 'America/New_York', label: 'Eastern' },
    { id: 'America/Chicago', label: 'Central' },
    { id: 'America/Denver', label: 'Mountain' },
    { id: 'America/Phoenix', label: 'Mountain (Arizona)' },
    { id: 'America/Los_Angeles', label: 'Pacific' },
    { id: 'America/Anchorage', label: 'Alaska' },
    { id: 'Pacific/Honolulu', label: 'Hawaii' },
  ],
  CA: [
    { id: 'America/St_Johns', label: 'Newfoundland' },
    { id: 'America/Halifax', label: 'Atlantic' },
    { id: 'America/Toronto', label: 'Eastern' },
    { id: 'America/Winnipeg', label: 'Central' },
    { id: 'America/Regina', label: 'Saskatchewan' },
    { id: 'America/Edmonton', label: 'Mountain' },
    { id: 'America/Vancouver', label: 'Pacific' },
  ],
}
