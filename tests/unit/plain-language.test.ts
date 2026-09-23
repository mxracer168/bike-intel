import { describe, expect, it } from 'vitest'
import { average, describeCover, describeWeeklyRate, formatMoney, plural } from '@/domain/language/plain'

describe('plain language', () => {
  it('rounds rates the way people talk', () => {
    expect(describeWeeklyRate(average([1, 2, 1, 3, 2, 2, 3, 2, 3, 2, 2, 3]))).toBe('about 2 a week')
    expect(describeWeeklyRate(0.4)).toBe('less than 1 a week')
    expect(describeWeeklyRate(0)).toBe('no recent sales')
  })

  it('describes how long stock lasts in time, not ratios', () => {
    expect(describeCover(2, 2.17)).toBe('about a week')
    expect(describeCover(1, 2)).toBe('less than a week')
    expect(describeCover(6, 2)).toBe('about 3 weeks')
    expect(describeCover(3, 0.17)).toBe('about 4 months')
    expect(describeCover(0, 2)).toBe('none left')
    expect(describeCover(4, 0)).toBe('no recent sales to go by')
  })

  it('formats money plainly', () => {
    expect(formatMoney(56.4)).toBe('$56.40')
    expect(formatMoney(1284)).toBe('$1,284')
  })

  it('pluralizes counts', () => {
    expect(plural(1, 'location')).toBe('1 location')
    expect(plural(3, 'location')).toBe('3 locations')
  })
})
