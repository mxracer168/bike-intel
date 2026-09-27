import { describe, expect, it } from 'vitest'
import { canManageRules, ruleStatement } from '@/domain/rules/schema'

describe('business rule wording', () => {
  it('keeps the retailer’s words, tidying whitespace', () => {
    expect(ruleStatement.parse('  We do not   sell road bikes.\n')).toBe('We do not sell road bikes.')
  })

  it('rejects an empty rule', () => {
    expect(ruleStatement.safeParse('   ').success).toBe(false)
  })

  it('rejects a rule over 500 characters', () => {
    expect(ruleStatement.safeParse('x'.repeat(501)).success).toBe(false)
    expect(ruleStatement.safeParse('x'.repeat(500)).success).toBe(true)
  })
})

describe('who manages business rules', () => {
  it('is owners and admins only', () => {
    expect(canManageRules('owner')).toBe(true)
    expect(canManageRules('admin')).toBe(true)
    expect(canManageRules('member')).toBe(false)
  })
})
