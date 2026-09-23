import { describe, expect, it } from 'vitest'
import { locationSchema, locationTypeDefaults } from '@/domain/location/schema'
import { organizationProfileSchema } from '@/domain/organization/schema'
import { isValidTimeZone } from '@/domain/reference/timezones'
import { validate } from '@/domain/validation'

describe('organization profile', () => {
  it('trims the name and normalizes the website', () => {
    const r = validate(organizationProfileSchema, { name: '  Summit Cycles ', defaultCountry: 'US', legalName: '', website: 'summitcycles.com' })
    expect(r).toEqual({ ok: true, value: { name: 'Summit Cycles', defaultCountry: 'US', legalName: undefined, website: 'https://summitcycles.com' } })
  })

  it('explains what is missing in plain words', () => {
    const r = validate(organizationProfileSchema, { name: ' ', defaultCountry: 'MX', website: 'not a site' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.name).toBe('Enter your business name.')
      expect(r.errors.defaultCountry).toBe('Choose the country you operate in.')
      expect(r.errors.website).toBe('Enter a web address like yourshop.com.')
    }
  })
})

describe('location', () => {
  const base = { name: 'Main Street', locationType: 'store', country: 'US', timezone: 'America/Denver' }

  it('accepts a minimal store', () => {
    expect(validate(locationSchema, base).ok).toBe(true)
  })

  it('rejects an unknown time zone', () => {
    const r = validate(locationSchema, { ...base, timezone: 'Mars/Olympus' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.timezone).toBe('Choose a time zone.')
  })

  it('gives warehouses stock-and-receive defaults, not selling', () => {
    expect(locationTypeDefaults.warehouse).toEqual({ sells: false, stocks: true, receives: true })
  })

  it('recognizes IANA time zones like the database does', () => {
    expect(isValidTimeZone('America/Toronto')).toBe(true)
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone('Not/AZone')).toBe(false)
  })
})
