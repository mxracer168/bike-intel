import { z } from 'zod'
import { countryCodes } from '@/domain/reference/countries'

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().transform((v) => (v ? v : undefined))

/** Accepts "shop.com" or "https://shop.com"; stores a full https URL. */
const website = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : undefined))
  .refine((v) => {
    if (!v) return true
    try {
      const url = new URL(v)
      return url.hostname.includes('.')
    } catch {
      return false
    }
  }, 'Enter a web address like yourshop.com.')

export const organizationProfileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your business name.').max(120, 'Keep the business name under 120 characters.'),
  defaultCountry: z.enum(countryCodes, { error: 'Choose the country you operate in.' }),
  legalName: optionalText(200, 'Keep the legal name under 200 characters.'),
  website,
})

export type OrganizationProfile = z.infer<typeof organizationProfileSchema>
