import { z } from 'zod'
import { countryCodes } from '@/domain/reference/countries'
import { isValidTimeZone } from '@/domain/reference/timezones'

export const locationTypes = ['store', 'warehouse', 'office', 'ship_to'] as const
export type LocationType = (typeof locationTypes)[number]

export const locationTypeLabels: Record<LocationType, string> = {
  store: 'Store',
  warehouse: 'Warehouse',
  office: 'Office',
  ship_to: 'Other shipping address',
}

/** What each kind of location usually does. Stored per location so it can differ later. */
export const locationTypeDefaults: Record<LocationType, { sells: boolean; stocks: boolean; receives: boolean }> = {
  store: { sells: true, stocks: true, receives: true },
  warehouse: { sells: false, stocks: true, receives: true },
  office: { sells: false, stocks: false, receives: false },
  ship_to: { sells: false, stocks: false, receives: true },
}

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`)
const optional = (max: number) => text(max).optional().transform((v) => (v ? v : undefined))

export const locationSchema = z.object({
  name: text(120).min(1, 'Give this location a name, like “Main Street”.'),
  locationType: z.enum(locationTypes, { error: 'Choose what kind of location this is.' }),
  addressLine1: optional(200),
  addressLine2: optional(200),
  city: optional(120),
  region: optional(120),
  postalCode: optional(20),
  country: z.enum(countryCodes, { error: 'Choose a country.' }),
  timezone: z.string().trim().refine(isValidTimeZone, 'Choose a time zone.'),
})

export type LocationInput = z.infer<typeof locationSchema>
