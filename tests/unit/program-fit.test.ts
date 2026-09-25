import { describe, expect, it } from 'vitest'
import { formatFit } from '@/features/suppliers/programFit'

describe('program fit', () => {
  it('always shows one decimal', () => {
    expect(formatFit(4)).toBe('4.0')
    expect(formatFit(4.6)).toBe('4.6')
  })
})
