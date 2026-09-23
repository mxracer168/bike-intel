/** Countries supported at launch. Add markets here, not in UI code. */
export const supportedCountries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
] as const

export type CountryCode = (typeof supportedCountries)[number]['code']

export const countryCodes = supportedCountries.map((c) => c.code) as [CountryCode, ...CountryCode[]]
