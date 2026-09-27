import { z } from 'zod'

/** A business rule in the retailer's own words. */
export const ruleStatement = z
  .string()
  .transform((s) => s.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(1, 'Write the rule first.').max(500, 'Keep the rule under 500 characters.'))

/** Only owners and admins decide the business's rules. */
export const canManageRules = (role: 'owner' | 'admin' | 'member') => role === 'owner' || role === 'admin'
